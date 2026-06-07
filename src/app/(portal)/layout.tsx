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
    <div className="min-h-screen" style={{ background: '#080808' }}>
      {/* Grain texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.95)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-white">TDGAME</span>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,149,0,0.1)', color: '#FF9500' }}
          >
            Preview
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#555' }}>
            {profile?.display_name ?? user.email}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-[10px] font-black uppercase tracking-wider transition-colors hover:text-red-500"
              style={{ color: '#444' }}
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {children}
      </main>
    </div>
  )
}
