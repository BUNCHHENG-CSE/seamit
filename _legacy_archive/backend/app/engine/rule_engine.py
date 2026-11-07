import json
from datetime import datetime, timezone
from typing import Any, Optional
from app.database import get_db
from app.schemas.webhook import NormalizedTicket, WebhookSyncResult

def match_condition(expected: Optional[list[str]], actual: Optional[str]) -> bool:
    if not expected:
        return True
    if not actual:
        return False
    actual_lower = actual.strip().lower()
    return any(e.strip().lower() == actual_lower for e in expected)

def match_keywords(keywords: Optional[list[str]], text: Optional[str]) -> bool:
    if not keywords:
        return True
    if not text:
        return False
    text_lower = text.lower()
    return any(kw.strip().lower() in text_lower for kw in keywords)

class RuleEngine:
    @staticmethod
    def find_matching_asset(
        cursor,
        asset_tag: Optional[str],
        serial_number: Optional[str],
        requester_email: Optional[str]
    ) -> Optional[dict[str, Any]]:
        # 1. Exact match by asset tag
        if asset_tag:
            cursor.execute("SELECT * FROM assets WHERE LOWER(asset_tag) = LOWER(?)", (asset_tag,))
            row = cursor.fetchone()
            if row:
                return dict(row)

        # 2. Exact match by serial number
        if serial_number:
            cursor.execute("SELECT * FROM assets WHERE LOWER(serial_number) = LOWER(?)", (serial_number,))
            row = cursor.fetchone()
            if row:
                return dict(row)

        # 3. Match by assigned employee email
        if requester_email:
            cursor.execute("SELECT * FROM assets WHERE LOWER(assigned_to_email) = LOWER(?) AND status = 'in_use' LIMIT 1", (requester_email,))
            row = cursor.fetchone()
            if row:
                return dict(row)

        return None

    @classmethod
    async def process_ticket_event(cls, ticket: NormalizedTicket) -> WebhookSyncResult:
        now_iso = datetime.now(timezone.utc).isoformat()
        matched_rules = []
        affected_assets = []
        actions_taken = []
        last_log_id = None

        with get_db() as conn:
            cursor = conn.cursor()

            # Record / update cached ticket
            cursor.execute("""
                INSERT INTO cached_tickets (
                    source, ticket_key, title, status, ticket_type,
                    requester_email, requester_name, serial_number, asset_tag,
                    raw_payload_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ticket.source, ticket.ticket_key, ticket.title, ticket.status,
                ticket.ticket_type, ticket.requester_email, ticket.requester_name,
                ticket.serial_number, ticket.asset_tag,
                json.dumps(ticket.raw_payload or {}), now_iso, now_iso
            ))

            # Fetch active ticket_to_asset rules
            cursor.execute("""
                SELECT * FROM rules
                WHERE is_enabled = TRUE AND direction = 'ticket_to_asset'
            """)
            rules = cursor.fetchall()

            for rule_row in rules:
                rule_id = rule_row["id"]
                rule_name = rule_row["name"]
                source_filter = rule_row["source"]
                event_type = rule_row["event_type"]
                conditions = json.loads(rule_row["conditions_json"] or "{}")
                actions = json.loads(rule_row["actions_json"] or "{}")

                # Filter by source
                if source_filter not in ["any", ticket.source]:
                    continue

                # Filter by event type
                if event_type and ticket.event_name and event_type != ticket.event_name:
                    # Allow ticket_resolved rule to match if status is resolved/closed
                    if event_type == "ticket_resolved" and ticket.status.lower() not in ["resolved", "closed", "done", "completed"]:
                        continue

                # Check conditions
                c_types = conditions.get("ticket_types")
                c_statuses = conditions.get("ticket_statuses")
                c_keywords = conditions.get("title_keywords")

                if c_types and not match_condition(c_types, ticket.ticket_type):
                    continue
                if c_statuses and not match_condition(c_statuses, ticket.status):
                    continue
                if c_keywords and not match_keywords(c_keywords, ticket.title):
                    continue

                # Rule condition matched! Now find the asset
                asset = cls.find_matching_asset(
                    cursor,
                    ticket.asset_tag,
                    ticket.serial_number,
                    ticket.requester_email
                )

                if not asset:
                    # Log an unlinked discrepancy / warning
                    cursor.execute("""
                        INSERT INTO sync_logs (
                            timestamp, direction, rule_id, rule_name, source,
                            ticket_id, ticket_title, action_summary, diff_json,
                            status, error_message
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        now_iso, "ticket_to_asset", rule_id, rule_name, ticket.source,
                        ticket.ticket_key, ticket.title,
                        f"Rule '{rule_name}' matched ticket, but no associated asset found by tag, serial, or user email",
                        json.dumps({"ticket": ticket.model_dump()}),
                        "skipped", "No matching asset in inventory"
                    ))
                    last_log_id = cursor.lastrowid
                    continue

                # Apply actions
                diff: dict[str, Any] = {}
                updates: list[str] = ["updated_at = ?"]
                params: list[Any] = [now_iso]

                new_status = actions.get("set_asset_status")
                if new_status and new_status != asset["status"]:
                    diff["status"] = {"old": asset["status"], "new": new_status}
                    updates.append("status = ?")
                    params.append(new_status)

                if actions.get("clear_assignee"):
                    diff["assigned_to_email"] = {"old": asset["assigned_to_email"], "new": None}
                    diff["assigned_to_name"] = {"old": asset["assigned_to_name"], "new": None}
                    updates.append("assigned_to_email = NULL")
                    updates.append("assigned_to_name = NULL")

                new_location = actions.get("set_location")
                if new_location and new_location != asset["location"]:
                    diff["location"] = {"old": asset["location"], "new": new_location}
                    updates.append("location = ?")
                    params.append(new_location)

                # Update last ticket info
                updates.append("last_ticket_id = ?")
                params.append(ticket.ticket_key)
                updates.append("last_ticket_title = ?")
                params.append(ticket.title)

                # Append notes if configured
                append_notes = actions.get("append_notes")
                if append_notes:
                    formatted_note = append_notes.format(
                        ticket_key=ticket.ticket_key,
                        ticket_type=ticket.ticket_type,
                        timestamp=now_iso[:10]
                    )
                    current_notes = asset.get("notes") or ""
                    new_notes = f"{current_notes}\n[{now_iso[:10]}] {formatted_note}".strip()
                    diff["notes"] = {"old": current_notes, "new": new_notes}
                    updates.append("notes = ?")
                    params.append(new_notes)

                # Execute update
                params.append(asset["id"])
                cursor.execute(f"UPDATE assets SET {', '.join(updates)} WHERE id = ?", params)

                # Update rule statistics
                cursor.execute("""
                    UPDATE rules
                    SET execution_count = execution_count + 1, last_executed_at = ?
                    WHERE id = ?
                """, (now_iso, rule_id))

                action_summary = f"Updated asset {asset['asset_tag']} ({asset['model']}): {', '.join([f'{k} -> {v.get('new') if isinstance(v, dict) else v}' for k, v in diff.items()])}"
                
                # Write to sync_logs
                cursor.execute("""
                    INSERT INTO sync_logs (
                        timestamp, direction, rule_id, rule_name, source,
                        ticket_id, ticket_title, asset_id, asset_tag, serial_number,
                        action_summary, diff_json, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    now_iso, "ticket_to_asset", rule_id, rule_name, ticket.source,
                    ticket.ticket_key, ticket.title, asset["id"], asset["asset_tag"],
                    asset["serial_number"], action_summary, json.dumps(diff), "success"
                ))
                last_log_id = cursor.lastrowid

                matched_rules.append(rule_name)
                affected_assets.append(f"{asset['asset_tag']} ({asset['model']})")
                actions_taken.append(action_summary)

        if matched_rules:
            return WebhookSyncResult(
                status="success",
                matched_rules=matched_rules,
                affected_assets=affected_assets,
                actions_taken=actions_taken,
                log_id=last_log_id,
                message=f"Synced successfully: Triggered {len(matched_rules)} rule(s) affecting {len(affected_assets)} asset(s)."
            )
        else:
            return WebhookSyncResult(
                status="skipped",
                matched_rules=[],
                affected_assets=[],
                actions_taken=[],
                log_id=last_log_id,
                message="No active rules matched the incoming ticket criteria."
            )
