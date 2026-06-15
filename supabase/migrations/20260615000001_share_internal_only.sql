-- Migration: add share_internal_only to Prv_projects
-- When true, the share link is only accessible from IPs listed in
-- SHARE_INTERNAL_ALLOWED_IPS env var. Can be toggled on/off per project.

ALTER TABLE "Prv_projects"
  ADD COLUMN IF NOT EXISTS share_internal_only BOOLEAN NOT NULL DEFAULT FALSE;
