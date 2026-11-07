import json
import httpx
from datetime import datetime, timezone
from typing import Optional
from app.database import get_db

class NotificationEngine:
    @classmethod
    async def notify(
        cls,
        title: str,
        message: str,
        severity: str = "INFO",
        category: str = "general",
        link_tab: Optional[str] = None
    ) -> dict:
        """
        Records an in-app notification and dispatches to outbound Slack/Teams webhook if configured.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        notification_id = None

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO notifications (title, message, severity, category, link_tab, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, ?)
            """, (title, message, severity, category, link_tab, now_iso))
            notification_id = cursor.lastrowid

            # Check for configured outbound alert webhook
            cursor.execute("SELECT * FROM connectors WHERE id = 'slack_alerts'")
            slack_conn = cursor.fetchone()

        outbound_sent = False
        outbound_error = None

        if slack_conn and slack_conn["is_enabled"] and slack_conn["base_url"]:
            webhook_url = slack_conn["base_url"].strip()
            # If not in mock mode and valid HTTP URL
            if not slack_conn["mock_mode"] and webhook_url.startswith("http"):
                try:
                    payload = {
                        "text": f"*{severity}* | *{title}*\n{message}",
                        "attachments": [
                            {
                                "color": "#ef4444" if severity == "HIGH" else "#f59e0b" if severity == "MEDIUM" else "#10b981",
                                "fields": [
                                    {"title": "Category", "value": category, "short": True},
                                    {"title": "Severity", "value": severity, "short": True}
                                ],
                                "footer": "SeamIT ITSM-ITAM Bridge"
                            }
                        ]
                    }
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        resp = await client.post(webhook_url, json=payload)
                        outbound_sent = (resp.status_code == 200)
                except Exception as e:
                    outbound_error = str(e)
            else:
                outbound_sent = True  # Mock dispatched

        return {
            "notification_id": notification_id,
            "title": title,
            "severity": severity,
            "outbound_sent": outbound_sent,
            "outbound_error": outbound_error,
            "created_at": now_iso
        }
