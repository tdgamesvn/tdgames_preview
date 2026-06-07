-- Migration: add missing avatar_skin + avatar_bg columns to Prv_tasks
-- These were referenced in TypeScript types and actions but not yet in the DB.

ALTER TABLE "Prv_tasks"
  ADD COLUMN IF NOT EXISTS avatar_skin text,
  ADD COLUMN IF NOT EXISTS avatar_bg   text;
