import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.schemas.rule import RuleCreate, RuleUpdate, RuleResponse, RuleConditions, RuleActions

router = APIRouter(prefix="/api/rules", tags=["Rules"])

RECIPES = [
    {
        "id": "recipe_offboarding_laptop",
        "name": "Employee Offboarding -> Auto-Unassign & Pending Return",
        "category": "Offboarding & Custody",
        "description": "When HR or IT marks an offboarding ticket resolved in Jira or Freshservice, automatically transitions the employee's assigned device to 'pending_return', clears the user assignment, and logs the change.",
        "direction": "ticket_to_asset",
        "source": "any",
        "event_type": "ticket_resolved",
        "conditions": {
            "ticket_types": ["Offboarding", "Employee Exit", "Termination"],
            "ticket_statuses": ["Resolved", "Closed", "Done"]
        },
        "actions": {
            "set_asset_status": "pending_return",
            "clear_assignee": True,
            "set_location": "IT Return Bay / Quarantine",
            "append_notes": "Offboarding ticket {ticket_key} closed."
        }
    },
    {
        "id": "recipe_repair_in_progress",
        "name": "Hardware Repair Ticket -> Transition to In Repair",
        "category": "Hardware Lifecycle",
        "description": "When a ticket with issue type 'Repair' or title keywords ('broken screen', 'battery', 'liquid') is in progress, updates the asset table status to 'in_repair'.",
        "direction": "ticket_to_asset",
        "source": "any",
        "event_type": "ticket_updated",
        "conditions": {
            "ticket_types": ["Repair", "Hardware Issue"],
            "ticket_statuses": ["In Progress", "Waiting on Vendor"],
            "title_keywords": ["screen", "battery", "repair", "keyboard"]
        },
        "actions": {
            "set_asset_status": "in_repair",
            "clear_assignee": False,
            "set_location": "IT Repair Depot",
            "append_notes": "Hardware repair started via ticket {ticket_key}."
        }
    },
    {
        "id": "recipe_repair_resolved",
        "name": "Repair Resolved -> Return to IT Available Stock",
        "category": "Hardware Lifecycle",
        "description": "When a repair ticket is resolved, marks the device 'available' in the IT storage closet ready for redeployment.",
        "direction": "ticket_to_asset",
        "source": "any",
        "event_type": "ticket_resolved",
        "conditions": {
            "ticket_types": ["Repair", "Hardware Issue"],
            "ticket_statuses": ["Resolved", "Closed"]
        },
        "actions": {
            "set_asset_status": "available",
            "clear_assignee": True,
            "set_location": "IT Storage Closet - Shelf B",
            "append_notes": "Repair completed via ticket {ticket_key}."
        }
    },
    {
        "id": "recipe_device_replacement",
        "name": "Hardware Replacement -> Mark Old Asset Retired",
        "category": "Decommissioning",
        "description": "When a device replacement ticket is completed, retires the old hardware and logs NIST-compliant disposal notes.",
        "direction": "ticket_to_asset",
        "source": "any",
        "event_type": "ticket_resolved",
        "conditions": {
            "ticket_types": ["Hardware Replacement", "Device Upgrade"],
            "ticket_statuses": ["Resolved", "Closed"]
        },
        "actions": {
            "set_asset_status": "retired",
            "clear_assignee": True,
            "set_location": "IT E-Waste Staging",
            "append_notes": "Retired per hardware replacement ticket {ticket_key}."
        }
    },
    {
        "id": "recipe_lost_stolen",
        "name": "Reported Lost or Stolen -> Mark Lost & Trigger Alert",
        "category": "Security & Compliance",
        "description": "Immediately flags asset as 'lost_stolen', clears custody, and logs incident in audit records.",
        "direction": "ticket_to_asset",
        "source": "any",
        "event_type": "ticket_resolved",
        "conditions": {
            "ticket_types": ["Security Incident", "Lost Device"],
            "ticket_statuses": ["Open", "In Progress", "Resolved"],
            "title_keywords": ["stolen", "lost", "theft"]
        },
        "actions": {
            "set_asset_status": "lost_stolen",
            "clear_assignee": True,
            "set_location": "Unreachable / Stolen",
            "append_notes": "Stolen laptop reported via ticket {ticket_key}."
        }
    },
    {
        "id": "recipe_warranty_proactive",
        "name": "Warranty Expiry (-60 Days) -> Auto-generate Draft Ticket",
        "category": "Proactive Lifecycle (2-Way)",
        "description": "Scans assets daily. When warranty expiration is within 60 days, auto-generates a draft hardware refresh ticket in Jira Service Management.",
        "direction": "asset_to_ticket",
        "source": "warranty_scheduler",
        "event_type": "warranty_expiring",
        "conditions": {
            "days_before_warranty": 60,
            "asset_statuses": ["in_use"]
        },
        "actions": {
            "create_ticket": True,
            "destination_itsm": "jira",
            "ticket_type": "Hardware Refresh",
            "ticket_priority": "Medium",
            "ticket_summary_template": "Hardware Refresh: {model} ({serial_number}) - {assigned_name}",
            "ticket_description_template": "Warranty expires on {warranty_date} ({days_left} days left). Assigned to {assigned_name}."
        }
    },
    {
        "id": "recipe_zendesk_offboarding",
        "name": "Zendesk Offboarding Solved -> Auto-Unassign & Return",
        "category": "Offboarding & Custody",
        "description": "When a Zendesk ticket regarding employee exit or offboarding is marked 'Solved', transitions device to 'pending_return' and unassigns the user.",
        "direction": "ticket_to_asset",
        "source": "zendesk",
        "event_type": "ticket_resolved",
        "conditions": {
            "ticket_types": ["Incident", "Task", "Offboarding"],
            "ticket_statuses": ["Solved", "Closed"],
            "title_keywords": ["offboarding", "exit", "terminate", "leaving"]
        },
        "actions": {
            "set_asset_status": "pending_return",
            "clear_assignee": True,
            "set_location": "IT Return Bay / Quarantine",
            "append_notes": "Zendesk offboarding ticket {ticket_key} solved."
        }
    },
    {
        "id": "recipe_zendesk_warranty",
        "name": "Warranty Expiry (-60 Days) -> Generate Zendesk Ticket",
        "category": "Proactive Lifecycle (2-Way)",
        "description": "Scans assets approaching warranty expiration and auto-creates hardware replacement tasks in Zendesk.",
        "direction": "asset_to_ticket",
        "source": "warranty_scheduler",
        "event_type": "warranty_expiring",
        "conditions": {
            "days_before_warranty": 60,
            "asset_statuses": ["in_use"]
        },
        "actions": {
            "create_ticket": True,
            "destination_itsm": "zendesk",
            "ticket_type": "Task",
            "ticket_priority": "Normal",
            "ticket_summary_template": "Hardware Lifecycle Refresh: {model} ({asset_tag})",
            "ticket_description_template": "Device assigned to {assigned_name} warranty expires on {warranty_date}."
        }
    }
]

