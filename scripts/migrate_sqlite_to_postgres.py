import sys
import os
import sqlite3
import psycopg
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.config import settings

def migrate():
    sqlite_path = BASE_DIR / "backend" / "data" / "seamit.db"
    pg_url = settings.database_url

    print("=" * 70)
    print("   SeamIT: SQLite to PostgreSQL Production Data Migration")
    print(f" Source SQLite:     {sqlite_path}")
    print(f" Target PostgreSQL: {pg_url}")
    print("=" * 70)

    if not sqlite_path.exists():
        print(f"[INFO] No SQLite database found at {sqlite_path}. Nothing to migrate.")
        return

    if not pg_url.startswith(("postgresql://", "postgres://")):
        print("[ERROR] DATABASE_URL is not configured for PostgreSQL.")
        sys.exit(1)

    # 1. Connect to SQLite
    s_conn = sqlite3.connect(sqlite_path)
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    # 2. Connect to PostgreSQL
    p_conn = psycopg.connect(pg_url)
    p_cur = p_conn.cursor()

    # Disable foreign keys temporarily during migration
    p_cur.execute("SET session_replication_role = 'replica';")

    try:
        # A. Migrate Connectors
        s_cur.execute("SELECT * FROM connectors")
        connectors = s_cur.fetchall()
        for c in connectors:
            p_cur.execute("""
                INSERT INTO connectors (
                    id, name, is_enabled, base_url, api_key_or_token,
                    email_or_user, project_or_workspace_key, webhook_secret,
                    mock_mode, last_sync_at, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    is_enabled = EXCLUDED.is_enabled,
                    base_url = EXCLUDED.base_url,
                    api_key_or_token = EXCLUDED.api_key_or_token,
                    email_or_user = EXCLUDED.email_or_user,
                    project_or_workspace_key = EXCLUDED.project_or_workspace_key,
                    mock_mode = EXCLUDED.mock_mode,
                    last_sync_at = EXCLUDED.last_sync_at,
                    status = EXCLUDED.status;
            """, (
                c["id"], c["name"], bool(c["is_enabled"]), c["base_url"], c["api_key_or_token"],
                c["email_or_user"], c["project_or_workspace_key"], c["webhook_secret"],
                bool(c["mock_mode"]), c["last_sync_at"], c["status"]
            ))
        print(f"[PASS] Migrated {len(connectors)} connector configurations.")

        # B. Migrate Rules
        s_cur.execute("SELECT * FROM rules")
        rules = s_cur.fetchall()
        for r in rules:
            p_cur.execute("""
                INSERT INTO rules (
                    id, name, description, source, direction, event_type,
                    conditions_json, actions_json, is_enabled, execution_count,
                    last_executed_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    conditions_json = EXCLUDED.conditions_json,
                    actions_json = EXCLUDED.actions_json,
                    is_enabled = EXCLUDED.is_enabled,
                    execution_count = EXCLUDED.execution_count,
                    last_executed_at = EXCLUDED.last_executed_at;
            """, (
                r["id"], r["name"], r["description"], r["source"], r["direction"], r["event_type"],
                r["conditions_json"] or "{}", r["actions_json"] or "{}",
                bool(r["is_enabled"]), r["execution_count"], r["last_executed_at"], r["created_at"]
            ))
        print(f"[PASS] Migrated {len(rules)} automation rules.")

        # C. Migrate Assets
        s_cur.execute("SELECT * FROM assets")
        assets = s_cur.fetchall()
        for a in assets:
            p_cur.execute("""
                INSERT INTO assets (
                    id, asset_tag, serial_number, model, category,
                    assigned_to_email, assigned_to_name, department, location,
                    status, purchase_date, warranty_expiry_date, eol_date,
                    notes, last_ticket_id, last_ticket_title, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (asset_tag) DO UPDATE SET
                    model = EXCLUDED.model,
                    category = EXCLUDED.category,
                    assigned_to_email = EXCLUDED.assigned_to_email,
                    assigned_to_name = EXCLUDED.assigned_to_name,
                    department = EXCLUDED.department,
                    location = EXCLUDED.location,
                    status = EXCLUDED.status,
                    notes = EXCLUDED.notes,
                    last_ticket_id = EXCLUDED.last_ticket_id,
                    last_ticket_title = EXCLUDED.last_ticket_title,
                    updated_at = EXCLUDED.updated_at;
            """, (
                a["id"], a["asset_tag"], a["serial_number"], a["model"], a["category"],
                a["assigned_to_email"], a["assigned_to_name"], a["department"], a["location"],
                a["status"], a["purchase_date"], a["warranty_expiry_date"], a["eol_date"],
                a["notes"], a["last_ticket_id"], a["last_ticket_title"], a["created_at"], a["updated_at"]
            ))
        print(f"[PASS] Migrated {len(assets)} assets inventory records.")

        # Reset assets sequence
        p_cur.execute("SELECT setval(pg_get_serial_sequence('assets', 'id'), COALESCE(MAX(id), 1)) FROM assets;")

        # D. Migrate Sync Logs
        s_cur.execute("SELECT * FROM sync_logs")
        logs = s_cur.fetchall()
        for l in logs:
            p_cur.execute("""
                INSERT INTO sync_logs (
                    id, timestamp, direction, rule_id, rule_name, source,
                    ticket_id, ticket_title, asset_id, asset_tag, serial_number,
                    action_summary, diff_json, status, error_message
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (
                l["id"], l["timestamp"], l["direction"], l["rule_id"], l["rule_name"], l["source"],
                l["ticket_id"], l["ticket_title"], l["asset_id"], l["asset_tag"], l["serial_number"],
                l["action_summary"], l["diff_json"] or "{}", l["status"], l["error_message"]
            ))
        print(f"[PASS] Migrated {len(logs)} audit trail entries.")

        # Reset sync_logs sequence
        p_cur.execute("SELECT setval(pg_get_serial_sequence('sync_logs', 'id'), COALESCE(MAX(id), 1)) FROM sync_logs;")

        # Re-enable foreign keys
        p_cur.execute("SET session_replication_role = 'origin';")
        p_conn.commit()

        print("\n[SUCCESS] SQLite to PostgreSQL Migration completed successfully!")

    except Exception as e:
        p_conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        s_conn.close()
        p_conn.close()

if __name__ == "__main__":
    migrate()
