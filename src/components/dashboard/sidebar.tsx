'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PrvClient } from '@/lib/types/database'
import { LayoutDashboard, Users, LogOut } from 'lucide-react'

interface SidebarProps {
  clients: Pick<PrvClient, 'id' | 'name' | 'slug'>[]
}

export function Sidebar({ clients }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-bold tracking-tight">TDGame Preview</span>
        <span className="ml-2 text-xs text-gray-400">Internal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === '/dashboard'
              ? 'bg-gray-700 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          )}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>

        <div className="pt-4">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Clients
          </p>
          <Link
            href="/dashboard/clients"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === '/dashboard/clients'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Users size={16} />
            All Clients
          </Link>

          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className={cn(
                'flex items-center px-3 py-2 pl-9 rounded-md text-sm transition-colors',
                pathname.startsWith(`/dashboard/clients/${client.id}`)
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              )}
            >
              {client.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
