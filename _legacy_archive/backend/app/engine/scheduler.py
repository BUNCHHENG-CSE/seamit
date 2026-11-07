import asyncio
import json
from datetime import datetime, timezone, date
from typing import Any
from app.database import get_db
from app.connectors.jira_connector import JiraConnector
from app.connectors.freshservice_connector import FreshserviceConnector

class LifecycleScheduler:
    @classmethod
    async def run_lifecycle_sync(cls) -> dict[str, Any]:
        """
        Scans all assets against active asset_to_ticket rules.
        Creates proactive tickets in ITSM for warranty or EOL expiry.
        """
        today = date.today()
        now_iso = datetime.now(timezone.utc).isoformat()
        tickets_created = []

        with get_db() as conn:
            cursor = conn.cursor()

            # Load active asset_to_ticket rules
            cursor.execute("""
                SELECT * FROM rules
                WHERE is_enabled = TRUE AND direction = 'asset_to_ticket'
            """)
            rules = cursor.fetchall()

            # Load connector configs
            cursor.execute("SELECT * FROM connectors")
            connectors_dict = {row["id"]: dict(row) for row in cursor.fetchall()}

            for rule_row in rules:
                rule_id = rule_row["id"]
                rule_name = rule_row["name"]
                event_type = rule_row["event_type"]
                conditions = json.loads(rule_row["conditions_json"] or "{}")
                actions = json.loads(rule_row["actions_json"] or "{}")

                days_threshold = conditions.get("days_before_warranty", 60)
                allowed_statuses = conditions.get("asset_statuses", ["in_use"])
                destination_itsm = actions.get("destination_itsm", "jira")

                # Fetch matching assets
                cursor.execute("""
                    SELECT * FROM assets
                    WHERE status IN ({seq})
                    AND warranty_expiry_date IS NOT NULL
                    AND warranty_expiry_date != ''
                """.format(seq=','.join(['?'] * len(allowed_statuses))), allowed_statuses)
                assets = cursor.fetchall()

                for asset in assets:
                    try:
                        exp_date = date.fromisoformat(asset["warranty_expiry_date"][:10])
                        days_left = (exp_date - today).days

                        # Check if within window
                        if 0 <= days_left <= days_threshold:
                            # Verify if a ticket was already created for this warranty cycle
                            cursor.execute("""
                                SELECT id FROM sync_logs
                                WHERE asset_id = ?
                                AND direction = 'asset_to_ticket'
                                AND rule_id = ?
                                AND status = 'success'
                            """, (asset["id"], rule_id))
                            already_logged = cursor.fetchone()

                            if already_logged:
                                continue  # Already generated ticket for this asset & rule

                            # Build ticket summary and description
                            summary_template = actions.get("ticket_summary_template") or "Warranty Expiry ({days_left}d): {model} ({serial_number}) - {assigned_name}"
                            desc_template = actions.get("ticket_description_template") or (
                                "Automated SeamIT lifecycle alert:\n"
                                "Asset Tag: {asset_tag}\n"
                                "Model: {model}\n"
                                "Serial Number: {serial_number}\n"
                                "Current Assignee: {assigned_name} ({assigned_email})\n"
                                "Warranty Expiration Date: {warranty_date}\n"
                                "Days Remaining: {days_left}\n\n"
                                "Recommended Action: Initiate vendor warranty extension or schedule device refresh replacement."
                            )

                            format_vars = {
                                "asset_tag": asset["asset_tag"],
                                "model": asset["model"],
                                "serial_number": asset["serial_number"],
                                "assigned_name": asset["assigned_to_name"] or "Unassigned",
                                "assigned_email": asset["assigned_to_email"] or "N/A",
                                "warranty_date": asset["warranty_expiry_date"],
                                "days_left": days_left
                            }

                            ticket_summary = summary_template.format(**format_vars)
                            ticket_desc = desc_template.format(**format_vars)
                            ticket_type = actions.get("ticket_type", "Hardware Refresh")
                            priority = actions.get("ticket_priority", "Medium")

                            # Instantiate connector
                            conn_config = connectors_dict.get(destination_itsm, {
                                "id": destination_itsm,
                                "mock_mode": True
                            })
                            if destination_itsm == "freshservice":
                                connector = FreshserviceConnector(conn_config)
                            else:
                                connector = JiraConnector(conn_config)

                            # Create the ticket in the ITSM
                            ticket_res = await connector.create_ticket(
                                summary=ticket_summary,
                                description=ticket_desc,
                                ticket_type=ticket_type,
                                priority=priority
                            )

                            created_key = ticket_res.get("ticket_key", "UNKNOWN-KEY")

                            # Update asset with last ticket
                            cursor.execute("""
                                UPDATE assets
                                SET last_ticket_id = ?, last_ticket_title = ?, updated_at = ?
                                WHERE id = ?
                            """, (created_key, ticket_summary, now_iso, asset["id"]))

                            # Update rule execution count
                            cursor.execute("""
                                UPDATE rules
                                SET execution_count = execution_count + 1, last_executed_at = ?
                                WHERE id = ?
                            """, (now_iso, rule_id))

                            # Create sync log
                            action_summary = f"Generated proactive draft ticket {created_key} in {destination_itsm.upper()} for asset {asset['asset_tag']} (Warranty expires in {days_left} days)"
                            cursor.execute("""
                                INSERT INTO sync_logs (
                                    timestamp, direction, rule_id, rule_name, source,
                                    ticket_id, ticket_title, asset_id, asset_tag, serial_number,
                                    action_summary, diff_json, status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                now_iso, "asset_to_ticket", rule_id, rule_name, destination_itsm,
                                created_key, ticket_summary, asset["id"], asset["asset_tag"],
                                asset["serial_number"], action_summary,
                                json.dumps({"ticket_response": ticket_res, "days_left": days_left}),
                                "success"
                            ))

                            tickets_created.append({
                                "asset_tag": asset["asset_tag"],
                                "ticket_key": created_key,
                                "summary": ticket_summary,
                                "destination": destination_itsm
                            })
                    except Exception as e:
                        # Log error in sync log
                        cursor.execute("""
                            INSERT INTO sync_logs (
                                timestamp, direction, rule_id, rule_name, source,
                                asset_id, asset_tag, action_summary, status, error_message
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            now_iso, "asset_to_ticket", rule_id, rule_name, destination_itsm,
                            asset["id"], asset["asset_tag"],
                            f"Failed creating proactive ticket for {asset['asset_tag']}",
                            "failed", str(e)
                        ))

        return {
            "success": True,
            "tickets_created_count": len(tickets_created),
            "tickets": tickets_created,
            "executed_at": now_iso
        }

async def background_scheduler_loop(interval_seconds: int = 300):
    """Periodic background task that runs lifecycle checks."""
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await LifecycleScheduler.run_lifecycle_sync()
        except asyncio.CancelledError:
            break
        except Exception:
            pass  # Keep loop alive
