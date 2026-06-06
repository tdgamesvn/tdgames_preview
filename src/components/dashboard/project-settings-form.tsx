'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateProject } from '@/lib/actions/projects'
import type { PrvProject } from '@/lib/types/database'
import { Link2, CheckCircle2 } from 'lucide-react'

const SPINE_VERSIONS = ['4.2', '4.1', '4.0', '3.8', '3.7']

interface ProjectSettingsFormProps {
  project: PrvProject
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter()
  const [spineVersion, setSpineVersion] = useState(project.spine_version ?? '')
  const [shareEnabled, setShareEnabled] = useState(project.share_enabled)
  const [status,       setStatus]       = useState<'active' | 'archived'>(project.status)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setErrorMsg(null)
    const result = await updateProject(project.id, {
      spine_version: spineVersion || null,
      share_enabled: shareEnabled,
      status,
    })
    setSaving(false)
    if (result.error) { setErrorMsg(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-sm">

      {/* ── Spine version ─────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
          Spine Version
        </label>
        <Select value={spineVersion} onValueChange={(v) => setSpineVersion(v ?? '')}>
          <SelectTrigger
            className="w-full h-9 text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#F0F0F0',
            }}
          >
            <SelectValue placeholder="Not set" />
          </SelectTrigger>
          <SelectContent
            style={{
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
            }}
          >
            <SelectItem value="">Not set</SelectItem>
            {SPINE_VERSIONS.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs" style={{ color: '#444' }}>
          Used by all Animation assets in this project
        </p>
      </div>

      {/* ── Status ────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
          Project Status
        </label>
        <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'archived')}>
          <SelectTrigger
            className="w-full h-9 text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#F0F0F0',
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            style={{
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
            }}
          >
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Share link toggle ─────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <p className="text-sm font-medium text-white">Public Share Link</p>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>
            Allow anonymous access via token URL
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shareEnabled}
          onClick={() => setShareEnabled(!shareEnabled)}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0"
          style={{
            background: shareEnabled ? '#FF9500' : 'rgba(255,255,255,0.1)',
            boxShadow: shareEnabled ? '0 0 8px rgba(255,149,0,0.4)' : 'none',
          }}
        >
          <span
            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
            style={{
              transform: shareEnabled ? 'translateX(18px)' : 'translateX(3px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>

      {/* ── Share URL ─────────────────────────────────── */}
      {shareEnabled && project.share_token && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs"
          style={{ background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.15)' }}
        >
          <Link2 size={13} style={{ color: '#FF9500', flexShrink: 0 }} />
          <a
            href={`/share/${project.share_token}`}
            className="truncate hover:underline font-medium"
            style={{ color: '#FF9500' }}
            target="_blank"
          >
            /share/{project.share_token}
          </a>
        </div>
      )}

      {/* ── Save button ───────────────────────────────── */}
      {errorMsg && (
        <p className="text-xs font-medium" style={{ color: '#EF4444' }}>{errorMsg}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
        style={{
          background: saved ? 'rgba(34,197,94,0.12)' : '#FF9500',
          color:      saved ? '#22C55E' : '#080808',
          border:     saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
          boxShadow:  saving || saved ? 'none' : '0 1px 8px rgba(255,149,0,0.3)',
        }}
      >
        {saved && <CheckCircle2 size={14} />}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save Settings'}
      </button>
    </div>
  )
}
