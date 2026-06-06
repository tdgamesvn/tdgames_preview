-- Prv_tasks: group assets by character/task within a project
CREATE TABLE "Prv_tasks" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES "Prv_projects"(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE "Prv_assets" ADD COLUMN task_id uuid REFERENCES "Prv_tasks"(id) ON DELETE SET NULL;

ALTER TABLE "Prv_tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_internal_all"
  ON "Prv_tasks" FOR ALL USING (get_my_role() = 'internal');

CREATE POLICY "tasks_client_select"
  ON "Prv_tasks" FOR SELECT USING (
    EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.client_id = get_my_client_id())
  );

CREATE POLICY "tasks_share_select"
  ON "Prv_tasks" FOR SELECT USING (
    EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.share_enabled = true)
    AND auth.uid() IS NULL
  );
