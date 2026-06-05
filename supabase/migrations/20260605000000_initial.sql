-- supabase/migrations/20260605000000_initial.sql

-- Enums
CREATE TYPE user_role AS ENUM ('internal', 'client');
CREATE TYPE service_type AS ENUM ('art', 'animation', 'vfx');
CREATE TYPE project_status AS ENUM ('active', 'archived');

-- Clients
CREATE TABLE "Prv_clients" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  logo_url   text,
  created_at timestamptz DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE "Prv_profiles" (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'client',
  client_id    uuid REFERENCES "Prv_clients"(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE "Prv_projects" (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES "Prv_clients"(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  status        project_status NOT NULL DEFAULT 'active',
  spine_version text,
  share_enabled bool NOT NULL DEFAULT false,
  share_token   text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at    timestamptz DEFAULT now()
);

-- Assets
CREATE TABLE "Prv_assets" (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES "Prv_projects"(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  name         text NOT NULL,
  r2_key       text NOT NULL,
  file_type    text NOT NULL,
  metadata     jsonb NOT NULL DEFAULT '{}',
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Comments
CREATE TABLE "Prv_comments" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES "Prv_projects"(id) ON DELETE CASCADE,
  asset_id   uuid REFERENCES "Prv_assets"(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE "Prv_clients"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_assets"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_comments" ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM "Prv_profiles" WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's client_id
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS uuid AS $$
  SELECT client_id FROM "Prv_profiles" WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prv_clients: internal = full CRUD, client = SELECT own
CREATE POLICY "clients_internal_all"   ON "Prv_clients" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "clients_client_select"  ON "Prv_clients" FOR SELECT USING (id = get_my_client_id());

-- Prv_profiles: own row always, internal sees all
CREATE POLICY "profiles_own"           ON "Prv_profiles" FOR ALL    USING (id = auth.uid());
CREATE POLICY "profiles_internal_all"  ON "Prv_profiles" FOR ALL    USING (get_my_role() = 'internal');

-- Prv_projects: internal = full CRUD, client = SELECT own, anonymous = SELECT when share enabled
CREATE POLICY "projects_internal_all"  ON "Prv_projects" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "projects_client_select" ON "Prv_projects" FOR SELECT USING (client_id = get_my_client_id());
CREATE POLICY "projects_share_select"  ON "Prv_projects" FOR SELECT USING (share_enabled = true AND auth.uid() IS NULL);

-- Prv_assets: mirrors project access
CREATE POLICY "assets_internal_all"    ON "Prv_assets" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "assets_client_select"   ON "Prv_assets" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.client_id = get_my_client_id())
);
CREATE POLICY "assets_share_select"    ON "Prv_assets" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.share_enabled = true)
  AND auth.uid() IS NULL
);

-- Prv_comments: internal = full CRUD, client = SELECT + INSERT own, share = SELECT only
CREATE POLICY "comments_internal_all"   ON "Prv_comments" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "comments_client_select"  ON "Prv_comments" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.client_id = get_my_client_id())
);
CREATE POLICY "comments_client_insert"  ON "Prv_comments" FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_share_select"   ON "Prv_comments" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.share_enabled = true)
  AND auth.uid() IS NULL
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO "Prv_profiles" (id, role, display_name)
  VALUES (NEW.id, 'client', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
