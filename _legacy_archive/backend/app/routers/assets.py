import json
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import PlainTextResponse
from app.database import get_db
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, CSVImportResult
from app.connectors.csv_table_connector import import_assets_from_csv, export_assets_to_csv
from app.engine.scheduler import LifecycleScheduler

router = APIRouter(prefix="/api/assets", tags=["Assets"])

class BulkAssetUpdateRequest(BaseModel):
    asset_ids: list[int]
    status: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    action: Optional[str] = "update"  # "update" or "delete"

@router.get("", response_model=list[AssetResponse])
def list_assets(
    query: Optional[str] = Query(None, description="Search by tag, serial, model, user, or email"),
    status: Optional[str] = Query(None, description="Filter by status: in_use, available, in_repair, etc."),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    with get_db() as conn:
        cursor = conn.cursor()
        sql = "SELECT * FROM assets WHERE 1=1"
        params = []

        if status and status.lower() != "all":
            sql += " AND status = ?"
            params.append(status.lower())

        if query:
            q_like = f"%{query}%"
            sql += """ AND (
                asset_tag LIKE ? OR
                serial_number LIKE ? OR
                model LIKE ? OR
                assigned_to_name LIKE ? OR
                assigned_to_email LIKE ? OR
                location LIKE ?
            )"""
            params.extend([q_like] * 6)

        sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return dict(row)

@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(payload: AssetCreate):
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        # Check duplicate
        cursor.execute("SELECT id FROM assets WHERE asset_tag = ?", (payload.asset_tag,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Asset tag '{payload.asset_tag}' already exists")

        cursor.execute("""
            INSERT INTO assets (
                asset_tag, serial_number, model, category,
                assigned_to_email, assigned_to_name, department, location,
                status, purchase_date, warranty_expiry_date, eol_date,
                notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.asset_tag, payload.serial_number, payload.model, payload.category,
            payload.assigned_to_email, payload.assigned_to_name, payload.department, payload.location,
            payload.status, payload.purchase_date, payload.warranty_expiry_date, payload.eol_date,
            payload.notes, now_iso, now_iso
        ))
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM assets WHERE id = ?", (new_id,))
        return dict(cursor.fetchone())

@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, payload: AssetUpdate):
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Asset not found")

        updates = []
        params = []
        for field, value in payload.model_dump(exclude_unset=True).items():
            updates.append(f"{field} = ?")
            params.append(value)

        if not updates:
            return dict(existing)

        updates.append("updated_at = ?")
        params.append(now_iso)
        params.append(asset_id)

        cursor.execute(f"UPDATE assets SET {', '.join(updates)} WHERE id = ?", params)
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        return dict(cursor.fetchone())

@router.delete("/{asset_id}", status_code=200)
def delete_asset(asset_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM assets WHERE id = ?", (asset_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Asset not found")
        cursor.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
        return {"success": True, "message": f"Asset {asset_id} deleted"}

@router.post("/bulk-update")
def bulk_update_assets(payload: BulkAssetUpdateRequest):
    if not payload.asset_ids:
        raise HTTPException(status_code=400, detail="asset_ids list cannot be empty")

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()

        if payload.action == "delete":
            placeholders = ",".join(["?"] * len(payload.asset_ids))
            cursor.execute(f"DELETE FROM assets WHERE id IN ({placeholders})", payload.asset_ids)

            cursor.execute("""
                INSERT INTO sync_logs (
                    timestamp, direction, rule_name, source,
                    action_summary, status
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                now_iso, "bulk_action", "Batch Asset Deletion", "manual_ui",
                f"Batch deleted {len(payload.asset_ids)} asset records from inventory.",
                "success"
            ))

            return {
                "success": True,
                "action": "delete",
                "affected_count": len(payload.asset_ids),
                "message": f"Successfully deleted {len(payload.asset_ids)} assets."
            }

        # Update action
        updates = []
        params = []
        if payload.status:
            updates.append("status = ?")
            params.append(payload.status)
        if payload.location:
            updates.append("location = ?")
            params.append(payload.location)
        if payload.department:
            updates.append("department = ?")
            params.append(payload.department)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        updates.append("updated_at = ?")
        params.append(now_iso)

        affected_count = 0
        for a_id in payload.asset_ids:
            cursor.execute("SELECT * FROM assets WHERE id = ?", (a_id,))
            asset = cursor.fetchone()
            if asset:
                row_params = list(params) + [a_id]
                cursor.execute(f"UPDATE assets SET {', '.join(updates)} WHERE id = ?", row_params)

                diff = {}
                if payload.status:
                    diff["status"] = {"old": asset["status"], "new": payload.status}
                if payload.location:
                    diff["location"] = {"old": asset["location"], "new": payload.location}
                if payload.department:
                    diff["department"] = {"old": asset["department"], "new": payload.department}

                cursor.execute("""
                    INSERT INTO sync_logs (
                        timestamp, direction, rule_name, source,
                        asset_id, asset_tag, serial_number,
                        action_summary, diff_json, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    now_iso, "bulk_action", "Batch Asset Update", "manual_ui",
                    a_id, asset["asset_tag"], asset["serial_number"],
                    f"Batch updated {asset['asset_tag']}: {', '.join(diff.keys())}",
                    json.dumps(diff), "success"
                ))
                affected_count += 1

        return {
            "success": True,
            "action": "update",
            "affected_count": affected_count,
            "message": f"Successfully updated {affected_count} assets."
        }

@router.get("/{asset_id}/label-data")
def get_asset_label_data(asset_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        asset = cursor.fetchone()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        return {
            "asset_id": asset["id"],
            "asset_tag": asset["asset_tag"],
            "serial_number": asset["serial_number"],
            "model": asset["model"],
            "category": asset["category"],
            "department": asset["department"] or "General IT",
            "assigned_to": asset["assigned_to_name"] or "Available / In Stock",
            "qr_payload": f"seamit://asset/{asset['asset_tag']}?sn={asset['serial_number']}",
            "barcode_data": asset["asset_tag"],
            "printed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        }

@router.post("/import-csv", response_model=CSVImportResult)
async def upload_assets_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        csv_text = content.decode("latin-1")
    result = import_assets_from_csv(csv_text)
    return result

@router.get("/export-csv")
def download_assets_csv():
    csv_data = export_assets_to_csv()
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=seamit_assets_inventory.csv"}
    )

@router.post("/check-lifecycle")
async def trigger_lifecycle_sync():
    """Trigger on-demand check for warranties and EOL expiration (Asset -> Ticket sync)."""
    result = await LifecycleScheduler.run_lifecycle_sync()
    return result
