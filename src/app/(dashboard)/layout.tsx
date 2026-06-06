import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import type { PrvClient } from '@/lib/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth guard (belt-and-suspenders after middleware)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch clients for sidebar nav
  const { data: clients } = (await supabase
    .from('Prv_clients')
    .select('id, name, slug')
    .order('name')) as { data: Pick<PrvClient, 'id' | 'name' | 'slug'>[] | null }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar clients={clients ?? []} />
      <main className="flex-1 overflow-auto bg-bg">
        {children}
      </main>
    </div>
  )
}
