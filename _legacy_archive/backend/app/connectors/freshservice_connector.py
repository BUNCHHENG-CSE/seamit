import time
import httpx
from typing import Any, Optional
from app.connectors.base import BaseITSMConnector
from app.schemas.webhook import NormalizedTicket

class FreshserviceConnector(BaseITSMConnector):
    def normalize_webhook(self, payload: dict[str, Any]) -> NormalizedTicket:
        # Freshservice payloads might be wrapped in freshservice_webhook or root level
        data = payload.get("freshservice_webhook") or payload.get("ticket") or payload

        ticket_id = str(data.get("ticket_id") or data.get("id") or "FS-UNKNOWN")
        if not ticket_id.startswith("FS-"):
            ticket_id = f"FS-{ticket_id}"

        title = data.get("ticket_subject") or data.get("subject") or data.get("title") or ""
        description = data.get("ticket_description") or data.get("description") or ""

        status_raw = str(data.get("ticket_status") or data.get("status") or "Open")
        # Freshservice statuses can be numeric (2=Open, 3=Pending, 4=Resolved, 5=Closed) or string
        status_map = {
            "2": "Open",
            "3": "Pending",
            "4": "Resolved",
            "5": "Closed"
        }
        status_name = status_map.get(status_raw, status_raw)

        ticket_type = data.get("ticket_type") or data.get("type") or "Service Request"
        requester_email = data.get("ticket_requester_email") or data.get("requester_email")
        requester_name = data.get("ticket_requester_name") or data.get("requester_name")

        asset_tag = data.get("ticket_asset_tag") or data.get("asset_tag")
        serial_number = data.get("ticket_serial_number") or data.get("serial_number")

        if not asset_tag or not serial_number:
            extracted_tag, extracted_sn = self.extract_identifiers(f"{title} {description}")
            if not asset_tag:
                asset_tag = extracted_tag
            if not serial_number:
                serial_number = extracted_sn

        # Normalize event name
        event_name = "ticket_updated"
        if status_name.lower() in ["resolved", "closed", "completed"]:
            event_name = "ticket_resolved"

        return NormalizedTicket(
            source="freshservice",
            ticket_key=ticket_id,
            title=title,
            status=status_name,
            ticket_type=ticket_type,
            requester_email=requester_email,
            requester_name=requester_name,
            serial_number=serial_number,
            asset_tag=asset_tag,
            event_name=event_name,
            raw_payload=payload
        )

    async def create_ticket(
        self,
        summary: str,
        description: str,
        ticket_type: str = "Hardware Refresh",
        priority: str = "Medium",
        extra_fields: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        if self.mock_mode or not self.base_url or not self.api_key:
            mock_id = f"FS-{int(time.time() * 1000) % 9000 + 1000}"
            return {
                "success": True,
                "ticket_key": mock_id,
                "ticket_url": f"https://mock-company.freshservice.com/helpdesk/tickets/{mock_id.replace('FS-', '')}",
                "status": "Created (Mock)",
                "summary": summary,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())
            }

        url = f"{self.base_url.rstrip('/')}/api/v2/tickets"
        # Freshservice API priority: 1=Low, 2=Medium, 3=High, 4=Urgent
        priority_map = {"Low": 1, "Medium": 2, "High": 3, "Urgent": 4}
        p_val = priority_map.get(priority, 2)

        payload = {
            "subject": summary,
            "description": description,
            "status": 2,  # Open
            "priority": p_val,
            "email": self.email or "helpdesk@company.com"
        }
        if extra_fields:
            payload.update(extra_fields)

        headers = {
            "Content-Type": "application/json"
        }
        auth = (self.api_key, "X")  # Freshservice auth format

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers, auth=auth)
            resp.raise_for_status()
            data = resp.json().get("ticket", {})
            fs_id = data.get("id")
            key = f"FS-{fs_id}" if fs_id else "FS-CREATED"
            return {
                "success": True,
                "ticket_key": key,
                "ticket_url": f"{self.base_url.rstrip('/')}/helpdesk/tickets/{fs_id}",
                "status": "Created",
                "summary": summary
            }

    async def test_connection(self) -> dict[str, Any]:
        start = time.time()
        if self.mock_mode or not self.base_url:
            return {
                "success": True,
                "connector_id": "freshservice",
                "message": "Freshservice simulator active (Mock Mode). Webhooks and ticket creation fully operational.",
                "latency_ms": int((time.time() - start) * 1000) + 15
            }

        try:
            url = f"{self.base_url.rstrip('/')}/api/v2/tickets?per_page=1"
            auth = (self.api_key, "X")
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, auth=auth)
                latency = int((time.time() - start) * 1000)
                if resp.status_code == 200:
                    return {
                        "success": True,
                        "connector_id": "freshservice",
                        "message": "Successfully connected to Freshservice API",
                        "latency_ms": latency
                    }
                else:
                    return {
                        "success": False,
                        "connector_id": "freshservice",
                        "message": f"Freshservice API returned HTTP {resp.status_code}: {resp.text[:200]}",
                        "latency_ms": latency
                    }
        except Exception as e:
            return {
                "success": False,
                "connector_id": "freshservice",
                "message": f"Connection failed: {str(e)}",
                "latency_ms": int((time.time() - start) * 1000)
            }
