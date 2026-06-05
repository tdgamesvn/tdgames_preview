import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGrid } from '@/components/dashboard/asset-grid'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import { Comments } from '@/components/preview/comments'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <span>{client.name}</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-900">{project.name}</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </div>

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
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">Project Comments</h2>
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
