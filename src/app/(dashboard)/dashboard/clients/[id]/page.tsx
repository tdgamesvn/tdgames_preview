import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectForm } from '@/components/dashboard/project-form'
import { deleteProject } from '@/lib/actions/projects'
import type { PrvClient, PrvProject } from '@/lib/types/database'

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: client } = (await supabase
    .from('Prv_clients')
    .select('*')
    .eq('id', params.id)
    .single()) as { data: PrvClient | null }

  if (!client) notFound()

  const { data: projects } = (await supabase
    .from('Prv_projects')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })) as {
    data: PrvProject[] | null
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-1">
            Client
          </p>
          <h1 className="text-lg font-black uppercase tracking-wider text-white">
            {client.name}
          </h1>
          <p className="text-xs font-mono tracking-wider text-neutral-medium mt-0.5">
            /{client.slug}
          </p>
        </div>
        <ProjectForm clientId={client.id} />
      </div>

      {/* Empty state */}
      {!projects?.length ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📁</p>
          <p className="text-sm text-neutral-medium">No projects yet</p>
          <p className="text-xs mt-1 text-neutral-dark">
            Create the first project for this client above
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const statusColor = project.status === 'active' ? '#4CAF50' : '#9D9C9D'
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-white/8 p-5 space-y-3 transition-all hover:border-white/20"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {/* Name + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/clients/${client.id}/projects/${project.id}`}
                    className="text-sm font-semibold text-white hover:text-primary transition-colors leading-snug"
                  >
                    {project.name}
                  </Link>
                  <span
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex-shrink-0"
                    style={{ background: `${statusColor}20`, color: statusColor }}
                  >
                    {project.status}
                  </span>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-neutral-medium">{project.description}</p>
                )}

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-[10px] font-mono text-neutral-medium">
                    {project.share_enabled ? '🔗 Shared' : '🔒 Private'}
                  </span>
                  <form
                    action={async () => {
                      'use server'
                      await deleteProject(project.id, client.id)
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-neutral-medium border border-white/10 hover:text-status-error hover:border-red-500/20 transition-all"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
