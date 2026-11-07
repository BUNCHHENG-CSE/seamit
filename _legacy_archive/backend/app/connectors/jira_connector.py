import time
import httpx
from typing import Any, Optional
from app.connectors.base import BaseITSMConnector
from app.schemas.webhook import NormalizedTicket

class JiraConnector(BaseITSMConnector):
    def normalize_webhook(self, payload: dict[str, Any]) -> NormalizedTicket:
        event = payload.get("webhookEvent", "jira:issue_updated")
        issue = payload.get("issue", {})
        fields = issue.get("fields", {})

        ticket_key = issue.get("key", "JSM-UNKNOWN")
        summary = fields.get("summary", "")
        description_raw = fields.get("description", "")
        if isinstance(description_raw, dict):
            # Atlassian Document Format (ADF) handling
            description_text = str(description_raw)
        else:
            description_text = str(description_raw or "")

        status_obj = fields.get("status", {})
        status_name = status_obj.get("name", "Open")

        issuetype_obj = fields.get("issuetype", {})
        ticket_type = issuetype_obj.get("name", "Service Request")

        reporter = fields.get("reporter", {})
        reporter_email = reporter.get("emailAddress")
        reporter_name = reporter.get("displayName")

        # Try to find asset tag / serial from custom fields or scan summary/description
        asset_tag = None
        serial_number = None

        # Check standard custom field names or iterate values
        for k, v in fields.items():
            if isinstance(v, str):
                if v.startswith("ASSET-") or v.startswith("AST-"):
                    asset_tag = v
                elif "serial" in k.lower() or "serial" in str(v).lower():
                    serial_number = v

        if not asset_tag or not serial_number:
            extracted_tag, extracted_sn = self.extract_identifiers(f"{summary} {description_text}")
            if not asset_tag:
                asset_tag = extracted_tag
            if not serial_number:
                serial_number = extracted_sn

        # Determine normalized event name
        normalized_event = "ticket_updated"
        if "created" in event:
            normalized_event = "ticket_created"
        elif status_name.lower() in ["resolved", "closed", "done", "completed"]:
            normalized_event = "ticket_resolved"

        return NormalizedTicket(
            source="jira",
            ticket_key=ticket_key,
            title=summary,
            status=status_name,
            ticket_type=ticket_type,
            requester_email=reporter_email,
            requester_name=reporter_name,
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
            # Simulated Jira response
            mock_id = f"JSM-{int(time.time() * 1000) % 9000 + 1000}"
            return {
                "success": True,
                "ticket_key": mock_id,
                "ticket_url": f"https://mock-jira.atlassian.net/browse/{mock_id}",
                "status": "Created (Mock)",
                "summary": summary,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())
            }

        url = f"{self.base_url.rstrip('/')}/rest/api/3/issue"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        auth = (self.email, self.api_key)
        
        payload = {
            "fields": {
                "project": {"key": self.project_key or "ITSM"},
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": description}]
                        }
                    ]
                },
                "issuetype": {"name": ticket_type},
                "priority": {"name": priority}
            }
        }
        if extra_fields:
            payload["fields"].update(extra_fields)

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers, auth=auth)
            resp.raise_for_status()
            data = resp.json()
            key = data.get("key", "JSM-CREATED")
            return {
                "success": True,
                "ticket_key": key,
                "ticket_url": f"{self.base_url.rstrip('/')}/browse/{key}",
                "status": "Created",
                "summary": summary
            }

    async def test_connection(self) -> dict[str, Any]:
        start = time.time()
        if self.mock_mode or not self.base_url:
            return {
                "success": True,
                "connector_id": "jira",
                "message": "Jira Service Management simulator active (Mock Mode). Webhooks and ticket creation fully operational.",
                "latency_ms": int((time.time() - start) * 1000) + 12
            }

        try:
            url = f"{self.base_url.rstrip('/')}/rest/api/3/myself"
            auth = (self.email, self.api_key)
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, auth=auth)
                latency = int((time.time() - start) * 1000)
                if resp.status_code == 200:
                    data = resp.json()
                    user_name = data.get("displayName", self.email)
                    return {
                        "success": True,
                        "connector_id": "jira",
                        "message": f"Successfully connected to Jira as {user_name}",
                        "latency_ms": latency
                    }
                else:
                    return {
                        "success": False,
                        "connector_id": "jira",
                        "message": f"Jira API returned HTTP {resp.status_code}: {resp.text[:200]}",
                        "latency_ms": latency
                    }
        except Exception as e:
            return {
                "success": False,
                "connector_id": "jira",
                "message": f"Connection failed: {str(e)}",
                "latency_ms": int((time.time() - start) * 1000)
            }
