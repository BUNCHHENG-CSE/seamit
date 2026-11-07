from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.engine.notification_engine import NotificationEngine

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class TestAlertRequest(BaseModel):
    title: Optional[str] = "Test IT Operations Alert"
    message: Optional[str] = "Testing real-time notification dispatch from SeamIT ITSM-ITAM Seam Filler."
    severity: Optional[str] = "INFO"
    category: Optional[str] = "test"
    link_tab: Optional[str] = "radar"

@router.get("")
def list_notifications(limit: int = 30):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notifications ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) as unread FROM notifications WHERE is_read = 0")
        unread_count = cursor.fetchone()["unread"]

        return {
            "notifications": [dict(r) for r in rows],
            "unread_count": unread_count
        }

@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
        return {"success": True, "notification_id": notification_id}

@router.post("/read-all")
def mark_all_read():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE is_read = 0")
        return {"success": True, "message": "All notifications marked as read."}

@router.post("/test-alert")
async def trigger_test_alert(payload: TestAlertRequest):
    result = await NotificationEngine.notify(
        title=payload.title,
        message=payload.message,
        severity=payload.severity,
        category=payload.category,
        link_tab=payload.link_tab
    )
    return result
