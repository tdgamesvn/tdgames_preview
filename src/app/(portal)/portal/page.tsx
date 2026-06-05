import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { PrvProfile, PrvProject } from '@/lib/types/database'

export default async function PortalPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single() as { data: Pick<PrvProfile, 'client_id'> | null }

  if (!profile?.client_id) {
    return (
      <div className="text-center py-20 text-gray-400">
        No client account linked. Please contact your studio contact.
      </div>
    )
  }

  const { data: projects } = await supabase
    .from('Prv_projects')
    .select('id, name, description, status, created_at')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false }) as { data: PrvProject[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Projects</h1>

      {!projects?.length ? (
        <p className="text-gray-400">No active projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/${project.id}`}
              className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold text-gray-900 text-lg">{project.name}</h2>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
