from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from app.database import get_db
from app.schemas.connector import ConnectorConfigResponse, ConnectorConfigUpdate, TestConnectionResult
from app.connectors.jira_connector import JiraConnector
from app.connectors.freshservice_connector import FreshserviceConnector
from app.connectors.zendesk_connector import ZendeskConnector

router = APIRouter(prefix="/api/connectors", tags=["Connectors"])

def mask_token(token: str) -> str:
    if not token or len(token) <= 8:
        return "••••••••"
    return f"{token[:4]}••••••••{token[-4:]}"

@router.get("", response_model=list[ConnectorConfigResponse])
def list_connectors(request: Request):
    base_host = str(request.base_url).rstrip('/')
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM connectors ORDER BY id ASC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            webhook_url = f"{base_host}/api/webhooks/{r['id']}"
            result.append(ConnectorConfigResponse(
                id=r["id"],
                name=r["name"],
                is_enabled=bool(r["is_enabled"]),
                base_url=r["base_url"] or "",
                api_key_or_token_masked=mask_token(r["api_key_or_token"] or ""),
                email_or_user=r["email_or_user"] or "",
                project_or_workspace_key=r["project_or_workspace_key"] or "",
                mock_mode=bool(r["mock_mode"]),
                last_sync_at=r["last_sync_at"],
                status=r["status"] or "disconnected",
                webhook_url=webhook_url
            ))
        return result

@router.put("/{connector_id}", response_model=ConnectorConfigResponse)
def update_connector(connector_id: str, payload: ConnectorConfigUpdate, request: Request):
    base_host = str(request.base_url).rstrip('/')
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM connectors WHERE id = ?", (connector_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Connector not found")

        updates = []
        params = []
        if payload.is_enabled is not None:
            updates.append("is_enabled = ?")
            params.append(bool(payload.is_enabled))
        if payload.base_url is not None:
            updates.append("base_url = ?")
            params.append(payload.base_url.strip())
        if payload.api_key_or_token is not None and payload.api_key_or_token != "":
            updates.append("api_key_or_token = ?")
            params.append(payload.api_key_or_token.strip())
        if payload.email_or_user is not None:
            updates.append("email_or_user = ?")
            params.append(payload.email_or_user.strip())
        if payload.project_or_workspace_key is not None:
            updates.append("project_or_workspace_key = ?")
            params.append(payload.project_or_workspace_key.strip())
        if payload.mock_mode is not None:
            updates.append("mock_mode = ?")
            params.append(bool(payload.mock_mode))

        if updates:
            params.append(connector_id)
            cursor.execute(f"UPDATE connectors SET {', '.join(updates)} WHERE id = ?", params)

        cursor.execute("SELECT * FROM connectors WHERE id = ?", (connector_id,))
        r = cursor.fetchone()
        return ConnectorConfigResponse(
            id=r["id"],
            name=r["name"],
            is_enabled=bool(r["is_enabled"]),
            base_url=r["base_url"] or "",
            api_key_or_token_masked=mask_token(r["api_key_or_token"] or ""),
            email_or_user=r["email_or_user"] or "",
            project_or_workspace_key=r["project_or_workspace_key"] or "",
            mock_mode=bool(r["mock_mode"]),
            last_sync_at=r["last_sync_at"],
            status=r["status"] or "disconnected",
            webhook_url=f"{base_host}/api/webhooks/{r['id']}"
        )

@router.post("/{connector_id}/test", response_model=TestConnectionResult)
async def test_connector(connector_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM connectors WHERE id = ?", (connector_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Connector not found")

        cfg = dict(row)

    if connector_id == "freshservice":
        connector = FreshserviceConnector(cfg)
    elif connector_id == "zendesk":
        connector = ZendeskConnector(cfg)
    else:
        connector = JiraConnector(cfg)

    res = await connector.test_connection()
    return TestConnectionResult(
        success=res.get("success", False),
        message=res.get("message", "Tested"),
        connector_id=connector_id,
        latency_ms=res.get("latency_ms", 10)
    )
