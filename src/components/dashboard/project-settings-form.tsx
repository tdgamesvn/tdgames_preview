'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateProject } from '@/lib/actions/projects'
import type { PrvProject } from '@/lib/types/database'

const SPINE_VERSIONS = ['4.2', '4.1', '4.0', '3.8', '3.7']

interface ProjectSettingsFormProps {
  project: PrvProject
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter()
  const [spineVersion, setSpineVersion] = useState(project.spine_version ?? '')
  const [shareEnabled, setShareEnabled] = useState(project.share_enabled)
  const [status, setStatus] = useState<'active' | 'archived'>(project.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateProject(project.id, {
      spine_version: spineVersion || null,
      share_enabled: shareEnabled,
      status,
    })
    setSaving(false)
    if (result.error) {
      setMessage(`Error: ${result.error}`)
      return
    }
    setMessage('Saved!')
    router.refresh()
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <Label>Spine Version (for Animation assets)</Label>
        <Select value={spineVersion} onValueChange={(v) => setSpineVersion(v ?? '')}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select version…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {SPINE_VERSIONS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Public Share Link</Label>
          <p className="text-sm text-gray-500">
            Allow anonymous access via token URL
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shareEnabled}
          onClick={() => setShareEnabled(!shareEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            shareEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              shareEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {shareEnabled && project.share_token && (
        <div className="p-3 bg-blue-50 rounded text-sm break-all">
          <span className="font-medium">Share URL: </span>
          <a
            href={`/share/${project.share_token}`}
            className="text-blue-600 hover:underline"
            target="_blank"
          >
            /share/{project.share_token}
          </a>
        </div>
      )}

      <div>
        <Label>Project Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as 'active' | 'archived')}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.startsWith('Error') ? 'text-red-500' : 'text-green-600'
          }`}
        >
          {message}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </Button>
    </div>
  )
}
