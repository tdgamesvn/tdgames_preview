import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PrvProfile } from '@/lib/types/database'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single() as { data: Pick<PrvProfile, 'display_name'> | null }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800">TDGame Preview</span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{profile?.display_name ?? user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-red-500 hover:underline"
            >
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
