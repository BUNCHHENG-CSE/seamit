from pydantic import BaseModel, Field
from typing import Optional

class AssetBase(BaseModel):
    asset_tag: str = Field(..., description="Unique asset tag, e.g. ASSET-1001")
    serial_number: str = Field(..., description="Hardware serial number")
    model: str = Field(..., description="Device model, e.g. MacBook Pro 14 M3")
    category: str = Field("Laptop", description="Category: Laptop, Desktop, Mobile, Monitor, Server")
    assigned_to_email: Optional[str] = None
    assigned_to_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    status: str = Field("in_use", description="in_use, available, in_repair, pending_return, retired, lost_stolen, pending_disposal")
    purchase_date: Optional[str] = None
    warranty_expiry_date: Optional[str] = None
    eol_date: Optional[str] = None
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_expiry_date: Optional[str] = None
    eol_date: Optional[str] = None
    notes: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    last_ticket_id: Optional[str] = None
    last_ticket_title: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class CSVImportResult(BaseModel):
    total_rows: int
    created: int
    updated: int
    failed: int
    errors: list[str] = []
