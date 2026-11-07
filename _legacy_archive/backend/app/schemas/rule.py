from pydantic import BaseModel, Field
from typing import Optional, Any

class RuleConditions(BaseModel):
    ticket_types: Optional[list[str]] = None
    ticket_statuses: Optional[list[str]] = None
    title_keywords: Optional[list[str]] = None
    days_before_warranty: Optional[int] = None
    days_before_eol: Optional[int] = None
    asset_statuses: Optional[list[str]] = None

class RuleActions(BaseModel):
    set_asset_status: Optional[str] = None
    clear_assignee: Optional[bool] = False
    set_location: Optional[str] = None
    append_notes: Optional[str] = None
    create_ticket: Optional[bool] = False
    destination_itsm: Optional[str] = "jira"  # jira, freshservice
    ticket_type: Optional[str] = "Hardware Refresh"
    ticket_priority: Optional[str] = "Medium"
    ticket_summary_template: Optional[str] = None
    ticket_description_template: Optional[str] = None

class RuleBase(BaseModel):
    id: str = Field(..., description="Unique rule ID, e.g. rule_offboarding_return")
    name: str = Field(..., description="Human-readable rule name")
    description: Optional[str] = None
    source: str = Field("any", description="jira, freshservice, warranty_scheduler, any")
    direction: str = Field("ticket_to_asset", description="ticket_to_asset or asset_to_ticket")
    event_type: str = Field(..., description="ticket_resolved, ticket_created, ticket_updated, warranty_expiring, eol_expiring")
    conditions: RuleConditions = Field(default_factory=RuleConditions)
    actions: RuleActions = Field(default_factory=RuleActions)
    is_enabled: bool = True

class RuleCreate(RuleBase):
    pass

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    direction: Optional[str] = None
    event_type: Optional[str] = None
    conditions: Optional[RuleConditions] = None
    actions: Optional[RuleActions] = None
    is_enabled: Optional[bool] = None

class RuleResponse(RuleBase):
    execution_count: int = 0
    last_executed_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
