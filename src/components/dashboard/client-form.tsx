'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient, updateClient } from '@/lib/actions/clients'
import type { PrvClient } from '@/lib/types/database'

interface ClientFormProps {
  mode: 'create' | 'edit'
  client?: PrvClient
  trigger?: React.ReactNode
}

/** Reusable styled input */
function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 14,
        color: '#F0F0F0',
        outline: 'none',
        transition: 'border-color 0.15s',
        ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,149,0,0.5)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
    />
  )
}

export function ClientForm({ mode, client, trigger }: ClientFormProps) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [name,    setName]    = useState(client?.name ?? '')
  const [slug,    setSlug]    = useState(client?.slug ?? '')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = mode === 'create'
      ? await createClient({ name, slug })
      : await updateClient(client!.id, { name, slug })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setOpen(false)
    router.refresh()
  }

  const defaultTrigger = mode === 'create' ? (
    <button
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
      style={{ background: '#FF9500', color: '#080808', boxShadow: '0 1px 8px rgba(255,149,0,0.3)' }}
    >
      <Plus size={14} />
      Add Client
    </button>
  ) : (
    <button
      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all"
      style={{ color: '#888', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      Edit
    </button>
  )

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'contents' }}>
        {trigger ?? defaultTrigger}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'New Client' : 'Edit Client'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
                Company Name
              </label>
              <DarkInput
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Acme Studio"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
                Slug
              </label>
              <DarkInput
                id="client-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                placeholder="acme-studio"
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs" style={{ color: '#444' }}>
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            {error && (
              <div
                className="rounded-xl px-3 py-2 text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: '#FF9500', color: '#080808', boxShadow: '0 1px 8px rgba(255,149,0,0.2)' }}
            >
              {loading ? 'Saving…' : mode === 'create' ? 'Create Client' : 'Save Changes'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
