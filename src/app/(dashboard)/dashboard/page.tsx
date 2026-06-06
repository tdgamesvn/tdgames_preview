import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PrvAsset } from '@/lib/types/database'

const serviceIcon = (t: string) =>
  t === 'art' ? '🖼' : t === 'animation' ? '🦴' : '🎬'

const serviceColor = (t: string) =>
  t === 'art'        ? '#FF9500'
  : t === 'animation' ? '#818cf8'
  :                     '#34d399'

export default async function DashboardPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const [
    { count: clientCount },
    { count: projectCount },
    { count: assetCount },
    { data: recentAssets },
  ] = await Promise.all([
    supabase.from('Prv_clients').select('*',  { count: 'exact', head: true }),
    supabase.from('Prv_projects').select('*', { count: 'exact', head: true }),
    supabase.from('Prv_assets').select('*',   { count: 'exact', head: true }),
    supabase
      .from('Prv_assets')
      .select('id, name, file_type, service_type, created_at, project_id, Prv_projects(name, client_id, Prv_clients(name))')
      .order('created_at', { ascending: false })
      .limit(8) as Promise<{ data: (PrvAsset & { Prv_projects: { name: string; Prv_clients: { name: string } } | null })[] | null }>,
  ])

  const stats = [
    { label: 'Clients',  value: clientCount  ?? 0, href: '/dashboard/clients', suffix: 'studios' },
    { label: 'Projects', value: projectCount ?? 0, href: '/dashboard/clients', suffix: 'active'  },
    { label: 'Assets',   value: assetCount   ?? 0, href: '#',                  suffix: 'files'   },
  ]

  return (
    <div className="min-h-screen page-enter">
      {/* ── Hero header ─────────────────────────────────── */}
      <div
        className="relative px-4 sm:px-6 md:px-8 pt-7 sm:pt-10 pb-6 sm:pb-8 overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 right-0 w-96 h-48 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 80% 0%, rgba(255,149,0,0.07) 0%, transparent 65%)',
          }}
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#FF9500', opacity: 0.7 }}>
            Internal Dashboard
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-sm mt-1" style={{ color: '#666' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-7 space-y-5 sm:space-y-7">

        {/* ── KPI stats ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {stats.map(({ label, value, href, suffix }) => (
            <Link
              key={label}
              href={href}
              className="kpi-card p-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#555' }}>
                {label}
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none mb-1">
                {String(value).padStart(2, '0')}
              </p>
              <p className="text-xs font-medium" style={{ color: '#444' }}>{suffix}</p>
            </Link>
          ))}
        </div>

        {/* ── Recent uploads ────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white" style={{ letterSpacing: '0.1em' }}>
              Recent Uploads
            </p>
            <span className="text-[10px] font-medium" style={{ color: '#444' }}>
              {recentAssets?.length ?? 0} files
            </span>
          </div>

          {/* Empty state */}
          {!recentAssets?.length ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">📂</p>
              <p className="text-sm font-medium" style={{ color: '#555' }}>No assets uploaded yet</p>
              <p className="text-xs mt-1" style={{ color: '#333' }}>
                Upload assets from a project page
              </p>
            </div>
          ) : (
            <div>
              {recentAssets.map((asset, i) => {
                const color = serviceColor(asset.service_type)
                const isLast = i === (recentAssets?.length ?? 0) - 1
                return (
                  <div
                    key={asset.id}
                    className="list-row flex items-center justify-between px-5 py-3.5"
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: `${color}14` }}
                      >
                        {serviceIcon(asset.service_type)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{asset.name}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: '#555' }}>
                          {asset.Prv_projects?.Prv_clients?.name}
                          <span className="mx-1.5" style={{ color: '#333' }}>›</span>
                          {asset.Prv_projects?.name}
                        </p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
                        style={{ background: `${color}14`, color }}
                      >
                        {asset.service_type}
                      </span>
                      <span className="text-[10px] tabular-nums" style={{ color: '#444' }}>
                        {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
