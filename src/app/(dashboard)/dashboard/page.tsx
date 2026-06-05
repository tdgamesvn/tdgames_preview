import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PrvAsset } from '@/lib/types/database'

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
      .select(
        'id, name, file_type, service_type, created_at, project_id, Prv_projects(name, client_id, Prv_clients(name))'
      )
      .order('created_at', { ascending: false })
      .limit(10) as Promise<{
      data:
        | (PrvAsset & {
            Prv_projects: {
              name: string
              Prv_clients: { name: string }
            } | null
          })[]
        | null
    }>,
  ])

  const stats = [
    { label: 'Clients', value: clientCount ?? 0, href: '/dashboard/clients' },
    { label: 'Projects', value: projectCount ?? 0, href: '/dashboard/clients' },
    { label: 'Assets', value: assetCount ?? 0, href: '#' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent uploads */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Recent Uploads</h2>
        </div>
        {!recentAssets?.length ? (
          <p className="px-6 py-4 text-gray-400 text-sm">No uploads yet.</p>
        ) : (
          <ul className="divide-y">
            {recentAssets.map((asset) => (
              <li
                key={asset.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-gray-400">
                    {asset.Prv_projects?.Prv_clients?.name} —{' '}
                    {asset.Prv_projects?.name}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      asset.service_type === 'art'
                        ? 'bg-purple-100 text-purple-700'
                        : asset.service_type === 'animation'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {asset.service_type}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
