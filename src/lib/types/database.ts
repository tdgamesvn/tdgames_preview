// src/lib/types/database.ts
export type UserRole = 'internal' | 'client'
export type ServiceType = 'art' | 'animation' | 'vfx'
export type ProjectStatus = 'active' | 'archived'

export interface PrvProfile {
  id: string
  role: UserRole
  client_id: string | null
  display_name: string
  created_at: string
}

export interface PrvClient {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
}

export interface PrvProject {
  id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  spine_version: string | null
  share_enabled: boolean
  share_token: string | null
  /** Card background type: 'color' (solid hex) or 'image' (R2 public URL) */
  card_bg_type: 'color' | 'image'
  /** Hex color (e.g. '#3a3a3aff') or public image URL */
  card_bg_value: string
  created_at: string
}

export interface PrvTask {
  id: string
  project_id: string
  name: string
  sort_order: number
  created_at: string
  avatar_asset_id: string | null
  avatar_animation: string | null
  avatar_skin: string | null
  avatar_bg: string | null
  avatar_scale: number
  avatar_offset_x: number
  avatar_offset_y: number
}



export interface PrvAsset {
  id: string
  project_id: string
  task_id: string | null
  service_type: ServiceType
  name: string
  r2_key: string
  file_type: string
  metadata: Record<string, unknown>
  sort_order: number
  created_at: string
}

export interface PrvComment {
  id: string
  project_id: string
  asset_id: string | null
  author_id: string
  content: string
  created_at: string
}

type TableDef<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

// Full Supabase v2 Database schema format (required for type inference in v2.40+)
export interface Database {
  public: {
    Tables: {
      Prv_profiles: TableDef<PrvProfile, Omit<PrvProfile, 'created_at'>, Partial<PrvProfile>>
      Prv_clients: TableDef<PrvClient, Omit<PrvClient, 'id' | 'created_at'>, Partial<PrvClient>>
      Prv_projects: TableDef<PrvProject, Omit<PrvProject, 'id' | 'created_at'>, Partial<PrvProject>>
      Prv_tasks: TableDef<PrvTask, Omit<PrvTask, 'id' | 'created_at'>, Partial<PrvTask>>
      Prv_assets: TableDef<PrvAsset, Omit<PrvAsset, 'id' | 'created_at'>, Partial<PrvAsset>>
      Prv_comments: TableDef<PrvComment, Omit<PrvComment, 'id' | 'created_at'>, Partial<PrvComment>>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
