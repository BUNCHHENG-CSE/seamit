-- ==============================================================================
-- SeamIT - Production PostgreSQL Database Initialization DDL
-- Extensions, Optimized Table Schemas, Trigram Search, JSONB Indexes
-- ==============================================================================

-- 1. Performance & Search Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 2. Assets Inventory Table
CREATE TABLE IF NOT EXISTS assets (
    id BIGSERIAL PRIMARY KEY,
    asset_tag VARCHAR(64) UNIQUE NOT NULL,
    serial_number VARCHAR(128) NOT NULL,
    model VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'Laptop',
    assigned_to_email VARCHAR(255),
    assigned_to_name VARCHAR(255),
    department VARCHAR(128),
    location VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'in_use',
    purchase_date VARCHAR(32),
    warranty_expiry_date VARCHAR(32),
    eol_date VARCHAR(32),
    notes TEXT,
    last_ticket_id VARCHAR(64),
    last_ticket_title VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assets B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_email ON assets(assigned_to_email);
CREATE INDEX IF NOT EXISTS idx_assets_warranty ON assets(warranty_expiry_date);

-- Assets Partial Index for Active Production Devices
CREATE INDEX IF NOT EXISTS idx_assets_in_use ON assets(status) WHERE status = 'in_use';

-- Assets Trigram GIN Search Index (Fuzzy & Substring Search across tags, serials, and models)
CREATE INDEX IF NOT EXISTS idx_assets_trgm_search ON assets USING gin (
    (asset_tag || ' ' || serial_number || ' ' || model || ' ' || COALESCE(assigned_to_name, '') || ' ' || COALESCE(assigned_to_email, '')) gin_trgm_ops
);

-- 3. Automation Rules Table
CREATE TABLE IF NOT EXISTS rules (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(64) NOT NULL DEFAULT 'any',
    direction VARCHAR(32) NOT NULL DEFAULT 'ticket_to_asset',
    event_type VARCHAR(64) NOT NULL,
    conditions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    actions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    execution_count INT NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_lookup ON rules(direction, is_enabled, source, event_type);
CREATE INDEX IF NOT EXISTS idx_rules_conditions_gin ON rules USING gin (conditions_json);
CREATE INDEX IF NOT EXISTS idx_rules_actions_gin ON rules USING gin (actions_json);

-- 4. Sync Audit Trail Logs
CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    direction VARCHAR(32) NOT NULL,
    rule_id VARCHAR(128),
    rule_name VARCHAR(255),
    source VARCHAR(64) NOT NULL,
    ticket_id VARCHAR(64),
    ticket_title VARCHAR(500),
    asset_id BIGINT REFERENCES assets(id) ON DELETE SET NULL,
    asset_tag VARCHAR(64),
    serial_number VARCHAR(128),
    action_summary TEXT NOT NULL,
    diff_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON sync_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_ticket ON sync_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_logs_asset_composite ON sync_logs(asset_id, direction, status);
CREATE INDEX IF NOT EXISTS idx_logs_diff_gin ON sync_logs USING gin (diff_json);

-- 5. Connectors Configuration Table
CREATE TABLE IF NOT EXISTS connectors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    base_url VARCHAR(500) NOT NULL DEFAULT '',
    api_key_or_token TEXT NOT NULL DEFAULT '',
    email_or_user VARCHAR(255) NOT NULL DEFAULT '',
    project_or_workspace_key VARCHAR(64) NOT NULL DEFAULT '',
    webhook_secret VARCHAR(255) NOT NULL DEFAULT '',
    mock_mode BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'mock_active'
);

-- 6. Cached Ingested Tickets
CREATE TABLE IF NOT EXISTS cached_tickets (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(64) NOT NULL,
    ticket_key VARCHAR(64) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(64) NOT NULL,
    ticket_type VARCHAR(64) NOT NULL,
    requester_email VARCHAR(255),
    requester_name VARCHAR(255),
    serial_number VARCHAR(128),
    asset_tag VARCHAR(64),
    raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_key ON cached_tickets(ticket_key);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON cached_tickets(requester_email);

-- 7. Notifications Center Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'INFO',
    category VARCHAR(64) NOT NULL DEFAULT 'general',
    link_tab VARCHAR(64),
    is_read INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER trigger_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_tickets_updated_at
    BEFORE UPDATE ON cached_tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_column();
