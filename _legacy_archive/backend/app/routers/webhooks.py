from typing import Any
from fastapi import APIRouter, Request, HTTPException
from app.connectors.jira_connector import JiraConnector
from app.connectors.freshservice_connector import FreshserviceConnector
from app.connectors.zendesk_connector import ZendeskConnector
from app.engine.rule_engine import RuleEngine
from app.schemas.webhook import WebhookSyncResult, NormalizedTicket

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

@router.post("/jira", response_model=WebhookSyncResult)
async def handle_jira_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    connector = JiraConnector({"mock_mode": True})
    ticket = connector.normalize_webhook(payload)
    result = await RuleEngine.process_ticket_event(ticket)
    return result

@router.post("/freshservice", response_model=WebhookSyncResult)
async def handle_freshservice_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    connector = FreshserviceConnector({"mock_mode": True})
    ticket = connector.normalize_webhook(payload)
    result = await RuleEngine.process_ticket_event(ticket)
    return result

@router.post("/zendesk", response_model=WebhookSyncResult)
async def handle_zendesk_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    connector = ZendeskConnector({"mock_mode": True})
    ticket = connector.normalize_webhook(payload)
    result = await RuleEngine.process_ticket_event(ticket)
    return result

@router.post("/generic", response_model=WebhookSyncResult)
async def handle_generic_webhook(payload: dict[str, Any]):
    ticket = NormalizedTicket(
        source=payload.get("source", "generic"),
        ticket_key=str(payload.get("ticket_key") or payload.get("id") or "GEN-001"),
        title=payload.get("title") or payload.get("summary") or "Generic Ticket",
        status=payload.get("status", "Resolved"),
        ticket_type=payload.get("ticket_type") or payload.get("type") or "Hardware",
        requester_email=payload.get("requester_email"),
        requester_name=payload.get("requester_name"),
        serial_number=payload.get("serial_number"),
        asset_tag=payload.get("asset_tag"),
        event_name=payload.get("event_name", "ticket_resolved"),
        raw_payload=payload
    )
    result = await RuleEngine.process_ticket_event(ticket)
    return result
