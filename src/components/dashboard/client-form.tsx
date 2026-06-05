'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient, updateClient } from '@/lib/actions/clients'
import type { PrvClient } from '@/lib/types/database'

interface ClientFormProps {
  mode: 'create' | 'edit'
  client?: PrvClient
  trigger?: React.ReactNode
}

export function ClientForm({ mode, client, trigger }: ClientFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(client?.name ?? '')
  const [slug, setSlug] = useState(client?.slug ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result =
      mode === 'create'
        ? await createClient({ name, slug })
        : await updateClient(client!.id, { name, slug })

    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  const triggerEl = trigger ?? (
    <Button>{mode === 'create' ? 'Add Client' : 'Edit'}</Button>
  )

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'contents' }}>
        {triggerEl}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New Client' : 'Edit Client'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client-name">Company Name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Acme Studio"
            />
          </div>
          <div>
            <Label htmlFor="client-slug">Slug</Label>
            <Input
              id="client-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="acme-studio"
              pattern="[a-z0-9-]+"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Saving…'
              : mode === 'create'
                ? 'Create Client'
                : 'Save Changes'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
