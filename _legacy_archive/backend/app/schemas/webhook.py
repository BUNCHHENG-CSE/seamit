from pydantic import BaseModel, Field
from typing import Optional, Any

class NormalizedTicket(BaseModel):
    source: str = Field(..., description="jira, freshservice, or generic")
    ticket_key: str = Field(..., description="Ticket reference key, e.g. JSM-1042")
    title: str = Field(..., description="Summary or title of the ticket")
    status: str = Field(..., description="Current status of the ticket, e.g. Resolved, Closed, In Progress")
    ticket_type: str = Field("General", description="Ticket category or issue type, e.g. Offboarding, Hardware Replacement, Repair")
    requester_email: Optional[str] = None
    requester_name: Optional[str] = None
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    event_name: Optional[str] = "ticket_resolved"  # ticket_created, ticket_updated, ticket_resolved
    raw_payload: Optional[dict[str, Any]] = None

class WebhookSyncResult(BaseModel):
    status: str  # success, skipped, partial, failed
    matched_rules: list[str] = []
    affected_assets: list[str] = []
    actions_taken: list[str] = []
    log_id: Optional[int] = None
    message: str
