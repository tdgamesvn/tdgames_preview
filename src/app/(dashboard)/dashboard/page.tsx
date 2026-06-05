import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PrvAsset } from '@/lib/types/database'

const serviceIcon = (t: string) =>
  t === 'art' ? '🖼️' : t === 'animation' ? '🦴' : '🎬'

const serviceColor = (t: string) =>
  t === 'art'
    ? { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', text: '#fb923c' }
    : t === 'animation'
      ? { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', text: '#818cf8' }
      : { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#4ade80' }

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
    { label: 'CLIENTS', value: clientCount ?? 0, href: '/dashboard/clients', icon: '◈', desc: 'Active studio clients' },
    { label: 'PROJECTS', value: projectCount ?? 0, href: '/dashboard/clients', icon: '◆', desc: 'Total projects' },
    { label: 'ASSETS', value: assetCount ?? 0, href: '#', icon: '◉', desc: 'Uploaded files' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .dash-font { font-family: 'Rajdhani', sans-serif; }
        .dash-heading { font-family: 'Audiowide', cursive; }
        .dash-mono { font-family: 'JetBrains Mono', monospace; }

        .stat-card {
          background: linear-gradient(135deg, rgba(249,115,22,0.07) 0%, rgba(249,115,22,0.03) 100%);
          border: 1px solid rgba(249,115,22,0.2);
          border-radius: 6px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          text-decoration: none;
          display: block;
          transition: all 0.2s;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #f97316, transparent);
          opacity: 0.6;
        }
        .stat-card:hover {
          border-color: rgba(249,115,22,0.5);
          background: linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.06) 100%);
          box-shadow: 0 0 24px rgba(249,115,22,0.15);
          transform: translateY(-1px);
        }
        .corner-tl::after {
          content: '';
          position: absolute;
          top: 8px; left: 8px;
          width: 10px; height: 10px;
          border-top: 1px solid rgba(249,115,22,0.5);
          border-left: 1px solid rgba(249,115,22,0.5);
        }
        .corner-br::before {
          content: '';
          position: absolute;
          bottom: 8px; right: 8px;
          width: 10px; height: 10px;
          border-bottom: 1px solid rgba(249,115,22,0.5);
          border-right: 1px solid rgba(249,115,22,0.5);
        }
        .asset-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(249,115,22,0.06);
          transition: background 0.15s;
        }
        .asset-row:last-child { border-bottom: none; }
        .asset-row:hover { background: rgba(249,115,22,0.04); }
        .service-badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 3px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .panel {
          background: rgba(249,115,22,0.04);
          border: 1px solid rgba(249,115,22,0.12);
          border-radius: 6px;
          overflow: hidden;
        }
        .panel-header {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(249,115,22,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>

      <div className="dash-font" style={{ padding: '32px 36px', color: '#f8fafc', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-mono" style={{
              fontSize: 10, letterSpacing: '0.25em',
              color: 'rgba(249,115,22,0.5)', marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              {'// SYSTEM OVERVIEW'}
            </div>
            <h1 className="dash-heading" style={{
              fontSize: 22, color: '#f97316',
              letterSpacing: '0.04em',
            }}>
              COMMAND CENTER
            </h1>
          </div>
          <div className="dash-mono" style={{
            fontSize: 10,
            color: 'rgba(249,115,22,0.3)',
            letterSpacing: '0.1em',
            textAlign: 'right',
            lineHeight: 2,
          }}>
            <div>TDGAME STUDIO</div>
            <div style={{ color: 'rgba(34,197,94,0.6)' }}>● PORTAL ONLINE</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {stats.map(({ label, value, href, icon, desc }) => (
            <Link key={label} href={href} className="stat-card corner-tl corner-br">
              <div style={{
                fontSize: 11, letterSpacing: '0.2em',
                color: 'rgba(249,115,22,0.5)',
                marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8,
              }} className="dash-mono">
                <span style={{ color: '#f97316', fontSize: 14 }}>{icon}</span>
                {label}
              </div>
              <div style={{
                fontSize: 52, fontWeight: 700,
                color: '#f97316',
                lineHeight: 1,
                marginBottom: 8,
                fontFamily: 'Audiowide, cursive',
              }}>
                {String(value).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)' }}>
                {desc}
              </div>
            </Link>
          ))}
        </div>

        {/* Recent uploads */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, color: '#f97316' }}>◈</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fb923c', letterSpacing: '0.05em' }}>
                RECENT UPLOADS
              </span>
            </div>
            <div className="dash-mono" style={{ fontSize: 10, color: 'rgba(249,115,22,0.35)', letterSpacing: '0.1em' }}>
              LAST {recentAssets?.length ?? 0} FILES
            </div>
          </div>

          {!recentAssets?.length ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(249,115,22,0.2)' }}
              className="dash-mono">
              <div style={{ fontSize: 24, marginBottom: 8 }}>[ NO DATA ]</div>
              <div style={{ fontSize: 11 }}>Upload assets to see them here</div>
            </div>
          ) : (
            recentAssets.map((asset) => {
              const sc = serviceColor(asset.service_type)
              return (
                <div key={asset.id} className="asset-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{serviceIcon(asset.service_type)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)' }}>
                        {asset.Prv_projects?.Prv_clients?.name}
                        <span style={{ margin: '0 6px', color: 'rgba(249,115,22,0.3)' }}>›</span>
                        {asset.Prv_projects?.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span
                      className="service-badge"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                    >
                      {asset.service_type}
                    </span>
                    <span className="dash-mono" style={{ fontSize: 10, color: 'rgba(249,115,22,0.35)' }}>
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
