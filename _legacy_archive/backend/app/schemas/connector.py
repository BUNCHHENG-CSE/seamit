from pydantic import BaseModel, Field
from typing import Optional

class ConnectorConfigBase(BaseModel):
    id: str  # 'jira', 'freshservice'
    name: str
    is_enabled: bool = True
    base_url: str = ""
    api_key_or_token: str = ""
    email_or_user: str = ""
    project_or_workspace_key: str = ""
    webhook_secret: str = ""
    mock_mode: bool = True

class ConnectorConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    base_url: Optional[str] = None
    api_key_or_token: Optional[str] = None
    email_or_user: Optional[str] = None
    project_or_workspace_key: Optional[str] = None
    webhook_secret: Optional[str] = None
    mock_mode: Optional[bool] = None

class ConnectorConfigResponse(BaseModel):
    id: str
    name: str
    is_enabled: bool
    base_url: str
    api_key_or_token_masked: str
    email_or_user: str
    project_or_workspace_key: str
    mock_mode: bool
    last_sync_at: Optional[str] = None
    status: str
    webhook_url: str

class TestConnectionResult(BaseModel):
    success: bool
    message: str
    connector_id: str
    latency_ms: int
