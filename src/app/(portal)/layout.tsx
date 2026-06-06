import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PrvProfile } from '@/lib/types/database'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'display_name'> | null }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header
        className="px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0F0F0F' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-white">TDGAME</span>
          <span
            className="text-[9px] font-black uppercase tracking-widest text-neutral-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,149,0,0.08)', color: '#FF9500' }}
          >
            Preview
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-medium">
            {profile?.display_name ?? user.email}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-[10px] font-black uppercase tracking-wider text-neutral-medium hover:text-status-error transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
