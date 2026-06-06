'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, LogOut, ChevronRight } from 'lucide-react'
import type { PrvClient } from '@/lib/types/database'

interface SidebarProps {
  clients: Pick<PrvClient, 'id' | 'name' | 'slug'>[]
}

export function Sidebar({ clients }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside
      className="w-60 min-h-screen flex flex-col font-montserrat"
      style={{
        background: '#0F0F0F',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="text-sm font-black uppercase tracking-widest text-white">
          TDGAME
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: '#4CAF50', boxShadow: '0 0 4px #4CAF50' }}
          />
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-medium">
            Preview Portal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {/* Overview */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            isActive('/dashboard', true)
              ? 'text-primary'
              : 'text-neutral-medium hover:text-neutral-light hover:bg-white/5'
          }`}
          style={isActive('/dashboard', true) ? { background: 'rgba(255,149,0,0.08)', color: '#FF9500' } : {}}
        >
          <LayoutDashboard size={14} />
          Overview
        </Link>

        {/* Clients section */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[9px] font-black uppercase tracking-widest text-neutral-dark mb-1">
            Clients
          </p>
        </div>

        <Link
          href="/dashboard/clients"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            isActive('/dashboard/clients', true)
              ? 'text-primary'
              : 'text-neutral-medium hover:text-neutral-light hover:bg-white/5'
          }`}
          style={isActive('/dashboard/clients', true) ? { background: 'rgba(255,149,0,0.08)', color: '#FF9500' } : {}}
        >
          <Users size={14} />
          All Clients
        </Link>

        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.id}`}
            className={`flex items-center gap-2 px-3 py-1.5 pl-8 rounded-xl text-[11px] font-semibold transition-all ${
              isActive(`/dashboard/clients/${client.id}`)
                ? 'text-white'
                : 'text-neutral-medium hover:text-neutral-light hover:bg-white/5'
            }`}
            style={isActive(`/dashboard/clients/${client.id}`) ? { background: 'rgba(255,255,255,0.04)', color: '#FF9500' } : {}}
          >
            <ChevronRight size={10} className="opacity-40 flex-shrink-0" />
            <span className="truncate">{client.name}</span>
          </Link>
        ))}

        {clients.length === 0 && (
          <div className="px-3 py-1.5 pl-8 text-[10px] text-neutral-dark italic">
            No clients yet
          </div>
        )}
      </nav>

      {/* Footer / Logout */}
      <div
        className="px-3 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Role badge */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
          style={{ background: 'rgba(255,149,0,0.03)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black"
            style={{ background: 'rgba(255,149,0,0.12)', color: '#FF9500' }}
          >
            TG
          </div>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">Internal</div>
            <div className="text-[9px] font-bold text-neutral-dark uppercase tracking-wider">TDGame Studio</div>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-medium hover:text-status-error hover:bg-white/5 transition-all"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
