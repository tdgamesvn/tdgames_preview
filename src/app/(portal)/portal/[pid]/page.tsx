import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CharacterCardGrid } from '@/components/dashboard/character-card-grid'
import { CommentsDrawer } from '@/components/portal/comments-drawer'
import { RosterClient } from '@/components/portal/roster-client'
import type { PrvProfile, PrvProject, PrvTask } from '@/lib/types/database'

export default async function PortalProjectPage({ params }: { params: { pid: string } }) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id, role')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'role'> | null }

  const { data: project } = (await supabase
    .from('Prv_projects')
    .select('*')
    .eq('id', params.pid)
    .single()) as { data: PrvProject | null }

  const isInternal = profile?.role === 'internal'
  if (!project || (!isInternal && project.client_id !== profile?.client_id)) notFound()

  const { data: tasks } = (await supabase
    .from('Prv_tasks')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvTask[] | null }

  const taskList = tasks ?? []

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:text-white"
            style={{ color: '#444' }}
          >
            ← All Projects
          </Link>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            {project.name}
          </h1>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#444' }}>
            {taskList.length} character{taskList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CommentsDrawer projectId={project.id} />
      </div>

      {/* Roster */}
      {taskList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#444' }}>No assets uploaded yet</p>
          <p className="text-xs mt-1" style={{ color: '#333' }}>Check back soon — our team is working on it.</p>
        </div>
      ) : (
        <RosterClient tasks={taskList}>
          {(filtered) => (
            <CharacterCardGrid
              tasks={filtered}
              project={project}
              linkPrefix={`/portal/${params.pid}`}
              readonly
            />
          )}
        </RosterClient>
      )}
    </div>
  )
}
