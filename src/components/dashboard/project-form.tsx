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
import { createProject } from '@/lib/actions/projects'

interface ProjectFormProps {
  clientId: string
  trigger?: React.ReactNode
}

export function ProjectForm({ clientId, trigger }: ProjectFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createProject({
      client_id: clientId,
      name,
      description: description || null,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    setName('')
    setDescription('')
    router.refresh()
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'contents' }}>
        {trigger ?? <Button>New Project</Button>}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Hero Pack v2"
            />
          </div>
          <div>
            <Label htmlFor="proj-desc">Description (optional)</Label>
            <Input
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description…"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating…' : 'Create Project'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
