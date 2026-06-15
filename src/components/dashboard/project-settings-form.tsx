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
  const [name,         setName]         = useState(project.name)
  const [description,  setDescription]  = useState(project.description ?? '')
  const [spineVersion, setSpineVersion] = useState(project.spine_version ?? '')
  const [shareEnabled,       setShareEnabled]       = useState(project.share_enabled)
  const [shareInternalOnly, setShareInternalOnly] = useState(project.share_internal_only ?? false)
  const [allowDownload,   setAllowDownload]   = useState(project.allow_download ?? true)
  const [allowComments,   setAllowComments]   = useState(project.allow_comments ?? true)
  const [status,          setStatus]          = useState<'active' | 'archived'>(project.status)
  const [defaultSkin,  setDefaultSkin]  = useState(project.default_skin ?? '')
  const [cardBgType,   setCardBgType]   = useState<'color' | 'image'>(project.card_bg_type ?? 'color')
  const [cardBgValue,  setCardBgValue]  = useState(project.card_bg_value ?? '#3a3a3aff')
  const [bgUploading,  setBgUploading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const COLOR_PRESETS = [
    { label: 'Dark',        value: '#16161aff' },
    { label: 'Gray',        value: '#3a3a3aff' },
    { label: 'Charcoal',    value: '#2a2a2eff' },
    { label: 'White',       value: '#ffffffff' },
    { label: 'Green',       value: '#00b140ff' },
    { label: 'Blue',        value: '#1e3a5fff' },
    { label: 'Transparent', value: '#00000000' },
  ]

  async function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBgUploading(true)
    const r2Key = `backgrounds/${project.id}/${Date.now()}-${file.name}`
    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', project.id)
    formData.append('service_type', 'art')
    formData.append('r2_key', r2Key)
    formData.append('name', file.name)
    formData.append('file_type', file.name.split('.').pop()?.toLowerCase() ?? 'png')
    formData.append('task_id', 'null')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    setBgUploading(false)
    if (res.ok) {
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ''}/${r2Key}`
      setCardBgType('image')
      setCardBgValue(publicUrl)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setErrorMsg(null)
    const result = await updateProject(project.id, {
      name: name.trim() || project.name,
      description: description.trim() || null,
      spine_version: spineVersion || null,
      share_enabled: shareEnabled,
      share_internal_only: shareInternalOnly,
      allow_download: allowDownload,
      allow_comments: allowComments,
      status,
      card_bg_type: cardBgType,
      card_bg_value: cardBgValue,
      default_skin: defaultSkin.trim() || null,
    })
    setSaving(false)
    if (result.error) { setErrorMsg(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-sm">

      {/* ── Name ──────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
          Project Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* ── Description ───────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional notes for the client…"
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

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

      {/* ── Default Skin ──────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="default-skin-input"
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#666' }}
        >
          Default Skin
        </label>
        <input
          id="default-skin-input"
          type="text"
          value={defaultSkin}
          onChange={e => setDefaultSkin(e.target.value)}
          placeholder="e.g. SkinA (leave empty for no lock)"
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <p className="text-xs" style={{ color: '#444' }}>
          Locks this skin in the animation preview modal (exact Spine skin name)
        </p>
      </div>

      {/* ── Card Background ─────────────────────────── */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
          Card Background
        </label>
        {/* Color presets */}
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => { setCardBgType('color'); setCardBgValue(c.value) }}
              className="w-8 h-8 rounded-lg transition-all"
              title={c.label}
              style={{
                background: c.value === '#00000000'
                  ? 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 12px 12px'
                  : `#${c.value.slice(1, 7)}`,
                border: cardBgType === 'color' && cardBgValue === c.value
                  ? '2px solid #FF9500'
                  : '2px solid rgba(255,255,255,0.1)',
                boxShadow: cardBgType === 'color' && cardBgValue === c.value
                  ? '0 0 8px rgba(255,149,0,0.4)' : 'none',
              }}
            />
          ))}
        </div>
        {/* Custom color input */}
        {cardBgType === 'color' && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={`#${cardBgValue.slice(1, 7)}`}
              onChange={e => setCardBgValue(e.target.value + 'ff')}
              className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
              style={{ background: 'transparent' }}
            />
            <span className="text-xs" style={{ color: '#555' }}>Custom color</span>
          </div>
        )}
        {/* Image upload */}
        <div className="flex items-center gap-3">
          <label
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: cardBgType === 'image' ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
              border: cardBgType === 'image' ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: cardBgType === 'image' ? '#FF9500' : '#888',
            }}
          >
            {bgUploading ? 'Uploading…' : '📷 Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} disabled={bgUploading} />
          </label>
          {cardBgType === 'image' && (
            <button
              type="button"
              onClick={() => { setCardBgType('color'); setCardBgValue('#3a3a3aff') }}
              className="text-xs" style={{ color: '#EF4444' }}
            >
              Remove
            </button>
          )}
        </div>
        {/* Preview */}
        <div
          className="w-full h-20 rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            ...(cardBgType === 'image' && cardBgValue
              ? { backgroundImage: `url(${cardBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: cardBgValue && cardBgValue !== '#00000000' ? `#${cardBgValue.slice(1, 7)}` : 'rgba(255,255,255,0.02)' }),
          }}
        />
        <p className="text-xs" style={{ color: '#444' }}>
          Applied to all character cards in this project
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

      {/* ── Client permissions ───────────────────────── */}
      <div
        className="flex items-center justify-between rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <p className="text-sm font-medium text-white">Allow Downloads</p>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>
            Clients can download assets
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowDownload}
          onClick={() => setAllowDownload(!allowDownload)}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0"
          style={{
            background: allowDownload ? '#FF9500' : 'rgba(255,255,255,0.1)',
            boxShadow: allowDownload ? '0 0 8px rgba(255,149,0,0.4)' : 'none',
          }}
        >
          <span
            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
            style={{
              transform: allowDownload ? 'translateX(18px)' : 'translateX(3px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>

      <div
        className="flex items-center justify-between rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <p className="text-sm font-medium text-white">Allow Comments</p>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>
            Clients can post and view comments
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowComments}
          onClick={() => setAllowComments(!allowComments)}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0"
          style={{
            background: allowComments ? '#FF9500' : 'rgba(255,255,255,0.1)',
            boxShadow: allowComments ? '0 0 8px rgba(255,149,0,0.4)' : 'none',
          }}
        >
          <span
            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
            style={{
              transform: allowComments ? 'translateX(18px)' : 'translateX(3px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>

      {/* ── Internal only (visible when share is on) ──── */}
      {shareEnabled && (
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <p className="text-sm font-medium text-white">Internal Network Only</p>
            <p className="text-xs mt-0.5" style={{ color: '#555' }}>
              Share link accessible only from company IP (SHARE_INTERNAL_ALLOWED_IPS)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shareInternalOnly}
            onClick={() => setShareInternalOnly(!shareInternalOnly)}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0"
            style={{
              background: shareInternalOnly ? '#FF9500' : 'rgba(255,255,255,0.1)',
              boxShadow: shareInternalOnly ? '0 0 8px rgba(255,149,0,0.4)' : 'none',
            }}
          >
            <span
              className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
              style={{
                transform: shareInternalOnly ? 'translateX(18px)' : 'translateX(3px)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>
      )}

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
