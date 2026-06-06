'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, LogOut, ChevronRight, Zap } from 'lucide-react'
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
      className="w-56 min-h-screen flex flex-col flex-shrink-0"
      style={{
        background: '#0A0A0A',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div
        className="px-5 py-5 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Subtle orange glow behind logo */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,149,0,0.12) 0%, transparent 70%)' }}
        />
        <div className="flex items-center gap-2.5 relative">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF9500, #FF6B00)', boxShadow: '0 2px 8px rgba(255,149,0,0.35)' }}
          >
            <Zap size={13} className="text-white fill-white" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wide text-white">TDGame</div>
            <div className="text-[9px] font-medium text-neutral-medium" style={{ color: '#666' }}>
              Preview Portal
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">

        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard size={14} />}
          label="Overview"
          active={isActive('/dashboard', true)}
        />

        {/* Section label */}
        <div className="px-3 pt-4 pb-1">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: '#444' }}>
            Clients
          </span>
        </div>

        <NavItem
          href="/dashboard/clients"
          icon={<Users size={14} />}
          label="All Clients"
          active={isActive('/dashboard/clients', true)}
        />

        {/* Client sub-items */}
        {clients.map((client) => {
          const active = isActive(`/dashboard/clients/${client.id}`)
          return (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="flex items-center gap-2 px-3 py-1.5 pl-8 rounded-lg text-[11px] font-medium transition-colors group"
              style={{
                color: active ? '#F0F0F0' : '#555',
              }}
            >
              <ChevronRight
                size={9}
                className="transition-transform group-hover:translate-x-0.5"
                style={{ color: active ? '#FF9500' : '#444' }}
              />
              <span className="truncate group-hover:text-neutral-300 transition-colors">
                {client.name}
              </span>
            </Link>
          )
        })}

        {clients.length === 0 && (
          <div className="px-3 py-1.5 pl-8 text-[10px]" style={{ color: '#333' }}>
            No clients yet
          </div>
        )}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div
        className="px-2 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* User pill */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
          style={{ background: 'rgba(255,149,0,0.04)', border: '1px solid rgba(255,149,0,0.1)' }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-black"
            style={{ background: 'rgba(255,149,0,0.15)', color: '#FF9500' }}
          >
            TG
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-white truncate">Internal</div>
            <div className="text-[9px] truncate" style={{ color: '#555' }}>TDGame Studio</div>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{ color: '#555' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.background = '' }}
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}

/* ── Nav Item helper ──────────────────────────────────────── */
function NavItem({
  href, icon, label, active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all relative group"
      style={{
        color:      active ? '#F0F0F0' : '#666',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        boxShadow:  active ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
      }}
    >
      {/* Left accent bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ background: '#FF9500' }}
        />
      )}
      <span
        className="transition-colors"
        style={{ color: active ? '#FF9500' : '#555' }}
      >
        {icon}
      </span>
      <span className="group-hover:text-neutral-200 transition-colors">{label}</span>
    </Link>
  )
}
