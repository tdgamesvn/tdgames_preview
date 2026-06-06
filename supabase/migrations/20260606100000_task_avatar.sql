-- Migration: add avatar columns to Prv_tasks
-- Each task (character) can have a Spine animation as its card preview

ALTER TABLE "Prv_tasks"
  ADD COLUMN IF NOT EXISTS avatar_asset_id  uuid  REFERENCES "Prv_assets"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_animation text,
  ADD COLUMN IF NOT EXISTS avatar_scale     float NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS avatar_offset_x  float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_offset_y  float NOT NULL DEFAULT 0;
