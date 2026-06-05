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
  created_at: string
}

export interface PrvAsset {
  id: string
  project_id: string
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

export interface Database {
  public: {
    Tables: {
      Prv_profiles: { Row: PrvProfile; Insert: Omit<PrvProfile, 'created_at'>; Update: Partial<PrvProfile> }
      Prv_clients: { Row: PrvClient; Insert: Omit<PrvClient, 'id' | 'created_at'>; Update: Partial<PrvClient> }
      Prv_projects: { Row: PrvProject; Insert: Omit<PrvProject, 'id' | 'created_at'>; Update: Partial<PrvProject> }
      Prv_assets: { Row: PrvAsset; Insert: Omit<PrvAsset, 'id' | 'created_at'>; Update: Partial<PrvAsset> }
      Prv_comments: { Row: PrvComment; Insert: Omit<PrvComment, 'id' | 'created_at'>; Update: Partial<PrvComment> }
    }
  }
}
