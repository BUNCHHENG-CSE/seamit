import csv
import io
from datetime import datetime, timezone
from typing import Any
from app.database import get_db

def normalize_col_name(name: str) -> str:
    return name.strip().lower().replace(" ", "_").replace("-", "_")

COLUMN_MAPPING = {
    "asset_tag": ["asset_tag", "assettag", "tag", "asset_id", "asset_number"],
    "serial_number": ["serial_number", "serial", "serial_num", "serialno", "sn", "service_tag"],
    "model": ["model", "device_model", "device", "hardware_model", "product"],
    "category": ["category", "device_type", "type"],
    "assigned_to_email": ["assigned_to_email", "email", "user_email", "owner_email", "assigned_email"],
    "assigned_to_name": ["assigned_to_name", "assigned_to", "user", "owner", "employee", "employee_name"],
    "department": ["department", "dept", "team"],
    "location": ["location", "office", "site"],
    "status": ["status", "asset_status", "state"],
    "purchase_date": ["purchase_date", "purchased", "acquired_date"],
    "warranty_expiry_date": ["warranty_expiry_date", "warranty_expiry", "warranty", "warranty_end"],
    "eol_date": ["eol_date", "eol", "end_of_life"],
    "notes": ["notes", "comments", "description"]
}

def import_assets_from_csv(csv_content: str) -> dict[str, Any]:
    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f)
    
    if not reader.fieldnames:
        return {"total_rows": 0, "created": 0, "updated": 0, "failed": 0, "errors": ["Empty or invalid CSV file"]}

    # Build field mapping
    col_map: dict[str, str] = {}
    for raw_col in reader.fieldnames:
        norm = normalize_col_name(raw_col)
        for target_field, aliases in COLUMN_MAPPING.items():
            if norm in aliases:
                col_map[raw_col] = target_field
                break

    created = 0
    updated = 0
    failed = 0
    errors = []
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        for row_idx, row in enumerate(reader, start=2):
            try:
                mapped: dict[str, Any] = {}
                for raw_col, val in row.items():
                    if raw_col in col_map and val is not None:
                        mapped[col_map[raw_col]] = val.strip()

                tag = mapped.get("asset_tag")
                serial = mapped.get("serial_number")

                if not tag and not serial:
                    failed += 1
                    errors.append(f"Row {row_idx}: Missing both asset_tag and serial_number")
                    continue

                if not tag and serial:
                    tag = f"AST-{serial[:8]}"
                if not serial and tag:
                    serial = f"SN-{tag}"

                model = mapped.get("model") or "General IT Asset"
                category = mapped.get("category") or "Laptop"
                status = mapped.get("status") or "in_use"
                # Normalize status
                valid_statuses = {"in_use", "available", "in_repair", "pending_return", "retired", "lost_stolen", "pending_disposal"}
                status_lower = status.lower().replace(" ", "_").replace("-", "_")
                if status_lower not in valid_statuses:
                    status_lower = "in_use"

                # Check if asset exists
                cursor.execute("SELECT id FROM assets WHERE asset_tag = ? OR serial_number = ?", (tag, serial))
                existing = cursor.fetchone()

                if existing:
                    cursor.execute("""
                        UPDATE assets SET
                            serial_number = COALESCE(?, serial_number),
                            model = COALESCE(?, model),
                            category = COALESCE(?, category),
                            assigned_to_email = COALESCE(?, assigned_to_email),
                            assigned_to_name = COALESCE(?, assigned_to_name),
                            department = COALESCE(?, department),
                            location = COALESCE(?, location),
                            status = COALESCE(?, status),
                            purchase_date = COALESCE(?, purchase_date),
                            warranty_expiry_date = COALESCE(?, warranty_expiry_date),
                            eol_date = COALESCE(?, eol_date),
                            notes = COALESCE(?, notes),
                            updated_at = ?
                        WHERE id = ?
                    """, (
                        serial, model, category, mapped.get("assigned_to_email"),
                        mapped.get("assigned_to_name"), mapped.get("department"),
                        mapped.get("location"), status_lower, mapped.get("purchase_date"),
                        mapped.get("warranty_expiry_date"), mapped.get("eol_date"),
                        mapped.get("notes"), now_iso, existing["id"]
                    ))
                    updated += 1
                else:
                    cursor.execute("""
                        INSERT INTO assets (
                            asset_tag, serial_number, model, category,
                            assigned_to_email, assigned_to_name, department, location,
                            status, purchase_date, warranty_expiry_date, eol_date,
                            notes, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        tag, serial, model, category,
                        mapped.get("assigned_to_email"), mapped.get("assigned_to_name"),
                        mapped.get("department"), mapped.get("location"),
                        status_lower, mapped.get("purchase_date"),
                        mapped.get("warranty_expiry_date"), mapped.get("eol_date"),
                        mapped.get("notes"), now_iso, now_iso
                    ))
                    created += 1
            except Exception as e:
                failed += 1
                errors.append(f"Row {row_idx}: {str(e)}")

    return {
        "total_rows": created + updated + failed,
        "created": created,
        "updated": updated,
        "failed": failed,
        "errors": errors[:10]  # Return first 10 errors
    }

def export_assets_to_csv() -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Asset Tag", "Serial Number", "Model", "Category", "Status",
        "Assigned Name", "Assigned Email", "Department", "Location",
        "Purchase Date", "Warranty Expiry Date", "EOL Date", "Last Ticket ID", "Notes"
    ])

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets ORDER BY id ASC")
        rows = cursor.fetchall()
        for r in rows:
            writer.writerow([
                r["asset_tag"], r["serial_number"], r["model"], r["category"], r["status"],
                r["assigned_to_name"] or "", r["assigned_to_email"] or "",
                r["department"] or "", r["location"] or "",
                r["purchase_date"] or "", r["warranty_expiry_date"] or "",
                r["eol_date"] or "", r["last_ticket_id"] or "", r["notes"] or ""
            ])

    return output.getvalue()
