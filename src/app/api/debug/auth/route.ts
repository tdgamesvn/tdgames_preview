import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ auth: false, userError: userError?.message, user: null, profile: null })
    }

    const { data: profile, error: profileError } = await supabase
      .from('Prv_profiles')
      .select('role, display_name, client_id')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      auth: true,
      userId: user.id,
      email: user.email,
      profile,
      profileError: profileError?.message ?? null,
    })
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
