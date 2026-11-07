from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.engine.discrepancy_radar import DiscrepancyRadar

router = APIRouter(prefix="/api/discrepancies", tags=["Discrepancies"])

class RemediationRequest(BaseModel):
    action: str
    discrepancy_id: Optional[str] = None
    asset_id: Optional[int] = None
    target_status: Optional[str] = None
    target_location: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    ticket_id: Optional[str] = None

@router.get("/radar")
def get_discrepancy_radar():
    """Runs real-time Discrepancy Radar scan and calculates risks and compliance score."""
    result = DiscrepancyRadar.scan_discrepancies()
    return result

@router.post("/remediate")
async def remediate_discrepancy(payload: RemediationRequest):
    """Executes a 1-click remediation action for a detected discrepancy."""
    try:
        result = await DiscrepancyRadar.remediate(
            action=payload.action,
            discrepancy_id=payload.discrepancy_id,
            asset_id=payload.asset_id,
            target_status=payload.target_status,
            target_location=payload.target_location,
            assigned_to_name=payload.assigned_to_name,
            assigned_to_email=payload.assigned_to_email,
            ticket_id=payload.ticket_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remediation failed: {str(e)}")
