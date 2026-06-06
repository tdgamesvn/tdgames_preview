import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import type { PrvClient } from '@/lib/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = (await supabase
    .from('Prv_clients')
    .select('id, name, slug')
    .order('name')) as { data: Pick<PrvClient, 'id' | 'name' | 'slug'>[] | null }

  return (
    <DashboardShell clients={clients ?? []}>
      {children}
    </DashboardShell>
  )
}
