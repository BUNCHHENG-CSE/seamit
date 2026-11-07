import json
from datetime import datetime, timezone, date, timedelta
from app.database import get_db

def seed_database(force: bool = False):
    today = date.today()
    now_iso = datetime.now(timezone.utc).isoformat()
    two_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    three_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=21)).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        if not force:
            cursor.execute("SELECT COUNT(*) as count FROM assets")
            if cursor.fetchone()["count"] > 0:
                # Ensure new connectors and notifications exist even in pre-existing DB
                cursor.execute("SELECT id FROM connectors WHERE id = 'zendesk'")
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO connectors (id, name, is_enabled, base_url, api_key_or_token, email_or_user, project_or_workspace_key, webhook_secret, mock_mode, last_sync_at, status)
                        VALUES ('zendesk', 'Zendesk Support Desk', 1, 'https://acme-corp.zendesk.com', 'zd_api_token_mock_881920', 'helpdesk@acme-corp.com', 'SUPPORT', 'whsec_zd_secret_mock_7712', 1, ?, 'mock_active')
                    """, (now_iso,))

                cursor.execute("SELECT id FROM connectors WHERE id = 'slack_alerts'")
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO connectors (id, name, is_enabled, base_url, api_key_or_token, email_or_user, project_or_workspace_key, webhook_secret, mock_mode, last_sync_at, status)
                        VALUES ('slack_alerts', 'Slack & Teams Alert Dispatcher', 1, 'https://hooks.slack.com/services/mock_webhook', '', '#it-operations', '', '', 1, ?, 'mock_active')
                    """, (now_iso,))

                cursor.execute("SELECT COUNT(*) as count FROM notifications")
                if cursor.fetchone()["count"] == 0:
                    cursor.execute("""
                        INSERT INTO notifications (title, message, severity, category, link_tab, is_read, created_at)
                        VALUES 
                        ('Discrepancy Radar Warning', '5 active discrepancies detected ($6,200 total dollar risk exposure). Quick remediation available in Discrepancy Radar.', 'HIGH', 'discrepancy', 'radar', 0, ?),
                        ('Zendesk Integration Active', 'Zendesk Support connector is enabled in Mock Mode. Ready for inbound webhooks and ticket generation.', 'INFO', 'connector', 'connectors', 0, ?),
                        ('SOC 2 Readiness Benchmark', 'Current audit readiness score is at 53%. Remediate ghost assets to reach 90%+ compliance.', 'MEDIUM', 'compliance', 'radar', 0, ?)
                    """, (now_iso, now_iso, now_iso))

                print("Database already contains data. Updated connectors and notifications.")
                return
        else:
            cursor.execute("DELETE FROM sync_logs;")
            cursor.execute("DELETE FROM cached_tickets;")
            cursor.execute("DELETE FROM assets;")
            cursor.execute("DELETE FROM rules;")
            cursor.execute("DELETE FROM connectors;")
            cursor.execute("DELETE FROM notifications;")

        print("Seeding initial data for SMB ITSM-ITAM Seam Filler...")

        # 1. Seed Connectors
        connectors_data = [
            (
                "jira",
                "Jira Service Management (JSM)",
                True,
                "https://acme-corp.atlassian.net",
                "mock_jira_api_token_9921",
                "it-admin@acme-corp.com",
                "ITSM",
                "whsec_jira_secret_mock_9921",
                True,
                now_iso,
                "mock_active"
            ),
            (
                "freshservice",
                "Freshservice Service Desk",
                True,
                "https://acme-corp.freshservice.com",
                "fresh_api_key_example_847192",
                "servicedesk@acme-corp.com",
                "IT",
                "whsec_fs_secret_mock_3310",
                True,
                now_iso,
                "mock_active"
            ),
            (
                "zendesk",
                "Zendesk Support Desk",
                True,
                "https://acme-corp.zendesk.com",
                "zd_api_token_mock_881920",
                "helpdesk@acme-corp.com",
                "SUPPORT",
                "whsec_zd_secret_mock_7712",
                True,
                now_iso,
                "mock_active"
            ),
            (
                "slack_alerts",
                "Slack & Teams Alert Dispatcher",
                True,
                "https://hooks.slack.com/services/mock_webhook",
                "",
                "#it-operations",
                "",
                "",
                True,
                now_iso,
                "mock_active"
            )
        ]
        cursor.executemany("""
            INSERT INTO connectors (
                id, name, is_enabled, base_url, api_key_or_token,
                email_or_user, project_or_workspace_key, webhook_secret,
                mock_mode, last_sync_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, connectors_data)

        # 2. Seed Default Best-Practice SMB Rules
        rules_data = [
            (
                "rule_offboarding_return",
                "Offboarding Ticket Resolved -> Mark Pending Return",
                "When HR or IT resolves an employee offboarding ticket, automatically mark their assigned laptop as 'pending_return' and unassign the user.",
                "any",
                "ticket_to_asset",
                "ticket_resolved",
                json.dumps({
                    "ticket_types": ["Offboarding", "Employee Exit", "Termination"],
                    "ticket_statuses": ["Resolved", "Closed", "Done", "Completed"],
                    "title_keywords": []
                }),
                json.dumps({
                    "set_asset_status": "pending_return",
                    "clear_assignee": True,
                    "set_location": "IT Quarantine / Return Bay",
                    "append_notes": "Automated offboarding return initiated via ticket {ticket_key}."
                }),
                True, 14, now_iso, now_iso
            ),
            (
                "rule_device_repair_start",
                "Hardware Repair Ticket -> Set In Repair",
                "When a repair or broken screen ticket is in progress, automatically transition asset status to 'in_repair'.",
                "any",
                "ticket_to_asset",
                "ticket_updated",
                json.dumps({
                    "ticket_types": ["Repair", "Hardware Issue", "Broken Device"],
                    "ticket_statuses": ["In Progress", "Investigating", "Waiting on Vendor"],
                    "title_keywords": ["screen", "battery", "repair", "liquid", "keyboard", "broken"]
                }),
                json.dumps({
                    "set_asset_status": "in_repair",
                    "clear_assignee": False,
                    "set_location": "IT Repair Depot / Vendor",
                    "append_notes": "Sent to repair bench under ticket {ticket_key}."
                }),
                True, 9, now_iso, now_iso
            ),
            (
                "rule_device_repair_closed",
                "Repair Ticket Resolved -> Transition to Stock / Available",
                "When a device repair ticket is marked resolved, automatically return the asset to 'available' stock in the IT closet.",
                "any",
                "ticket_to_asset",
                "ticket_resolved",
                json.dumps({
                    "ticket_types": ["Repair", "Hardware Issue", "Broken Device"],
                    "ticket_statuses": ["Resolved", "Closed", "Done"]
                }),
                json.dumps({
                    "set_asset_status": "available",
                    "clear_assignee": True,
                    "set_location": "IT Storage Closet - Shelf B",
                    "append_notes": "Repair completed under ticket {ticket_key}. Ready for redeployment."
                }),
                True, 7, now_iso, now_iso
            ),
            (
                "rule_device_replacement",
                "Hardware Replacement Ticket -> Retire Old Asset",
                "When a device replacement is completed, automatically mark the replaced hardware as 'retired' to prevent ghost assets.",
                "any",
                "ticket_to_asset",
                "ticket_resolved",
                json.dumps({
                    "ticket_types": ["Hardware Replacement", "Device Upgrade"],
                    "ticket_statuses": ["Resolved", "Closed", "Done"]
                }),
                json.dumps({
                    "set_asset_status": "retired",
                    "clear_assignee": True,
                    "set_location": "IT E-Waste / Recycling Staging",
                    "append_notes": "Asset retired and decommissioned per replacement ticket {ticket_key}."
                }),
                True, 12, now_iso, now_iso
            ),
            (
                "rule_device_stolen_lost",
                "Lost/Stolen Device Ticket -> Flag Lost & Clear Custody",
                "Instantly flags asset as 'lost_stolen' and alerts compliance logging when reported stolen.",
                "any",
                "ticket_to_asset",
                "ticket_resolved",
                json.dumps({
                    "ticket_types": ["Security Incident", "Lost Device"],
                    "ticket_statuses": ["Resolved", "Closed", "Open", "In Progress"],
                    "title_keywords": ["stolen", "lost", "theft", "missing"]
                }),
                json.dumps({
                    "set_asset_status": "lost_stolen",
                    "clear_assignee": True,
                    "set_location": "Unreachable / Stolen",
                    "append_notes": "CRITICAL: Reported lost/stolen in ticket {ticket_key}. Endpoint remote wipe triggered."
                }),
                True, 3, now_iso, now_iso
            ),
            (
                "rule_proactive_warranty_refresh",
                "Warranty Nearing Expiry (<= 60 days) -> Generate JSM Ticket",
                "Automated 2-way sync: Detects devices approaching warranty expiration and generates proactive draft tickets in Jira Service Management.",
                "warranty_scheduler",
                "asset_to_ticket",
                "warranty_expiring",
                json.dumps({
                    "days_before_warranty": 60,
                    "asset_statuses": ["in_use"]
                }),
                json.dumps({
                    "create_ticket": True,
                    "destination_itsm": "jira",
                    "ticket_type": "Hardware Refresh",
                    "ticket_priority": "Medium",
                    "ticket_summary_template": "Hardware Refresh Needed: {model} ({serial_number}) - {assigned_name}",
                    "ticket_description_template": "Automated Lifecycle Alert from SeamIT:\nDevice: {model}\nSerial: {serial_number}\nAsset Tag: {asset_tag}\nAssignee: {assigned_name} ({assigned_email})\nWarranty Expiration: {warranty_date} ({days_left} days remaining).\nAction: Review renewal or deploy replacement."
                }),
                True, 5, now_iso, now_iso
            )
        ]

        cursor.executemany("""
            INSERT INTO rules (
                id, name, description, source, direction, event_type,
                conditions_json, actions_json, is_enabled, execution_count,
                last_executed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, rules_data)

        # 3. Seed Realistic SMB Assets (MacBooks, Dells, ThinkPads)
        # Dates calculated relative to today
        warranty_soon_28d = (today + timedelta(days=28)).isoformat()
        warranty_soon_45d = (today + timedelta(days=45)).isoformat()
        warranty_past_12d = (today - timedelta(days=12)).isoformat()
        warranty_safe_1y = (today + timedelta(days=365)).isoformat()
        warranty_safe_2y = (today + timedelta(days=730)).isoformat()

        eol_safe_3y = (today + timedelta(days=1095)).isoformat()
        eol_soon_50d = (today + timedelta(days=50)).isoformat()

        assets_data = [
            (
                "ASSET-1001",
                "C02G1234MD6R",
                "MacBook Pro 14\" M3 Pro (36GB)",
                "Laptop",
                "sarah.connor@acme-corp.com",
                "Sarah Connor",
                "Engineering",
                "HQ - Floor 3",
                "in_use",
                "2024-03-15",
                warranty_safe_2y,
                eol_safe_3y,
                "Primary dev machine. MDM enrolled with Jamf Pro.",
                "JSM-9402",
                "Employee Onboarding Setup - Sarah Connor",
                now_iso, now_iso
            ),
            (
                "ASSET-1002",
                "89XYZ42",
                "Dell Latitude 5540 i7-1365U",
                "Laptop",
                "marcus.vance@acme-corp.com",
                "Marcus Vance",
                "Sales",
                "Remote - Chicago",
                "in_use",
                "2023-11-10",
                warranty_soon_28d,  # Triggers warranty discrepancy / proactive ticket!
                eol_safe_3y,
                "Sales field laptop with Dell ProSupport Plus.",
                "JSM-8812",
                "VPN Access Request",
                now_iso, now_iso
            ),
            (
                "ASSET-1003",
                "PF4289KL",
                "Lenovo ThinkPad T14s Gen 4",
                "Laptop",
                "alex.miller@acme-corp.com",
                "Alex Miller",
                "Product",
                "IT Repair Depot / Vendor",
                "in_repair",
                "2024-01-20",
                warranty_safe_1y,
                eol_safe_3y,
                "Sent to Lenovo Depot for cracked bezel & screen flicker.",
                "FS-2041",
                "MacBook Pro broken screen repair",
                three_weeks_ago, three_weeks_ago  # > 14 days in repair (Triggers Zombie alert!)
            ),
            (
                "ASSET-1004",
                "C02FL988MD6S",
                "MacBook Air 15\" M2 (16GB)",
                "Laptop",
                "elena.rostova@acme-corp.com",
                "Elena Rostova",
                "Finance",
                "HQ - Floor 4",
                "in_use",
                "2023-08-14",
                warranty_soon_45d,
                eol_soon_50d,  # Approaching EOL
                "Executive finance device.",
                "FS-1903",
                "Excel Add-in License Setup",
                now_iso, now_iso
            ),
            (
                "ASSET-1005",
                "37BC901",
                "Dell OptiPlex 7090 Micro",
                "Desktop",
                None,  # No user assigned (Ghost Asset compliance risk!)
                None,
                "Operations",
                "HQ - Floor 1 Server Room",
                "in_use",
                "2022-05-10",
                warranty_safe_1y,
                eol_safe_3y,
                "Shared utility desktop. Missing named custodian in inventory.",
                None,
                None,
                now_iso, now_iso
            ),
            (
                "ASSET-1006",
                "5CD32049XP",
                "HP EliteBook 840 G9",
                "Laptop",
                None,
                None,
                "IT Operations",
                "IT Storage Closet - Shelf B",
                "available",
                "2024-04-01",
                warranty_safe_2y,
                eol_safe_3y,
                "Clean imaged spare ready for new hire deployment.",
                "JSM-9120",
                "Spare Laptop Restock & Re-image",
                now_iso, now_iso
            ),
            (
                "ASSET-1007",
                "C02DK771MD6T",
                "MacBook Pro 16\" M1 Max (64GB)",
                "Laptop",
                "david.chen@acme-corp.com",
                "David Chen",
                "Engineering",
                "Remote - Seattle",
                "pending_return",
                "2022-09-18",
                warranty_past_12d,  # Past warranty
                eol_soon_50d,
                "Offboarding initiated. Prepaid FedEx return box dispatched.",
                "JSM-9831",
                "Employee Offboarding - David Chen",
                two_weeks_ago, two_weeks_ago
            ),
            (
                "ASSET-1008",
                "98KJL10",
                "Dell Latitude 7420 i5-1145G7",
                "Laptop",
                "lisa.ray@acme-corp.com",
                "Lisa Ray",
                "Marketing",
                "HQ - Floor 2",
                "in_use",
                "2021-10-15",
                warranty_past_12d,  # Expired warranty in production!
                eol_safe_3y,
                "Legacy marketing laptop. Requires replacement planning.",
                "FS-2104",
                "Figma Adobe CC performance issues",
                now_iso, now_iso
            ),
            (
                "ASSET-1009",
                "8K290X1",
                "Dell Latitude 5430",
                "Laptop",
                None,
                None,
                "IT Operations",
                "IT E-Waste / Recycling Staging",
                "retired",
                "2020-04-12",
                "2023-04-12",
                "2025-04-12",
                "Depreciated & sanitized according to NIST 800-88 guidelines.",
                "JSM-8419",
                "Hardware Decommissioning Request",
                three_weeks_ago, three_weeks_ago
            ),
            (
                "ASSET-1010",
                "C02E9043MD6Q",
                "MacBook Air 13\" M1",
                "Laptop",
                None,
                None,
                "Executive",
                "Unreachable / Stolen",
                "lost_stolen",
                "2021-06-20",
                "2024-06-20",
                "2025-06-20",
                "Reported stolen from car trunk during business travel. Remote erased via Apple Business Manager.",
                "JSM-9512",
                "STOLEN LAPTOP REPORT - Remote Lock",
                two_weeks_ago, two_weeks_ago
            )
        ]

        cursor.executemany("""
            INSERT INTO assets (
                asset_tag, serial_number, model, category,
                assigned_to_email, assigned_to_name, department, location,
                status, purchase_date, warranty_expiry_date, eol_date,
                notes, last_ticket_id, last_ticket_title, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, assets_data)

        # 4. Seed Initial Sync Logs
        def get_id(tag: str):
            cursor.execute("SELECT id FROM assets WHERE asset_tag = ?", (tag,))
            row = cursor.fetchone()
            return row["id"] if row else None

        id_1007 = get_id("ASSET-1007")
        id_1010 = get_id("ASSET-1010")
        id_1003 = get_id("ASSET-1003")

        logs_data = [
            (
                now_iso,
                "ticket_to_asset",
                "rule_offboarding_return",
                "Offboarding Ticket Resolved -> Mark Pending Return",
                "jira",
                "JSM-9831",
                "Employee Offboarding - David Chen",
                id_1007,
                "ASSET-1007",
                "C02DK771MD6T",
                "Changed status from 'in_use' to 'pending_return'; unassigned david.chen@acme-corp.com; set location to 'IT Quarantine / Return Bay'",
                json.dumps({
                    "status": {"old": "in_use", "new": "pending_return"},
                    "assigned_to_email": {"old": "david.chen@acme-corp.com", "new": None},
                    "location": {"old": "Remote - Seattle", "new": "IT Quarantine / Return Bay"}
                }),
                "success",
                None
            ),
            (
                two_weeks_ago,
                "ticket_to_asset",
                "rule_device_stolen_lost",
                "Lost/Stolen Device Ticket -> Flag Lost & Clear Custody",
                "jira",
                "JSM-9512",
                "STOLEN LAPTOP REPORT - Remote Lock",
                id_1010,
                "ASSET-1010",
                "C02E9043MD6Q",
                "Marked asset 'lost_stolen', cleared assignee, added security audit note",
                json.dumps({
                    "status": {"old": "in_use", "new": "lost_stolen"},
                    "location": {"old": "HQ - Floor 5", "new": "Unreachable / Stolen"}
                }),
                "success",
                None
            ),
            (
                three_weeks_ago,
                "ticket_to_asset",
                "rule_device_repair_start",
                "Hardware Repair Ticket -> Set In Repair",
                "freshservice",
                "FS-2041",
                "MacBook Pro broken screen repair",
                id_1003,
                "ASSET-1003",
                "PF4289KL",
                "Changed status from 'in_use' to 'in_repair'; set location to 'IT Repair Depot / Vendor'",
                json.dumps({
                    "status": {"old": "in_use", "new": "in_repair"},
                    "location": {"old": "HQ - Floor 3", "new": "IT Repair Depot / Vendor"}
                }),
                "success",
                None
            )
        ]

        cursor.executemany("""
            INSERT INTO sync_logs (
                timestamp, direction, rule_id, rule_name, source,
                ticket_id, ticket_title, asset_id, asset_tag, serial_number,
                action_summary, diff_json, status, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, logs_data)

        cursor.execute("SELECT COUNT(*) as count FROM notifications")
        if cursor.fetchone()["count"] == 0:
            cursor.execute("""
                INSERT INTO notifications (title, message, severity, category, link_tab, is_read, created_at)
                VALUES 
                ('Discrepancy Radar Warning', '5 active discrepancies detected ($6,200 total dollar risk exposure). Quick remediation available in Discrepancy Radar.', 'HIGH', 'discrepancy', 'radar', 0, ?),
                ('Zendesk Integration Active', 'Zendesk Support connector is enabled in Mock Mode. Ready for inbound webhooks and ticket generation.', 'INFO', 'connector', 'connectors', 0, ?),
                ('SOC 2 Readiness Benchmark', 'Current audit readiness score is at 53%. Remediate ghost assets to reach 90%+ compliance.', 'MEDIUM', 'compliance', 'radar', 0, ?)
            """, (now_iso, now_iso, now_iso))

        print("Seeding completed successfully!")

if __name__ == "__main__":
    from app.database import init_db
    init_db()
    seed_database(force=True)
