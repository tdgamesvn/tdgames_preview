import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectForm } from '@/components/dashboard/project-form'
import { Badge } from '@/components/ui/badge'
import { deleteProject } from '@/lib/actions/projects'
import { Button } from '@/components/ui/button'
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
    <div className="p-8">
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">Client</p>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-gray-400 text-sm">/{client.slug}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        <ProjectForm clientId={client.id} />
      </div>

      {!projects?.length ? (
        <p className="text-gray-500">No projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/dashboard/clients/${client.id}/projects/${project.id}`}
                    className="font-semibold hover:underline"
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {project.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    project.status === 'active' ? 'default' : 'secondary'
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-400">
                  {project.share_enabled ? '🔗 Shared' : 'Private'}
                </span>
                <form
                  action={async () => {
                    'use server'
                    await deleteProject(project.id, client.id)
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
