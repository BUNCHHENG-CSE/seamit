from typing import Any
from fastapi import APIRouter
from app.connectors.jira_connector import JiraConnector
from app.connectors.freshservice_connector import FreshserviceConnector
from app.connectors.zendesk_connector import ZendeskConnector
from app.engine.rule_engine import RuleEngine
from app.schemas.webhook import WebhookSyncResult, NormalizedTicket

router = APIRouter(prefix="/api/simulator", tags=["Simulator"])

SIMULATOR_TEMPLATES = [
    {
        "id": "sim_jira_offboarding",
        "name": "Jira: Employee Offboarding Resolved",
        "source": "jira",
        "description": "Simulates Jira Service Management webhook when an employee exit ticket for Sarah Connor is marked 'Done'. Sarah's MacBook Pro (ASSET-1001) should automatically transition to 'pending_return' and unassign her.",
        "payload": {
            "webhookEvent": "jira:issue_updated",
            "issue": {
                "id": "10942",
                "key": "JSM-9942",
                "fields": {
                    "summary": "Employee Offboarding - Sarah Connor",
                    "description": "Sarah Connor last working day is today. Please recover laptop ASSET-1001 (Serial C02G1234MD6R).",
                    "issuetype": {"name": "Offboarding"},
                    "status": {"name": "Done"},
                    "reporter": {
                        "emailAddress": "sarah.connor@acme-corp.com",
                        "displayName": "Sarah Connor"
                    }
                }
            }
        }
    },
    {
        "id": "sim_freshservice_repair_start",
        "name": "Freshservice: Broken Screen Sent to Repair",
        "source": "freshservice",
        "description": "Simulates Freshservice webhook when a hardware repair ticket is marked 'In Progress'. Asset 89XYZ42 should transition to 'in_repair' at 'IT Repair Depot'.",
        "payload": {
            "freshservice_webhook": {
                "ticket_id": 3089,
                "ticket_type": "Repair",
                "ticket_status": "In Progress",
                "ticket_subject": "Dell Latitude 5540 cracked screen repair (Serial: 89XYZ42)",
                "ticket_description": "User dropped backpack, screen bezel cracked. Sending to Dell depot.",
                "ticket_requester_email": "marcus.vance@acme-corp.com",
                "ticket_requester_name": "Marcus Vance",
                "ticket_asset_tag": "ASSET-1002"
            }
        }
    },
    {
        "id": "sim_freshservice_repair_done",
        "name": "Freshservice: Repair Ticket Resolved -> Return to Stock",
        "source": "freshservice",
        "description": "Simulates Freshservice webhook when Alex Miller's laptop repair ticket is marked 'Resolved'. Asset ASSET-1003 (in_repair) should transition to 'available' in IT Storage Closet.",
        "payload": {
            "freshservice_webhook": {
                "ticket_id": 2041,
                "ticket_type": "Repair",
                "ticket_status": "Resolved",
                "ticket_subject": "MacBook Pro broken screen repair complete",
                "ticket_requester_email": "alex.miller@acme-corp.com",
                "ticket_requester_name": "Alex Miller",
                "ticket_asset_tag": "ASSET-1003"
            }
        }
    },
    {
        "id": "sim_jira_replacement_retired",
        "name": "Jira: Hardware Replacement -> Old Asset Retired",
        "source": "jira",
        "description": "Simulates Jira webhook when a hardware upgrade/replacement ticket is marked 'Resolved'. The specified old device is automatically transitioned to 'retired' and moved to E-Waste.",
        "payload": {
            "webhookEvent": "jira:issue_updated",
            "issue": {
                "id": "11050",
                "key": "JSM-1015",
                "fields": {
                    "summary": "Hardware Replacement - Decommission Old Dell Latitude",
                    "description": "New M3 Mac deployed to user. Old laptop ASSET-1008 (Serial 98KJL10) decommissioned and sanitized.",
                    "issuetype": {"name": "Hardware Replacement"},
                    "status": {"name": "Done"},
                    "reporter": {
                        "emailAddress": "lisa.ray@acme-corp.com",
                        "displayName": "Lisa Ray"
                    }
                }
            }
        }
    },
    {
        "id": "sim_jira_stolen_laptop",
        "name": "Jira: Stolen Laptop Reported",
        "source": "jira",
        "description": "Simulates Jira webhook when a device theft ticket is reported for David Chen's MacBook Pro (ASSET-1007). Asset is immediately marked 'lost_stolen'.",
        "payload": {
            "webhookEvent": "jira:issue_updated",
            "issue": {
                "id": "11200",
                "key": "JSM-9988",
                "fields": {
                    "summary": "Security Alert: Stolen laptop reported from airport lounge",
                    "description": "Device stolen at terminal. Asset: ASSET-1007, Serial: C02DK771MD6T. Need MDM lock.",
                    "issuetype": {"name": "Security Incident"},
                    "status": {"name": "Open"},
                    "reporter": {
                        "emailAddress": "david.chen@acme-corp.com",
                        "displayName": "David Chen"
                    }
                }
            }
        }
    },
    {
        "id": "sim_zendesk_offboarding",
        "name": "Zendesk: Employee Exit Solved -> Return Laptop",
        "source": "zendesk",
        "description": "Simulates Zendesk Support ticket webhook when an employee departure ticket for Rachel Green is marked 'Solved'. Device ASSET-1005 transitions to 'pending_return'.",
        "payload": {
            "ticket": {
                "id": 8492,
                "subject": "Offboarding: Rachel Green exit processing",
                "description": "Rachel Green contract completed. Return requested for Lenovo ThinkPad X1 Carbon (ASSET-1005, Serial: 1S20XW0021US).",
                "status": "solved",
                "type": "task",
                "requester": {
                    "name": "Rachel Green",
                    "email": "rachel.green@acme-corp.com"
                }
            }
        }
    },
    {
        "id": "sim_zendesk_repair",
        "name": "Zendesk: Hardware Defect -> Sent to Depot",
        "source": "zendesk",
        "description": "Simulates Zendesk ticket webhook when a hardware ticket for damaged equipment is marked 'Pending'. Device is routed to 'in_repair'.",
        "payload": {
            "ticket": {
                "id": 8501,
                "subject": "Hardware Issue: Dell XPS battery swelling issue (ASSET-1006)",
                "description": "Swollen battery detected on asset ASSET-1006 (Serial: 3KZ8910). Sent to battery repair vendor.",
                "status": "pending",
                "type": "incident",
                "requester": {
                    "name": "Michael Scott",
                    "email": "michael.scott@acme-corp.com"
                }
            }
        }
    }
]

@router.get("/templates")
def get_simulator_templates():
    return SIMULATOR_TEMPLATES

@router.post("/trigger", response_model=WebhookSyncResult)
async def trigger_simulated_payload(payload: dict[str, Any]):
    source = payload.get("source", "jira")
    raw_event = payload.get("payload", {})

    if source == "freshservice":
        connector = FreshserviceConnector({"mock_mode": True})
    elif source == "zendesk":
        connector = ZendeskConnector({"mock_mode": True})
    else:
        connector = JiraConnector({"mock_mode": True})

    ticket = connector.normalize_webhook(raw_event)
    result = await RuleEngine.process_ticket_event(ticket)
    return result
