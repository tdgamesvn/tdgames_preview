import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

async function getInternalUser() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase, error: 'Unauthorized' as const }
  const { data: profile } = await supabase
    .from('Prv_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'internal') return { user: null, supabase, error: 'Forbidden' as const }
  return { user, supabase, error: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getInternalUser()
  if (error === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error === 'Forbidden' || !user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const r2Key = `covers/${params.id}/${Date.now()}-${safeName}`

  const bytes = await file.arrayBuffer()
  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: r2Key,
    Body: Buffer.from(bytes),
    ContentType: file.type || 'image/jpeg',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: dbError } = await admin
    .from('Prv_projects')
    .update({ cover_r2_key: r2Key })
    .eq('id', params.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ r2_key: r2Key })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getInternalUser()
  if (error === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error === 'Forbidden' || !user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: dbError } = await admin
    .from('Prv_projects')
    .update({ cover_r2_key: null })
    .eq('id', params.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
