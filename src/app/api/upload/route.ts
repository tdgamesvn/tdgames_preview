// POST /api/upload
// Receives multipart FormData: file + metadata fields
// Uploads file to R2 server-side (avoids browser CORS issue with direct R2 PUT)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { S3Client } from '@aws-sdk/client-s3'
import type { ServiceType } from '@/lib/types/database'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('Prv_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'internal')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse FormData
  const formData  = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file        = formData.get('file') as File | null
  const project_id  = formData.get('project_id')  as string | null
  const service_type = formData.get('service_type') as ServiceType | null
  const task_id     = formData.get('task_id')     as string | null  // may be 'null' string
  const r2_key      = formData.get('r2_key')      as string | null
  const name        = formData.get('name')        as string | null
  const file_type   = formData.get('file_type')   as string | null

  if (!file || !project_id || !service_type || !r2_key || !name || !file_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Upload to R2 server-side
  const bytes = await file.arrayBuffer()
  const r2 = getR2Client()
  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         r2_key,
    Body:        Buffer.from(bytes),
    ContentType: file.type || 'application/octet-stream',
  }))

  // Save record to Supabase
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: asset, error } = await admin
    .from('Prv_assets')
    .insert({
      project_id,
      service_type,
      name,
      r2_key,
      file_type,
      task_id: task_id === 'null' || !task_id ? null : task_id,
      metadata: {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset })
}
