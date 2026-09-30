-- OBSIDIAN NEXUS — Enterprise Database Schema
-- PostgreSQL + TimescaleDB Extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizações (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'ENTERPRISE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Métrica de Séries Temporais de Faturamento & KPI (TimescaleDB)
CREATE TABLE IF NOT EXISTS metrics_time_series (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    revenue_amount NUMERIC(15, 2) NOT NULL,
    active_users INT NOT NULL,
    conversion_rate NUMERIC(6, 4) NOT NULL,
    churn_rate NUMERIC(6, 4) NOT NULL,
    roi_percentage NUMERIC(8, 2) NOT NULL
);

-- Converter em Hypertable para indexação e agregação ultra-rápida
SELECT create_hypertable('metrics_time_series', 'time', if_not_exists => TRUE);

-- Tabela de Audit Log Imutável (Compliance LGPD / GDPR / SOC2)
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_uri VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON security_audit_logs(tenant_id, created_at DESC);
