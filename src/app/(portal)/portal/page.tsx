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
    .select('client_id, display_name')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'display_name'> | null }

  if (!profile?.client_id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}
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
    .select('id, name, description, status, created_at')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })) as { data: PrvProject[] | null }

  const projectList = projects ?? []

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#FF9500' }}>
          Client Portal
        </p>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
          {profile.display_name ? `${profile.display_name}'s Projects` : 'Your Projects'}
        </h1>
        <p className="text-xs mt-1.5" style={{ color: '#555' }}>
          {projectList.length === 0
            ? 'No active projects yet'
            : `${projectList.length} active project${projectList.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Empty state */}
      {projectList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <span className="text-4xl opacity-30">📁</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#555' }}>
              No projects yet
            </p>
            <p className="text-xs mt-1" style={{ color: '#333' }}>
              Projects will appear here once your team uploads deliverables.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: PrvProject }) {
  const initial = project.name.charAt(0).toUpperCase()

  return (
    <Link
      href={`/portal/${project.id}`}
      className="group rounded-2xl overflow-hidden flex flex-col transition-all"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Colour banner / initial */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden transition-all group-hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, rgba(255,149,0,0.08) 0%, rgba(255,149,0,0.03) 100%)' }}
      >
        <span
          className="text-5xl font-black"
          style={{ color: 'rgba(255,149,0,0.25)', userSelect: 'none' }}
        >
          {initial}
        </span>
        {/* Hover arrow */}
        <div
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
          style={{ background: 'rgba(255,149,0,0.15)', color: '#FF9500' }}
        >
          View →
        </div>
      </div>

      {/* Info */}
      <div
        className="flex-1 px-4 py-3.5 space-y-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-bold text-white leading-snug group-hover:text-[#FF9500] transition-colors">
            {project.name}
          </h2>
          <span
            className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(76,175,80,0.12)', color: '#4CAF50' }}
          >
            Active
          </span>
        </div>
        {project.description ? (
          <p className="text-xs line-clamp-2" style={{ color: '#666' }}>
            {project.description}
          </p>
        ) : (
          <p className="text-xs italic" style={{ color: '#333' }}>No description</p>
        )}
      </div>
    </Link>
  )
}
