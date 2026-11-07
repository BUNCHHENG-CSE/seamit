import re
from abc import ABC, abstractmethod
from typing import Any, Optional
from app.schemas.webhook import NormalizedTicket

class BaseITSMConnector(ABC):
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.mock_mode = bool(config.get("mock_mode", True))
        self.base_url = config.get("base_url", "")
        self.api_key = config.get("api_key_or_token", "")
        self.email = config.get("email_or_user", "")
        self.project_key = config.get("project_or_workspace_key", "")

    @abstractmethod
    def normalize_webhook(self, payload: dict[str, Any]) -> NormalizedTicket:
        """Parse native ITSM webhook payload into normalized format."""
        pass

    @abstractmethod
    async def create_ticket(
        self,
        summary: str,
        description: str,
        ticket_type: str = "Hardware Refresh",
        priority: str = "Medium",
        extra_fields: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Create draft ticket in ITSM (or mock ticket)."""
        pass

    @abstractmethod
    async def test_connection(self) -> dict[str, Any]:
        """Verify API credentials and connectivity."""
        pass

    @staticmethod
    def extract_identifiers(text: str) -> tuple[Optional[str], Optional[str]]:
        """
        Regex extracts serial numbers or asset tags from ticket text/summary/description.
        Examples: 'ASSET-1029', 'Serial: C02G1234MD6R', 'SN: W89012XYZ'
        """
        if not text:
            return None, None
            
        asset_tag = None
        serial_number = None

        # Check for asset tag like ASSET-1234, AST-1234, TAG-1234
        tag_match = re.search(r'\b(ASSET-\d+|AST-\d+|IT-\d+)\b', text, re.IGNORECASE)
        if tag_match:
            asset_tag = tag_match.group(1).upper()

        # Check for serial number patterns
        serial_match = re.search(r'\b(?:SN|Serial|S/N)[:\s#]*([A-Z0-9]{6,20})\b', text, re.IGNORECASE)
        if serial_match:
            serial_number = serial_match.group(1).upper()

        return asset_tag, serial_number
