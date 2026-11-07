from pydantic import BaseModel
from typing import Optional, Any

class SyncLogResponse(BaseModel):
    id: int
    timestamp: str
    direction: str  # ticket_to_asset, asset_to_ticket
    rule_id: Optional[str] = None
    rule_name: Optional[str] = None
    source: str
    ticket_id: Optional[str] = None
    ticket_title: Optional[str] = None
    asset_id: Optional[int] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    action_summary: str
    diff_json: dict[str, Any] = {}
    status: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class SyncStats(BaseModel):
    total_syncs: int
    successful_syncs: int
    failed_syncs: int
    ticket_to_asset_count: int
    asset_to_ticket_count: int
    last_sync_timestamp: Optional[str] = None
