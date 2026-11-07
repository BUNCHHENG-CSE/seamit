import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import asyncio
from datetime import date, timedelta
from app.database import init_db, get_db

from app.seed_data import seed_database
from app.connectors.jira_connector import JiraConnector
from app.connectors.freshservice_connector import FreshserviceConnector
from app.engine.rule_engine import RuleEngine
from app.engine.discrepancy_radar import DiscrepancyRadar
from app.engine.scheduler import LifecycleScheduler

def setup_module():
    init_db()
    seed_database(force=True)

def test_jira_webhook_normalization():
    connector = JiraConnector({"mock_mode": True})
    payload = {
        "webhookEvent": "jira:issue_updated",
        "issue": {
            "id": "1002",
            "key": "JSM-2001",
            "fields": {
                "summary": "Employee Offboarding - Sarah Connor",
                "description": "Please retrieve laptop ASSET-1001",
                "issuetype": {"name": "Offboarding"},
                "status": {"name": "Done"},
                "reporter": {"emailAddress": "sarah.connor@acme-corp.com"}
            }
        }
    }
    ticket = connector.normalize_webhook(payload)
    assert ticket.ticket_key == "JSM-2001"
    assert ticket.ticket_type == "Offboarding"
    assert ticket.status == "Done"
    assert ticket.asset_tag == "ASSET-1001"
    assert ticket.event_name == "ticket_resolved"

def test_freshservice_webhook_normalization():
    connector = FreshserviceConnector({"mock_mode": True})
    payload = {
        "freshservice_webhook": {
            "ticket_id": 4012,
            "ticket_subject": "Dell screen cracked (SN: 89XYZ42)",
            "ticket_type": "Repair",
            "ticket_status": "In Progress",
            "ticket_requester_email": "marcus.vance@acme-corp.com"
        }
    }
    ticket = connector.normalize_webhook(payload)
    assert ticket.ticket_key == "FS-4012"
    assert ticket.ticket_type == "Repair"
    assert ticket.status == "In Progress"
    assert ticket.serial_number == "89XYZ42"

def test_rule_engine_offboarding_sync():
    connector = JiraConnector({"mock_mode": True})
    payload = {
        "webhookEvent": "jira:issue_updated",
        "issue": {
            "id": "1002",
            "key": "JSM-TEST-OFFBOARD",
            "fields": {
                "summary": "Employee Exit - Sarah Connor",
                "description": "Sarah is departing. Device serial C02G1234MD6R",
                "issuetype": {"name": "Offboarding"},
                "status": {"name": "Done"},
                "reporter": {"emailAddress": "sarah.connor@acme-corp.com"}
            }
        }
    }
    ticket = connector.normalize_webhook(payload)
    result = asyncio.run(RuleEngine.process_ticket_event(ticket))
    assert result.status == "success"
    assert len(result.affected_assets) > 0

    # Verify asset was updated in database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets WHERE serial_number = 'C02G1234MD6R'")
        asset = cursor.fetchone()
        assert asset["status"] == "pending_return"
        assert asset["assigned_to_email"] is None

def test_discrepancy_radar_scan():
    result = DiscrepancyRadar.scan_discrepancies()
    assert "discrepancies" in result
    assert "summary" in result
    assert result["summary"]["total_discrepancies"] > 0
    assert result["summary"]["total_dollar_risk"] > 0

def test_proactive_lifecycle_sync():
    res = asyncio.run(LifecycleScheduler.run_lifecycle_sync())
    assert res["success"] is True

if __name__ == "__main__":
    setup_module()
    test_jira_webhook_normalization()
    print("test_jira_webhook_normalization passed!")
    test_freshservice_webhook_normalization()
    print("test_freshservice_webhook_normalization passed!")
    test_rule_engine_offboarding_sync()
    print("test_rule_engine_offboarding_sync passed!")
    test_discrepancy_radar_scan()
    print("test_discrepancy_radar_scan passed!")
    test_proactive_lifecycle_sync()
    print("test_proactive_lifecycle_sync passed!")
    print("\nAll Core Tests Passed Successfully!")
