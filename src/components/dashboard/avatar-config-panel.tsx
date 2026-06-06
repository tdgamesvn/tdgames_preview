'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { SpineAvatarPreview } from './spine-avatar-preview'
import { updateTaskAvatar } from '@/lib/actions/tasks'
import type { PrvTask, PrvAsset } from '@/lib/types/database'

interface AvatarConfigPanelProps {
  task: PrvTask
  projectId: string
  clientId: string
  spineVersion: string | null
  /** All animation assets belonging to this task */
  animationAssets: PrvAsset[]
  /** Presigned URL per animation asset id → { jsonUrl, atlasUrl } */
  assetPresignedUrls: Record<string, { jsonUrl: string; atlasUrl: string }>
}

export function AvatarConfigPanel({
  task,
  projectId,
  clientId,
  spineVersion,
  animationAssets,
  assetPresignedUrls,
}: AvatarConfigPanelProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Form state
  const [assetId, setAssetId]       = useState<string>(task.avatar_asset_id ?? '')
  const [animation, setAnimation]   = useState<string>(task.avatar_animation ?? '')
  const [scale, setScale]           = useState<number>(task.avatar_scale ?? 1)
  const [offsetX, setOffsetX]       = useState<number>(task.avatar_offset_x ?? 0)
  const [offsetY, setOffsetY]       = useState<number>(task.avatar_offset_y ?? 0)

  // Derive animation options from selected asset's metadata
  const selectedAsset = animationAssets.find(a => a.id === assetId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const animOptions: string[] = (selectedAsset?.metadata as any)?.animations ?? []

  // Live preview URLs for the selected asset
  const previewUrls = assetId ? assetPresignedUrls[assetId] : undefined

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateTaskAvatar({
        task_id: task.id,
        project_id: projectId,
        client_id: clientId,
        avatar_asset_id: assetId || null,
        avatar_animation: animation || null,
        avatar_scale: scale,
        avatar_offset_x: offsetX,
        avatar_offset_y: offsetY,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{ background: 'rgba(255,149,0,0.03)', border: '1px solid rgba(255,149,0,0.15)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FF9500' }}>
        Avatar Configuration
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Controls */}
        <div className="space-y-4">
          {/* Animation asset */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
              Spine Animation Asset
            </label>
            <select
              value={assetId}
              onChange={e => { setAssetId(e.target.value); setAnimation('') }}
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="">— None —</option>
              {animationAssets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Animation name */}
          {animOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
                Animation
              </label>
              <select
                value={animation}
                onChange={e => setAnimation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">— Default (first) —</option>
                {animOptions.map(anim => (
                  <option key={anim} value={anim}>{anim}</option>
                ))}
              </select>
            </div>
          )}

          {/* Scale */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
              Scale ({scale.toFixed(1)})
            </label>
            <input
              type="range" min={0.1} max={5} step={0.1}
              value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              className="w-full accent-[#FF9500]"
            />
          </div>

          {/* Offset */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
                Offset X
              </label>
              <input
                type="number" step={1}
                value={offsetX}
                onChange={e => setOffsetX(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
                Offset Y
              </label>
              <input
                type="number" step={1}
                value={offsetY}
                onChange={e => setOffsetY(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: '#FF9500', color: '#080808' }}
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saved ? 'Saved!' : 'Save Avatar'}
          </button>

          {error && (
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          )}
        </div>

        {/* Live preview */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest self-start" style={{ color: '#555' }}>
            Preview
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              width: '200px',
              height: '200px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {previewUrls && spineVersion ? (
              <SpineAvatarPreview
                key={`${assetId}-${animation}-${scale}-${offsetX}-${offsetY}`}
                jsonUrl={previewUrls.jsonUrl}
                atlasUrl={previewUrls.atlasUrl}
                animationName={animation || animOptions[0] || 'idle'}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                spineVersion={spineVersion}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black"
                  style={{ background: 'rgba(255,149,0,0.12)', color: '#FF9500' }}
                >
                  {task.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px]" style={{ color: '#444' }}>
            {assetId ? 'Live Spine preview' : 'Select an asset to preview'}
          </p>
        </div>
      </div>
    </div>
  )
}
