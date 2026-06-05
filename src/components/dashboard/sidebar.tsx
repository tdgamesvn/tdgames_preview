'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, LogOut, ChevronRight, Gamepad2 } from 'lucide-react'
import type { PrvClient } from '@/lib/types/database'

interface SidebarProps {
  clients: Pick<PrvClient, 'id' | 'name' | 'slug'>[]
}

export function Sidebar({ clients }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .sidebar-root {
          font-family: 'Rajdhani', sans-serif;
          background: linear-gradient(180deg, #0f0b06 0%, #110d07 100%);
          border-right: 1px solid rgba(249,115,22,0.15);
          position: relative;
          overflow: hidden;
        }
        .sidebar-root::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image:
            linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .sidebar-logo-font { font-family: 'Audiowide', cursive; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(251,146,60,0.5);
          text-decoration: none;
          transition: all 0.15s ease;
          position: relative;
          border: 1px solid transparent;
          letter-spacing: 0.02em;
        }
        .nav-item:hover {
          color: #fb923c;
          background: rgba(249,115,22,0.08);
          border-color: rgba(249,115,22,0.2);
        }
        .nav-item.active {
          color: #f97316;
          background: rgba(249,115,22,0.12);
          border-color: rgba(249,115,22,0.35);
          box-shadow: 0 0 12px rgba(249,115,22,0.15), inset 0 0 12px rgba(249,115,22,0.05);
        }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: -1px;
          top: 20%;
          bottom: 20%;
          width: 3px;
          background: #f97316;
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px #f97316;
        }
        .nav-item-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px 7px 32px;
          border-radius: 3px;
          font-size: 13px;
          color: rgba(251,146,60,0.4);
          text-decoration: none;
          transition: all 0.15s ease;
          letter-spacing: 0.01em;
        }
        .nav-item-sub:hover { color: rgba(251,146,60,0.8); background: rgba(249,115,22,0.05); }
        .nav-item-sub.active { color: #fb923c; }
        .nav-item-sub.active::before { content: '▸'; margin-right: 4px; color: #f97316; }

        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(249,115,22,0.35);
          padding: 0 12px;
          margin-bottom: 6px;
        }
        .corner-box {
          position: relative;
          padding: 16px 20px;
        }
        .corner-box::before, .corner-box::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          border-color: rgba(249,115,22,0.4);
          border-style: solid;
        }
        .corner-box::before { top: 8px; left: 12px; border-width: 1px 0 0 1px; }
        .corner-box::after { bottom: 8px; right: 12px; border-width: 0 1px 1px 0; }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(249,115,22,0.35);
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.05em;
        }
        .logout-btn:hover {
          color: #ef4444;
          background: rgba(239,68,68,0.08);
        }
        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          display: inline-block;
          margin-right: 6px;
        }
      `}</style>

      <aside className="sidebar-root w-60 min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="corner-box" style={{ borderBottom: '1px solid rgba(249,115,22,0.1)', marginBottom: 8 }}>
          <div className="sidebar-logo-font" style={{
            fontSize: 13,
            color: '#f97316',
            letterSpacing: '0.05em',
            marginBottom: 2,
          }}>
            TDGAME
          </div>
          <div style={{
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'rgba(249,115,22,0.4)',
            letterSpacing: '0.2em',
          }}>
            <span className="status-dot" />
            PREVIEW PORTAL
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link
            href="/dashboard"
            className={`nav-item ${isActive('/dashboard', true) ? 'active' : ''}`}
          >
            <LayoutDashboard size={15} />
            Overview
          </Link>

          <div style={{ marginTop: 16, marginBottom: 6 }}>
            <div className="section-label">{'// clients'}</div>
          </div>

          <Link
            href="/dashboard/clients"
            className={`nav-item ${isActive('/dashboard/clients', true) ? 'active' : ''}`}
          >
            <Users size={15} />
            All Clients
          </Link>

          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className={`nav-item-sub ${isActive(`/dashboard/clients/${client.id}`) ? 'active' : ''}`}
            >
              <ChevronRight size={10} style={{ opacity: 0.4 }} />
              {client.name}
            </Link>
          ))}

          {clients.length === 0 && (
            <div style={{
              padding: '6px 12px 6px 32px',
              fontSize: 12,
              color: 'rgba(249,115,22,0.2)',
              fontFamily: 'JetBrains Mono, monospace',
              fontStyle: 'italic',
            }}>
              no clients yet
            </div>
          )}
        </nav>

        {/* Gamertag / Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(249,115,22,0.1)' }}>
          <div style={{
            padding: '8px 12px',
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 28, height: 28,
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Gamepad2 size={14} color="#f97316" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#fb923c', fontWeight: 600 }}>Internal</div>
              <div style={{
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'rgba(249,115,22,0.35)',
                letterSpacing: '0.1em',
              }}>
                TDGAME STUDIO
              </div>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="logout-btn">
              <LogOut size={14} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
