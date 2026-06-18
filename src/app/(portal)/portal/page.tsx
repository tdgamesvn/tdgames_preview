import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPublicUrl } from '@/lib/r2'
import { PortalProjectCard } from '@/components/portal/portal-project-card'
import type { PrvProfile, PrvProject, PrvAsset } from '@/lib/types/database'

export default async function PortalPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id, display_name')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'display_name'> | null }

  if (!profile?.client_id) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', fontSize: '1.5rem' }}
        >
          ⚠️
        </div>
        <div>
          <p className="text-sm font-semibold text-white">No client account linked</p>
          <p className="text-xs mt-1" style={{ color: '#555' }}>
            Please contact your studio contact to get access.
          </p>
        </div>
      </div>
    )
  }

  const { data: projects } = (await supabase
    .from('Prv_projects')
    .select('id, name, description, status, created_at, client_id, cover_r2_key')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })) as { data: PrvProject[] | null }

  const projectList = projects ?? []

  // Per project: character count + first art presigned URL for cover
  const projectData = await Promise.all(
    projectList.map(async (project) => {
      const [{ count }, { data: firstArt }] = await Promise.all([
        supabase
          .from('Prv_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id) as Promise<{ count: number | null }>,
        supabase
          .from('Prv_assets')
          .select('r2_key')
          .eq('project_id', project.id)
          .eq('service_type', 'art')
          .order('created_at')
          .limit(1) as Promise<{ data: Pick<PrvAsset, 'r2_key'>[] | null }>,
      ])
      let coverUrl: string | undefined
      if (project.cover_r2_key) {
        coverUrl = getPublicUrl(project.cover_r2_key)
      } else if (firstArt?.[0]?.r2_key) {
        coverUrl = getPublicUrl(firstArt[0].r2_key)
      }
      return { project, characterCount: count ?? 0, coverUrl }
    })
  )

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#FF9500' }}>
          Client Portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          {profile.display_name ? profile.display_name : 'Your Projects'}
        </h1>
        <p className="text-xs mt-1.5" style={{ color: '#444' }}>
          {projectList.length === 0
            ? 'No active projects yet'
            : `${projectList.length} active project${projectList.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Empty state */}
      {projectList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 gap-4 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#444' }}>No projects yet</p>
          <p className="text-xs" style={{ color: '#333' }}>
            Projects will appear here once your team uploads deliverables.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectData.map(({ project, characterCount, coverUrl }) => (
            <PortalProjectCard
              key={project.id}
              project={project}
              coverUrl={coverUrl}
              characterCount={characterCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
