'use client'

import { useState, useEffect } from 'react'
import { Menu, Zap } from 'lucide-react'
import { Sidebar } from './sidebar'
import type { PrvClient } from '@/lib/types/database'

interface DashboardShellProps {
  clients: Pick<PrvClient, 'id' | 'name' | 'slug'>[]
  children: React.ReactNode
}

export function DashboardShell({ clients, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sidebar on route change (escape key too)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="flex min-h-screen bg-bg">

      {/* ── Desktop sidebar (always visible ≥ md) ─────── */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar clients={clients} />
      </div>

      {/* ── Mobile sidebar overlay ─────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Sliding panel */}
          <div
            className="fixed inset-y-0 left-0 z-50 md:hidden"
            style={{ animation: 'slide-in-left 0.22s ease both' }}
          >
            <Sidebar clients={clients} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* ── Content area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0A0A0A',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#666', background: 'rgba(255,255,255,0.04)' }}
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF9500, #FF6B00)' }}
            >
              <Zap size={11} className="text-white fill-white" />
            </div>
            <span className="text-sm font-bold text-white">TDGame</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
