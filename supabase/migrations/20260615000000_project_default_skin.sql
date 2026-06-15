-- Migration: add default_skin to Prv_projects
-- Internal team can set a locked skin for the animation SpinePlayer modal.
-- Empty/null = no lock (user can switch skins freely).

ALTER TABLE "Prv_projects"
  ADD COLUMN IF NOT EXISTS default_skin TEXT DEFAULT NULL;
