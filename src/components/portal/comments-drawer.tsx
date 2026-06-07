'use client'

import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { Comments } from '@/components/preview/comments'

interface CommentsDrawerProps {
  projectId: string
}

export function CommentsDrawer({ projectId }: CommentsDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Comments"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#666',
        }}
      >
        <MessageSquare size={12} />
        Comments
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-96 overflow-y-auto"
        style={{
          background: 'rgba(10,10,10,0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FF9500' }}>
            Project Comments
          </p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-1 rounded-lg transition-colors hover:text-white"
            style={{ color: '#555' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-4">
          {open && <Comments projectId={projectId} />}
        </div>
      </aside>
    </>
  )
}
