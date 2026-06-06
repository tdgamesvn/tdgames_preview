import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { PrvProfile, PrvProject } from '@/lib/types/database'

export default async function PortalPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id'> | null }

  if (!profile?.client_id) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-sm text-neutral-medium">No client account linked</p>
        <p className="text-xs mt-1 text-neutral-dark">
          Please contact your studio contact
        </p>
      </div>
    )
  }

  const { data: projects } = (await supabase
    .from('Prv_projects')
    .select('id, name, description, status, created_at')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })) as { data: PrvProject[] | null }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Heading */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-1">
          Client Portal
        </p>
        <h1 className="text-lg font-black uppercase tracking-wider text-white">
          Your Projects
        </h1>
      </div>

      {/* Empty state */}
      {!projects?.length ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📁</p>
          <p className="text-sm text-neutral-medium">No active projects yet</p>
          <p className="text-xs mt-1 text-neutral-dark">
            Projects will appear here once your studio contact adds them
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/${project.id}`}
              className="rounded-2xl border border-white/8 p-5 space-y-2 transition-all hover:border-white/20 block"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-white leading-snug">
                  {project.name}
                </h2>
                <span
                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50' }}
                >
                  Active
                </span>
              </div>
              {project.description && (
                <p className="text-xs text-neutral-medium line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="text-[10px] font-mono tracking-wider text-neutral-dark">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
