import os
import re
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Generator, Any, Optional

from app.config import settings

# Track if using PostgreSQL
_is_pg = settings.database_url.startswith(("postgresql://", "postgres://"))
_pg_pool = None

import atexit

def close_pool():
    global _pg_pool
    if _pg_pool is not None:
        try:
            _pg_pool.close(timeout=2.0)
        except Exception:
            pass

atexit.register(close_pool)

if _is_pg:
    try:
        import psycopg
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool

        _pg_pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=2,
            max_size=20,
            timeout=30.0,
            open=True,
            kwargs={"row_factory": dict_row}
        )
    except Exception as e:
        print(f"[WARNING] Failed to initialize PostgreSQL pool: {e}. Falling back to SQLite.")
        _is_pg = False

def is_postgres() -> bool:
    return _is_pg

def get_db_path() -> str:
    url = settings.database_url
    if url.startswith("sqlite:///"):
        url = url[len("sqlite:///"):]
    elif url.startswith("sqlite://"):
        url = url[len("sqlite://"):]
    
    p = Path(url)
    if not p.is_absolute():
        base_dir = Path(__file__).resolve().parent.parent
        data_dir = base_dir / "data"
        if (base_dir.parent / p).exists():
            p = base_dir.parent / p
        elif (data_dir / p.name).exists():
            p = data_dir / p.name
        elif (base_dir / p).exists():
            p = base_dir / p
        else:
            p = data_dir / p.name
    return str(p.resolve())


def convert_placeholders(sql: str) -> str:
    """Converts SQLite '?' parameter placeholders to PostgreSQL '%s'."""
    # Convert ? to %s
    return sql.replace("?", "%s")

def format_row(row: Any) -> Optional[dict[str, Any]]:
    """Normalizes database row into a standard dict with ISO-formatted dates."""
    if row is None:
        return None
    d = dict(row)
    for k, v in list(d.items()):
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
        elif isinstance(v, dict) and k.endswith("_json"):
            # Already parsed JSONB in Postgres, encode back to string if needed by legacy parsers
            d[k] = json.dumps(v)
    return d

class PostgresCursorWrapper:
    """Wraps psycopg cursor to provide SQLite-compatible API (lastrowid, row dicts, etc.)."""
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    def execute(self, query: str, params: Optional[Any] = None):
        pg_query = convert_placeholders(query.strip())
        is_insert = pg_query.upper().startswith("INSERT INTO") and "RETURNING" not in pg_query.upper()

        if is_insert:
            # Append RETURNING id to capture lastrowid
            pg_query = f"{pg_query.rstrip(';')} RETURNING id;"

        # Format params: convert dicts/lists in params to JSON strings for jsonb/text fields
        if params is not None:
            clean_params = []
            for p in params:
                if isinstance(p, (dict, list)):
                    clean_params.append(json.dumps(p))
                else:
                    clean_params.append(p)
            self._cursor.execute(pg_query, clean_params)
        else:
            self._cursor.execute(pg_query)

        if is_insert:
            try:
                row = self._cursor.fetchone()
                if row:
                    self.lastrowid = row.get("id") if isinstance(row, dict) else row[0]
            except Exception:
                pass

        return self

    def executemany(self, query: str, params_seq):
        pg_query = convert_placeholders(query.strip())
        clean_seq = []
        for params in params_seq:
            clean_params = []
            for p in params:
                if isinstance(p, (dict, list)):
                    clean_params.append(json.dumps(p))
                else:
                    clean_params.append(p)
            clean_seq.append(clean_params)
        return self._cursor.executemany(pg_query, clean_seq)

    def fetchone(self):
        row = self._cursor.fetchone()
        return format_row(row)

    def fetchall(self):
        rows = self._cursor.fetchall()
        return [format_row(r) for r in rows]

    @property
    def rowcount(self):
        return self._cursor.rowcount

class PostgresConnectionWrapper:
    """Wraps psycopg Connection to provide a familiar cursor interface."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def execute(self, query: str, params: Optional[Any] = None):
        cur = self.cursor()
        return cur.execute(query, params)

@contextmanager
def get_db() -> Generator[Any, None, None]:
    if is_postgres():
        with _pg_pool.connection() as conn:
            wrapper = PostgresConnectionWrapper(conn)
            try:
                yield wrapper
                conn.commit()
            except Exception:
                conn.rollback()
                raise
    else:
        conn = sqlite3.connect(get_db_path(), timeout=20.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

def init_db():
    if is_postgres():
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT to_regclass('public.assets') as exists;")
            row = cursor.fetchone()
            if row and row.get("exists"):
                return  # Tables already initialized by Docker entrypoint

            init_sql_path = Path(__file__).resolve().parent.parent.parent / "docker" / "postgres" / "init.sql"
            if init_sql_path.exists():
                with open(init_sql_path, "r", encoding="utf-8") as f:
                    ddl = f.read()
                conn._conn.execute(ddl)
                conn.commit()
    else:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Assets Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_tag TEXT UNIQUE NOT NULL,
                serial_number TEXT NOT NULL,
                model TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Laptop',
                assigned_to_email TEXT,
                assigned_to_name TEXT,
                department TEXT,
                location TEXT,
                status TEXT NOT NULL DEFAULT 'in_use',
                purchase_date TEXT,
                warranty_expiry_date TEXT,
                eol_date TEXT,
                notes TEXT,
                last_ticket_id TEXT,
                last_ticket_title TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_warranty ON assets(warranty_expiry_date);")

            # Rules Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                source TEXT NOT NULL DEFAULT 'any',
                direction TEXT NOT NULL DEFAULT 'ticket_to_asset',
                event_type TEXT NOT NULL,
                conditions_json TEXT NOT NULL DEFAULT '{}',
                actions_json TEXT NOT NULL DEFAULT '{}',
                is_enabled INTEGER NOT NULL DEFAULT 1,
                execution_count INTEGER NOT NULL DEFAULT 0,
                last_executed_at TEXT,
                created_at TEXT NOT NULL
            );
            """)

            # Sync Audit Log Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                direction TEXT NOT NULL,
                rule_id TEXT,
                rule_name TEXT,
                source TEXT NOT NULL,
                ticket_id TEXT,
                ticket_title TEXT,
                asset_id INTEGER,
                asset_tag TEXT,
                serial_number TEXT,
                action_summary TEXT NOT NULL,
                diff_json TEXT NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'success',
                error_message TEXT,
                FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON sync_logs(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_ticket ON sync_logs(ticket_id);")

            # Connectors Configuration Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS connectors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                base_url TEXT NOT NULL DEFAULT '',
                api_key_or_token TEXT NOT NULL DEFAULT '',
                email_or_user TEXT NOT NULL DEFAULT '',
                project_or_workspace_key TEXT NOT NULL DEFAULT '',
                webhook_secret TEXT NOT NULL DEFAULT '',
                mock_mode INTEGER NOT NULL DEFAULT 1,
                last_sync_at TEXT,
                status TEXT NOT NULL DEFAULT 'mock_active'
            );
            """)

            # Notifications Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'INFO',
                category TEXT NOT NULL DEFAULT 'general',
                link_tab TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);")

            # Cached / Ingested Tickets
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS cached_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                ticket_key TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                ticket_type TEXT NOT NULL,
                requester_email TEXT,
                requester_name TEXT,
                serial_number TEXT,
                asset_tag TEXT,
                raw_payload_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_key ON cached_tickets(ticket_key);")
