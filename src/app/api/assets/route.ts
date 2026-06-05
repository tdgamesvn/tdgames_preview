import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ServiceType } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('role')
    .eq('id', user.id)
    .single() as unknown as { data: { role: string } | null }
  if (profile?.role !== 'internal')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { project_id, service_type, name, r2_key, file_type, metadata } =
    body as {
      project_id?: string
      service_type?: ServiceType
      name?: string
      r2_key?: string
      file_type?: string
      metadata?: Record<string, unknown>
    }

  if (!project_id || !service_type || !name || !r2_key || !file_type) {
    return NextResponse.json(
      { error: 'project_id, service_type, name, r2_key, file_type are required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await admin
    .from('Prv_assets')
    .insert({ project_id, service_type, name, r2_key, file_type, metadata: metadata ?? {} })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
