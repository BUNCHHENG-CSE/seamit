import json
from datetime import datetime, timezone, date, timedelta
from typing import Any, Optional
from app.database import get_db
from app.connectors.jira_connector import JiraConnector
from app.connectors.freshservice_connector import FreshserviceConnector
from app.connectors.zendesk_connector import ZendeskConnector

class DiscrepancyRadar:
    @classmethod
    def scan_discrepancies(cls) -> dict[str, Any]:
        today = date.today()
        discrepancies: list[dict[str, Any]] = []

        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Check for Orphaned In-Use Assets (No assigned owner)
            cursor.execute("""
                SELECT * FROM assets
                WHERE status = 'in_use'
                AND (assigned_to_email IS NULL OR assigned_to_email = '')
                AND (assigned_to_name IS NULL OR assigned_to_name = '')
            """)
            orphaned = cursor.fetchall()
            for r in orphaned:
                discrepancies.append({
                    "id": f"disc_orphan_{r['id']}",
                    "severity": "HIGH",
                    "category": "Compliance Risk (Ghost Asset)",
                    "title": f"In-Use device without assigned employee",
                    "description": f"Asset {r['asset_tag']} ({r['model']}, S/N: {r['serial_number']}) is marked 'In Use' in the asset table, but has no recorded owner or email.",
                    "asset_id": r["id"],
                    "asset_tag": r["asset_tag"],
                    "serial_number": r["serial_number"],
                    "ticket_id": r["last_ticket_id"],
                    "consequence": "Fails SOC 2 / ISO 27001 endpoint custody controls; untracked device during offboarding.",
                    "dollar_risk": 1500,
                    "suggested_action": "Assign employee or transition status to 'Available / In Stock'."
                })

            # 2. Check for Imminent Unprotected Warranty Expiration (within 60 days)
            cursor.execute("""
                SELECT * FROM assets
                WHERE status = 'in_use'
                AND warranty_expiry_date IS NOT NULL
                AND warranty_expiry_date != ''
            """)
            warrantied_assets = cursor.fetchall()
            for r in warrantied_assets:
                try:
                    exp_date = date.fromisoformat(r["warranty_expiry_date"][:10])
                    days_left = (exp_date - today).days
                    if 0 <= days_left <= 60:
                        # Check if a refresh ticket exists
                        has_refresh_ticket = bool(
                            r["last_ticket_title"] and ("refresh" in r["last_ticket_title"].lower() or "warranty" in r["last_ticket_title"].lower())
                        )
                        if not has_refresh_ticket:
                            discrepancies.append({
                                "id": f"disc_warranty_{r['id']}",
                                "severity": "MEDIUM",
                                "category": "Warranty Expiration (Unprotected)",
                                "title": f"Warranty expires in {days_left} days",
                                "description": f"Asset {r['asset_tag']} ({r['model']}, assigned to {r['assigned_to_name'] or 'Unknown'}) warranty expires on {r['warranty_expiry_date']} without an active refresh ticket.",
                                "asset_id": r["id"],
                                "asset_tag": r["asset_tag"],
                                "serial_number": r["serial_number"],
                                "ticket_id": None,
                                "consequence": "Device failure after expiration leads to $800+ out-of-pocket repair costs and employee downtime.",
                                "dollar_risk": 850,
                                "suggested_action": "Trigger draft hardware refresh ticket in Jira / Freshservice."
                            })
                    elif days_left < 0:
                        # Already expired
                        discrepancies.append({
                            "id": f"disc_expired_{r['id']}",
                            "severity": "HIGH",
                            "category": "Expired Asset in Production",
                            "title": f"Asset operating past warranty ({abs(days_left)} days overdue)",
                            "description": f"Asset {r['asset_tag']} ({r['model']}) expired on {r['warranty_expiry_date']} and remains deployed to {r['assigned_to_name'] or 'Unknown'}.",
                            "asset_id": r["id"],
                            "asset_tag": r["asset_tag"],
                            "serial_number": r["serial_number"],
                            "ticket_id": None,
                            "consequence": "High failure rate, unpatchable hardware flaws, cyber insurance policy violation.",
                            "dollar_risk": 1200,
                            "suggested_action": "Initiate immediate lifecycle replacement."
                        })
                except ValueError:
                    pass

            # 3. Check for Zombie Repair Assets (in_repair for > 14 days or without recent ticket)
            cursor.execute("""
                SELECT * FROM assets
                WHERE status = 'in_repair'
            """)
            in_repair = cursor.fetchall()
            for r in in_repair:
                try:
                    updated_at_date = date.fromisoformat(r["updated_at"][:10])
                    days_in_repair = (today - updated_at_date).days
                    if days_in_repair >= 7:
                        discrepancies.append({
                            "id": f"disc_repair_{r['id']}",
                            "severity": "MEDIUM",
                            "category": "Zombie Repair Asset",
                            "title": f"Device in repair for {days_in_repair} days",
                            "description": f"Asset {r['asset_tag']} ({r['model']}) marked 'In Repair' with last ticket {r['last_ticket_id'] or 'None'}, but no status change recorded.",
                            "asset_id": r["id"],
                            "asset_tag": r["asset_tag"],
                            "serial_number": r["serial_number"],
                            "ticket_id": r["last_ticket_id"],
                            "consequence": "Device forgotten at vendor or sitting on IT shelf; causes premature duplicate purchasing.",
                            "dollar_risk": 1800,
                            "suggested_action": "Verify return from repair depot or return to 'Available' stock."
                        })
                except ValueError:
                    pass

            # 4. Check for Unlinked Ticket Ingestions in Sync Logs
            cursor.execute("""
                SELECT * FROM sync_logs
                WHERE status = 'skipped'
                AND error_message LIKE '%No matching asset%'
                ORDER BY id DESC LIMIT 5
            """)
            skipped_logs = cursor.fetchall()
            for sl in skipped_logs:
                discrepancies.append({
                    "id": f"disc_unlinked_log_{sl['id']}",
                    "severity": "HIGH",
                    "category": "Unlinked ITSM Ticket",
                    "title": f"Ticket {sl['ticket_id']} has no matching asset",
                    "description": f"ITSM Ticket '{sl['ticket_title']}' ({sl['ticket_id']}) triggered sync rule '{sl['rule_name']}', but no asset matched the serial, tag, or requester email.",
                    "asset_id": None,
                    "asset_tag": "UNKNOWN",
                    "serial_number": None,
                    "ticket_id": sl["ticket_id"],
                    "consequence": "Asset was serviced or retired without updating asset inventory (creates ghost discrepancy).",
                    "dollar_risk": 2000,
                    "suggested_action": "Manually associate ticket with asset tag or add device to inventory."
                })

            # Calculate stats
            total_discrepancies = len(discrepancies)
            high_severity_count = sum(1 for d in discrepancies if d["severity"] == "HIGH")
            total_dollar_risk = sum(d["dollar_risk"] for d in discrepancies)
            estimated_hours_saved = round(total_discrepancies * 2.5, 1)

            # Audit Readiness Score: 100 minus penalty
            audit_readiness_score = max(20, 100 - (high_severity_count * 15 + (total_discrepancies - high_severity_count) * 8))

            return {
                "discrepancies": discrepancies,
                "summary": {
                    "total_discrepancies": total_discrepancies,
                    "high_severity_count": high_severity_count,
                    "total_dollar_risk": total_dollar_risk,
                    "estimated_hours_saved": estimated_hours_saved,
                    "audit_readiness_score": audit_readiness_score,
                    "last_scanned_at": datetime.now(timezone.utc).isoformat()
                }
            }

    @classmethod
    async def remediate(
        cls,
        action: str,
        discrepancy_id: Optional[str] = None,
        asset_id: Optional[int] = None,
        target_status: Optional[str] = None,
        target_location: Optional[str] = None,
        assigned_to_name: Optional[str] = None,
        assigned_to_email: Optional[str] = None,
        ticket_id: Optional[str] = None
    ) -> dict[str, Any]:
        """
        Executes an atomic remediation action for a detected discrepancy,
        updating the asset inventory and generating an immutable audit record.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            cursor = conn.cursor()

            # Batch 1-Click: Remediate All Low-Hanging Discrepancies
            if action == "remediate_all_low_hanging":
                # 1. Orphaned In-Use Assets -> Set Available Stock
                cursor.execute("""
                    SELECT * FROM assets
                    WHERE status = 'in_use'
                    AND (assigned_to_email IS NULL OR assigned_to_email = '')
                    AND (assigned_to_name IS NULL OR assigned_to_name = '')
                """)
                orphaned = cursor.fetchall()
                remediated_count = 0

                for r in orphaned:
                    cursor.execute("""
                        UPDATE assets
                        SET status = 'available',
                            location = 'IT Storage Closet - Shelf B',
                            updated_at = ?
                        WHERE id = ?
                    """, (now_iso, r["id"]))

                    diff = {
                        "status": {"old": r["status"], "new": "available"},
                        "location": {"old": r["location"], "new": "IT Storage Closet - Shelf B"}
                    }
                    cursor.execute("""
                        INSERT INTO sync_logs (
                            timestamp, direction, rule_name, source,
                            asset_id, asset_tag, serial_number,
                            action_summary, diff_json, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        now_iso, "radar_remediation", "Auto-Remediation: Batch Orphan Fix", "discrepancy_radar",
                        r["id"], r["asset_tag"], r["serial_number"],
                        f"Auto-Remediated Ghost Asset {r['asset_tag']}: Moved to available stock in IT Storage Closet.",
                        json.dumps(diff), "success"
                    ))
                    remediated_count += 1

                # 2. Zombie Repair Assets (> 7 days) -> Mark Available
                cursor.execute("SELECT * FROM assets WHERE status = 'in_repair'")
                zombie_repairs = cursor.fetchall()
                today = date.today()
                for r in zombie_repairs:
                    try:
                        updated_at_date = date.fromisoformat(r["updated_at"][:10])
                        if (today - updated_at_date).days >= 7:
                            cursor.execute("""
                                UPDATE assets
                                SET status = 'available',
                                    location = 'IT Storage Closet - Shelf B',
                                    updated_at = ?
                                WHERE id = ?
                            """, (now_iso, r["id"]))

                            diff = {
                                "status": {"old": r["status"], "new": "available"},
                                "location": {"old": r["location"], "new": "IT Storage Closet - Shelf B"}
                            }
                            cursor.execute("""
                                INSERT INTO sync_logs (
                                    timestamp, direction, rule_name, source,
                                    asset_id, asset_tag, serial_number,
                                    action_summary, diff_json, status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                now_iso, "radar_remediation", "Auto-Remediation: Zombie Repair Return", "discrepancy_radar",
                                r["id"], r["asset_tag"], r["serial_number"],
                                f"Auto-Remediated Zombie Repair {r['asset_tag']}: Returned to available stock.",
                                json.dumps(diff), "success"
                            ))
                            remediated_count += 1
                    except Exception:
                        pass

                return {
                    "success": True,
                    "action": action,
                    "remediated_count": remediated_count,
                    "message": f"Successfully auto-remediated {remediated_count} ghost & zombie discrepancies!"
                }

            # Single Discrepancy Actions
            if not asset_id and discrepancy_id and discrepancy_id.startswith("disc_unlinked_log_"):
                # Handle unlinked log dismissal
                log_id = int(discrepancy_id.replace("disc_unlinked_log_", ""))
                cursor.execute("UPDATE sync_logs SET status = 'dismissed' WHERE id = ?", (log_id,))
                return {
                    "success": True,
                    "action": "dismiss_unlinked",
                    "message": f"Dismissed unlinked discrepancy log #{log_id}."
                }

            if not asset_id:
                raise ValueError("asset_id is required for asset remediation actions.")

            cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
            asset = cursor.fetchone()
            if not asset:
                raise ValueError(f"Asset with ID {asset_id} not found.")

            if action in ("set_available", "return_to_available"):
                new_status = "available"
                new_location = target_location or "IT Storage Closet - Shelf B"
                cursor.execute("""
                    UPDATE assets
                    SET status = ?,
                        location = ?,
                        assigned_to_name = '',
                        assigned_to_email = '',
                        updated_at = ?
                    WHERE id = ?
                """, (new_status, new_location, now_iso, asset_id))

                diff = {
                    "status": {"old": asset["status"], "new": new_status},
                    "location": {"old": asset["location"], "new": new_location},
                    "assigned_to_email": {"old": asset["assigned_to_email"], "new": None}
                }
                summary = f"Remediated discrepancy {discrepancy_id or ''}: Marked {asset['asset_tag']} as '{new_status}' in {new_location}."

            elif action == "set_pending_return":
                new_status = "pending_return"
                new_location = target_location or "IT Return Bay / Quarantine"
                cursor.execute("""
                    UPDATE assets
                    SET status = ?,
                        location = ?,
                        assigned_to_name = '',
                        assigned_to_email = '',
                        updated_at = ?
                    WHERE id = ?
                """, (new_status, new_location, now_iso, asset_id))

                diff = {
                    "status": {"old": asset["status"], "new": new_status},
                    "location": {"old": asset["location"], "new": new_location},
                    "assigned_to_email": {"old": asset["assigned_to_email"], "new": None}
                }
                summary = f"Remediated discrepancy: Marked {asset['asset_tag']} as 'pending_return' in {new_location}."

            elif action == "assign_owner":
                new_name = assigned_to_name or "Assigned Employee"
                new_email = assigned_to_email or "employee@acme-corp.com"
                cursor.execute("""
                    UPDATE assets
                    SET assigned_to_name = ?,
                        assigned_to_email = ?,
                        status = 'in_use',
                        updated_at = ?
                    WHERE id = ?
                """, (new_name, new_email, now_iso, asset_id))

                diff = {
                    "assigned_to_name": {"old": asset["assigned_to_name"], "new": new_name},
                    "assigned_to_email": {"old": asset["assigned_to_email"], "new": new_email}
                }
                summary = f"Remediated discrepancy: Assigned {asset['asset_tag']} to custodian {new_name} ({new_email})."

            elif action == "create_refresh_ticket":
                # Create ticket via active connector
                cursor.execute("SELECT * FROM connectors WHERE is_enabled = 1 ORDER BY id ASC")
                conn_row = cursor.fetchone()
                connector_cfg = dict(conn_row) if conn_row else {"mock_mode": True}

                conn_id = connector_cfg.get("id", "jira")
                if conn_id == "freshservice":
                    connector = FreshserviceConnector(connector_cfg)
                elif conn_id == "zendesk":
                    connector = ZendeskConnector(connector_cfg)
                else:
                    connector = JiraConnector(connector_cfg)

                ticket_summary = f"Hardware Refresh: {asset['model']} ({asset['asset_tag']}) - {asset['assigned_to_name'] or 'Unassigned'}"
                ticket_desc = f"Proactive refresh ticket created via Discrepancy Radar. Warranty expires: {asset['warranty_expiry_date']}."
                ticket_res = await connector.create_ticket(ticket_summary, ticket_desc, "Hardware Refresh", "Medium")

                t_key = ticket_res.get("ticket_key", "REFRESH-TICKET")
                cursor.execute("""
                    UPDATE assets
                    SET last_ticket_id = ?,
                        last_ticket_title = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (t_key, ticket_summary, now_iso, asset_id))

                diff = {
                    "last_ticket_id": {"old": asset["last_ticket_id"], "new": t_key},
                    "last_ticket_title": {"old": asset["last_ticket_title"], "new": ticket_summary}
                }
                summary = f"Proactive refresh ticket {t_key} created in {conn_id.upper()} for asset {asset['asset_tag']}."

            else:
                raise ValueError(f"Unsupported remediation action: '{action}'")

            # Record immutable audit log
            cursor.execute("""
                INSERT INTO sync_logs (
                    timestamp, direction, rule_name, source,
                    asset_id, asset_tag, serial_number,
                    action_summary, diff_json, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now_iso, "radar_remediation", "Discrepancy Radar Remediation", "discrepancy_radar",
                asset_id, asset["asset_tag"], asset["serial_number"],
                summary, json.dumps(diff), "success"
            ))

            return {
                "success": True,
                "action": action,
                "asset_id": asset_id,
                "message": summary
            }
