import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGrid } from '@/components/dashboard/asset-grid'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import { Comments } from '@/components/preview/comments'
import type { PrvProject, PrvClient } from '@/lib/types/database'

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; pid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: client }, { data: project }] = await Promise.all([
    supabase
      .from('Prv_clients')
      .select('id, name')
      .eq('id', params.id)
      .single() as Promise<{ data: Pick<PrvClient, 'id' | 'name'> | null }>,
    supabase
      .from('Prv_projects')
      .select('*')
      .eq('id', params.pid)
      .single() as Promise<{ data: PrvProject | null }>,
  ])

  if (!client || !project) notFound()

  const statusColor = project.status === 'active' ? '#4CAF50' : '#9D9C9D'

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
        <Link
          href="/dashboard/clients"
          className="text-neutral-medium hover:text-white transition-colors"
        >
          Clients
        </Link>
        <span className="text-neutral-dark">›</span>
        <Link
          href={`/dashboard/clients/${params.id}`}
          className="text-neutral-medium hover:text-white transition-colors"
        >
          {client.name}
        </Link>
        <span className="text-neutral-dark">›</span>
        <span className="text-white">{project.name}</span>
      </nav>

      {/* Page heading + status */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black uppercase tracking-wider text-white">
          {project.name}
        </h1>
        <span
          className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
          style={{ background: `${statusColor}20`, color: statusColor }}
        >
          {project.status}
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="art">
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="vfx">VFX</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGrid projectId={project.id} serviceType="art" spineVersion={null} />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGrid
            projectId={project.id}
            serviceType="animation"
            spineVersion={project.spine_version}
          />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGrid projectId={project.id} serviceType="vfx" spineVersion={null} />
        </TabsContent>

        <TabsContent value="comments">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-4">
              Project Comments
            </p>
            <Comments projectId={project.id} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettingsForm project={project} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
