import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PrvAsset } from '@/lib/types/database'

// Service type helpers
const serviceIcon = (t: string) =>
  t === 'art' ? '🖼️' : t === 'animation' ? '🦴' : '🎬'

const serviceColor = (t: string) =>
  t === 'art'
    ? '#FF9500'
    : t === 'animation'
      ? '#818cf8'
      : '#4ade80'

export default async function DashboardPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const [
    { count: clientCount },
    { count: projectCount },
    { count: assetCount },
    { data: recentAssets },
  ] = await Promise.all([
    supabase.from('Prv_clients').select('*', { count: 'exact', head: true }),
    supabase.from('Prv_projects').select('*', { count: 'exact', head: true }),
    supabase.from('Prv_assets').select('*', { count: 'exact', head: true }),
    supabase
      .from('Prv_assets')
      .select('id, name, file_type, service_type, created_at, project_id, Prv_projects(name, client_id, Prv_clients(name))')
      .order('created_at', { ascending: false })
      .limit(8) as Promise<{ data: (PrvAsset & { Prv_projects: { name: string; Prv_clients: { name: string } } | null })[] | null }>,
  ])

  const stats = [
    { label: 'Clients',  value: clientCount  ?? 0, href: '/dashboard/clients', desc: 'Active studio clients' },
    { label: 'Projects', value: projectCount ?? 0, href: '/dashboard/clients', desc: 'Total projects'       },
    { label: 'Assets',   value: assetCount   ?? 0, href: '#',                  desc: 'Uploaded files'       },
  ]

  return (
    <div className="p-8 space-y-6 font-montserrat">

      {/* ── Page heading ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-1">
          Internal Dashboard
        </p>
        <h1 className="text-lg font-black uppercase tracking-wider text-white">
          Overview
        </h1>
      </div>

      {/* ── KPI Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {stats.map(({ label, value, href, desc }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-white/8 p-5 space-y-1 transition-all hover:border-white/20 block"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium">
              {label}
            </p>
            <p className="text-2xl font-black text-white">
              {String(value).padStart(2, '0')}
            </p>
            <p className="text-xs text-neutral-medium">{desc}</p>
          </Link>
        ))}
      </div>

      {/* ── Recent Uploads ───────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Panel header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-white">
            Recent Uploads
          </p>
          <p className="text-[9px] font-black uppercase tracking-wider text-neutral-medium">
            Last {recentAssets?.length ?? 0} files
          </p>
        </div>

        {/* Empty state */}
        {!recentAssets?.length ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📂</p>
            <p className="text-sm text-neutral-medium">No assets uploaded yet</p>
            <p className="text-xs mt-1 text-neutral-dark">
              Upload assets from a project page to see them here
            </p>
          </div>
        ) : (
          recentAssets.map((asset) => {
            const color = serviceColor(asset.service_type)
            return (
              <div
                key={asset.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.025] transition-all"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              >
                {/* Left: icon + name + breadcrumb */}
                <div className="flex items-center gap-3">
                  <span className="text-base">{serviceIcon(asset.service_type)}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{asset.name}</p>
                    <p className="text-xs text-neutral-medium mt-0.5">
                      {asset.Prv_projects?.Prv_clients?.name}
                      <span className="mx-1.5 text-neutral-dark">›</span>
                      {asset.Prv_projects?.name}
                    </p>
                  </div>
                </div>

                {/* Right: service badge + date */}
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
                    style={{ background: `${color}20`, color }}
                  >
                    {asset.service_type}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-neutral-medium">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
