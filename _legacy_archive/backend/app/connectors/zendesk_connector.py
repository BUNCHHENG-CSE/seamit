import time
import httpx
from typing import Any, Optional
from app.connectors.base import BaseITSMConnector
from app.schemas.webhook import NormalizedTicket

class ZendeskConnector(BaseITSMConnector):
    def normalize_webhook(self, payload: dict[str, Any]) -> NormalizedTicket:
        # Check if wrapped in "ticket" key or flat
        ticket_data = payload.get("ticket", payload)
        
        raw_id = ticket_data.get("id") or ticket_data.get("ticket_id") or "1001"
        ticket_key = f"ZD-{raw_id}" if not str(raw_id).startswith("ZD-") else str(raw_id)
        
        summary = (
            ticket_data.get("subject") or 
            ticket_data.get("title") or 
            ticket_data.get("ticket_title") or 
            ticket_data.get("ticket_subject") or 
            "Zendesk Ticket"
        )
        description = (
            ticket_data.get("description") or 
            ticket_data.get("ticket_description") or 
            ticket_data.get("comment", {}).get("body") or 
            ""
        )
        status_name = (
            ticket_data.get("status") or 
            ticket_data.get("ticket_status") or 
            "open"
        ).lower()

        ticket_type = (
            ticket_data.get("ticket_type") or 
            ticket_data.get("type") or 
            "Incident"
        ).title()

        # Requester resolution
        requester = ticket_data.get("requester", {})
        if isinstance(requester, dict):
            requester_email = requester.get("email") or ticket_data.get("ticket_requester_email")
            requester_name = requester.get("name") or ticket_data.get("ticket_requester_name")
        else:
            requester_email = ticket_data.get("ticket_requester_email")
            requester_name = ticket_data.get("ticket_requester_name")

        # Extract asset tag and serial number
        asset_tag = ticket_data.get("asset_tag") or ticket_data.get("ticket_asset_tag")
        serial_number = ticket_data.get("serial_number") or ticket_data.get("ticket_serial_number")

        # Check custom fields if present
        custom_fields = ticket_data.get("custom_fields", [])
        if isinstance(custom_fields, list):
            for cf in custom_fields:
                if isinstance(cf, dict):
                    val = str(cf.get("value") or "")
                    if val.startswith("ASSET-") or val.startswith("AST-"):
                        asset_tag = val
                    elif "serial" in str(cf.get("name", "")).lower() or len(val) >= 8:
                        if not serial_number and val.isalnum():
                            serial_number = val

        # Fallback to regex identifier extraction
        if not asset_tag or not serial_number:
            extracted_tag, extracted_sn = self.extract_identifiers(f"{summary} {description}")
            if not asset_tag:
                asset_tag = extracted_tag
            if not serial_number:
                serial_number = extracted_sn

        # Determine normalized event name
        normalized_event = "ticket_updated"
        if status_name in ["solved", "closed", "resolved", "done"]:
            normalized_event = "ticket_resolved"
        elif "created" in str(payload.get("event", "")).lower() or status_name == "new":
            normalized_event = "ticket_created"

        return NormalizedTicket(
            source="zendesk",
            ticket_key=ticket_key,
            title=summary,
            status=status_name.capitalize(),
            ticket_type=ticket_type,
            requester_email=requester_email,
            requester_name=requester_name,
            serial_number=serial_number,
            asset_tag=asset_tag,
            event_name=normalized_event,
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
            mock_id = f"ZD-{int(time.time() * 1000) % 9000 + 1000}"
            return {
                "success": True,
                "ticket_key": mock_id,
                "ticket_url": f"https://mock-zendesk.zendesk.com/agent/tickets/{mock_id.replace('ZD-', '')}",
                "status": "Created (Mock)",
                "summary": summary,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())
            }

        url = f"{self.base_url.rstrip('/')}/api/v2/tickets.json"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        # Zendesk API token auth uses {email}/token:{api_token}
        auth = (f"{self.email}/token", self.api_key)
        payload = {
            "ticket": {
                "subject": summary,
                "comment": {"body": description},
                "priority": priority.lower(),
                "type": "task"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers, auth=auth)
                if resp.status_code in (200, 201):
                    data = resp.json().get("ticket", {})
                    t_id = f"ZD-{data.get('id', 'NEW')}"
                    return {
                        "success": True,
                        "ticket_key": t_id,
                        "ticket_url": f"{self.base_url.rstrip('/')}/agent/tickets/{data.get('id')}",
                        "status": data.get("status", "open"),
                        "summary": summary
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Zendesk API returned HTTP {resp.status_code}: {resp.text[:200]}"
                    }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to contact Zendesk: {str(e)}"
            }

    async def test_connection(self) -> dict[str, Any]:
        if self.mock_mode:
            return {
                "success": True,
                "message": "Connected successfully to Zendesk Support API (Mock Mode Active)",
                "latency_ms": 12
            }

        if not self.base_url or not self.api_key or not self.email:
            return {
                "success": False,
                "message": "Missing Zendesk Base URL, Email, or API Token."
            }

        url = f"{self.base_url.rstrip('/')}/api/v2/users/me.json"
        auth = (f"{self.email}/token", self.api_key)
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, auth=auth)
                latency = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    user_info = resp.json().get("user", {})
                    return {
                        "success": True,
                        "message": f"Successfully authenticated with Zendesk as {user_info.get('email', self.email)} ({user_info.get('role', 'Agent')})",
                        "latency_ms": latency
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Zendesk authentication failed (HTTP {resp.status_code}): {resp.text[:150]}",
                        "latency_ms": latency
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection error: {str(e)}"
            }