@router.get("/recipes")
def get_recipe_templates():
    return RECIPES

@router.get("", response_model=list[RuleResponse])
def list_rules():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rules ORDER BY created_at ASC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            rule_dict = dict(r)
            rule_dict["conditions"] = json.loads(rule_dict["conditions_json"] or "{}")
            rule_dict["actions"] = json.loads(rule_dict["actions_json"] or "{}")
            rule_dict["is_enabled"] = bool(rule_dict["is_enabled"])
            result.append(rule_dict)
        return result

@router.get("/{rule_id}", response_model=RuleResponse)
def get_rule(rule_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rules WHERE id = ?", (rule_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rule not found")
        rule_dict = dict(row)
        rule_dict["conditions"] = json.loads(rule_dict["conditions_json"] or "{}")
        rule_dict["actions"] = json.loads(rule_dict["actions_json"] or "{}")
        rule_dict["is_enabled"] = bool(rule_dict["is_enabled"])
        return rule_dict

@router.post("", response_model=RuleResponse, status_code=201)
def create_rule(payload: RuleCreate):
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM rules WHERE id = ?", (payload.id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Rule ID '{payload.id}' already exists")

        cursor.execute("""
            INSERT INTO rules (
                id, name, description, source, direction, event_type,
                conditions_json, actions_json, is_enabled, execution_count,
                last_executed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)
        """, (
            payload.id, payload.name, payload.description, payload.source,
            payload.direction, payload.event_type,
            json.dumps(payload.conditions.model_dump()),
            json.dumps(payload.actions.model_dump()),
            bool(payload.is_enabled),
            now_iso
        ))
        cursor.execute("SELECT * FROM rules WHERE id = ?", (payload.id,))
        row = cursor.fetchone()
        rule_dict = dict(row)
        rule_dict["conditions"] = json.loads(rule_dict["conditions_json"] or "{}")
        rule_dict["actions"] = json.loads(rule_dict["actions_json"] or "{}")
        rule_dict["is_enabled"] = bool(rule_dict["is_enabled"])
        return rule_dict

@router.put("/{rule_id}", response_model=RuleResponse)
def update_rule(rule_id: str, payload: RuleUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rules WHERE id = ?", (rule_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")

        updates = []
        params = []
        if payload.name is not None:
            updates.append("name = ?")
            params.append(payload.name)
        if payload.description is not None:
            updates.append("description = ?")
            params.append(payload.description)
        if payload.source is not None:
            updates.append("source = ?")
            params.append(payload.source)
        if payload.direction is not None:
            updates.append("direction = ?")
            params.append(payload.direction)
        if payload.event_type is not None:
            updates.append("event_type = ?")
            params.append(payload.event_type)
        if payload.conditions is not None:
            updates.append("conditions_json = ?")
            params.append(json.dumps(payload.conditions.model_dump()))
        if payload.actions is not None:
            updates.append("actions_json = ?")
            params.append(json.dumps(payload.actions.model_dump()))
        if payload.is_enabled is not None:
            updates.append("is_enabled = ?")
            params.append(bool(payload.is_enabled))

        if updates:
            params.append(rule_id)
            cursor.execute(f"UPDATE rules SET {', '.join(updates)} WHERE id = ?", params)

        cursor.execute("SELECT * FROM rules WHERE id = ?", (rule_id,))
        row = cursor.fetchone()
        rule_dict = dict(row)
        rule_dict["conditions"] = json.loads(rule_dict["conditions_json"] or "{}")
        rule_dict["actions"] = json.loads(rule_dict["actions_json"] or "{}")
        rule_dict["is_enabled"] = bool(rule_dict["is_enabled"])
        return rule_dict

@router.delete("/{rule_id}")
def delete_rule(rule_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM rules WHERE id = ?", (rule_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")
        cursor.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
        return {"success": True, "message": f"Rule {rule_id} deleted"}
