import json
import io
import csv
from typing import Optional
from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from app.database import get_db
from app.schemas.sync_log import SyncLogResponse, SyncStats

router = APIRouter(prefix="/api/logs", tags=["Audit Logs"])

@router.get("", response_model=list[SyncLogResponse])
def list_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    direction: Optional[str] = None,
    query: Optional[str] = None
):
    with get_db() as conn:
        cursor = conn.cursor()
        sql = "SELECT * FROM sync_logs WHERE 1=1"
        params = []

        if status and status.lower() != "all":
            sql += " AND status = ?"
            params.append(status.lower())

        if direction and direction.lower() != "all":
            sql += " AND direction = ?"
            params.append(direction.lower())

        if query:
            q_like = f"%{query}%"
            sql += """ AND (
                ticket_id LIKE ? OR
                asset_tag LIKE ? OR
                serial_number LIKE ? OR
                rule_name LIKE ? OR
                action_summary LIKE ?
            )"""
            params.extend([q_like] * 5)

        sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        result = []
        for r in rows:
            row_dict = dict(r)
            try:
                row_dict["diff_json"] = json.loads(row_dict["diff_json"] or "{}")
            except Exception:
                row_dict["diff_json"] = {}
            result.append(row_dict)
        return result

@router.get("/stats", response_model=SyncStats)
def get_sync_stats():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM sync_logs")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as succ FROM sync_logs WHERE status = 'success'")
        succ = cursor.fetchone()["succ"]

        cursor.execute("SELECT COUNT(*) as failed FROM sync_logs WHERE status = 'failed'")
        failed = cursor.fetchone()["failed"]

        cursor.execute("SELECT COUNT(*) as t2a FROM sync_logs WHERE direction = 'ticket_to_asset'")
        t2a = cursor.fetchone()["t2a"]

        cursor.execute("SELECT COUNT(*) as a2t FROM sync_logs WHERE direction = 'asset_to_ticket'")
        a2t = cursor.fetchone()["a2t"]

        cursor.execute("SELECT timestamp FROM sync_logs ORDER BY id DESC LIMIT 1")
        last_row = cursor.fetchone()
        last_ts = last_row["timestamp"] if last_row else None

        return SyncStats(
            total_syncs=total,
            successful_syncs=succ,
            failed_syncs=failed,
            ticket_to_asset_count=t2a,
            asset_to_ticket_count=a2t,
            last_sync_timestamp=last_ts
        )

@router.get("/export-compliance")
def export_compliance_report():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Sync ID", "Timestamp (UTC)", "Direction", "ITSM Source", "Ticket Key",
        "Ticket Summary", "Asset Tag", "Hardware Serial", "Rule Executed",
        "Action Taken", "Status", "Error / Exception"
    ])

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sync_logs ORDER BY id DESC")
        rows = cursor.fetchall()
        for r in rows:
            writer.writerow([
                r["id"], r["timestamp"], r["direction"], r["source"], r["ticket_id"] or "",
                r["ticket_title"] or "", r["asset_tag"] or "", r["serial_number"] or "",
                r["rule_name"] or "", r["action_summary"] or "", r["status"], r["error_message"] or ""
            ])

    return PlainTextResponse(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=seamit_soc2_compliance_audit_log.csv"}
    )
