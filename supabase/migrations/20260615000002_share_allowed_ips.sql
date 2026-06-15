-- Migration: add share_allowed_ips to Prv_projects
-- Comma-separated list of allowed IPs for internal-only share links.
-- Managed via the dashboard UI (Project Settings → Internal Network Only).
-- When share_internal_only=true and this column is non-null, overrides
-- the SHARE_INTERNAL_ALLOWED_IPS env var.

ALTER TABLE "Prv_projects"
  ADD COLUMN IF NOT EXISTS share_allowed_ips TEXT DEFAULT NULL;
