'use client'

import { useMemo, useState, useTransition } from 'react'
import { Save, Loader2 } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SpineAvatarPreview, type SpineLoadedData } from './spine-avatar-preview'
import { updateTaskAvatar } from '@/lib/actions/tasks'
import type { PrvTask, PrvAsset } from '@/lib/types/database'

interface AvatarConfigPanelProps {
  task: PrvTask
  projectId: string
  clientId: string
  spineVersion: string | null
  /** All animation assets belonging to this task (json + atlas + png) */
  animationAssets: PrvAsset[]
  /** Project-level card background */
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
}

function stripExt(name: string): string {
  return name.replace(/\.[^./]+$/, '')
}

export function AvatarConfigPanel({
  task,
  projectId,
  clientId,
  spineVersion,
  animationAssets,
  cardBgType,
  cardBgValue,
}: AvatarConfigPanelProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Form state
  const [assetId, setAssetId]     = useState<string>(task.avatar_asset_id ?? '')
  const [animation, setAnimation] = useState<string>(task.avatar_animation ?? '')
  const [skin, setSkin]           = useState<string>(task.avatar_skin ?? '')
  const [scale, setScale]         = useState<number>(task.avatar_scale ?? 1)
  const [offsetX, setOffsetX]     = useState<number>(task.avatar_offset_x ?? 0)
  const [offsetY, setOffsetY]     = useState<number>(task.avatar_offset_y ?? 0)
  // Background is now a project-level setting (card_bg_type/card_bg_value)
  // Spine canvas always uses transparent so the project bg shows through
  const bg = '#00000000'

  // Animations + skins discovered at runtime from the loaded skeleton.
  const [loaded, setLoaded] = useState<SpineLoadedData | null>(null)

  // Only Spine skeletons (.json) are selectable as the avatar source.
  const jsonAssets = useMemo(
    () => animationAssets.filter(a => a.file_type === 'json' || a.name.endsWith('.json')),
    [animationAssets]
  )

  const selectedAsset = jsonAssets.find(a => a.id === assetId)

  // Build proxy URLs for the selected skeleton; the texture (.png) resolves
  // relative to the atlas URL automatically (see /api/spine route).
  const previewUrls = useMemo(() => {
    if (!selectedAsset) return undefined
    const base = stripExt(selectedAsset.name)
    const atlasAsset = animationAssets.find(
      a => (a.file_type === 'atlas' || a.name.endsWith('.atlas')) && stripExt(a.name) === base
    )
    if (!atlasAsset) return undefined
    return {
      jsonUrl: `/api/spine/${task.id}/${encodeURIComponent(selectedAsset.name)}`,
      atlasUrl: `/api/spine/${task.id}/${encodeURIComponent(atlasAsset.name)}`,
    }
  }, [selectedAsset, animationAssets, task.id])

  const animOptions = loaded?.animations ?? []
  // Spine always has a "default" skin; only offer the selector when there are real skins.
  const skinOptions = (loaded?.skins ?? []).filter(s => s && s !== 'default')

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
        avatar_skin: skin || null,
        avatar_bg: null,
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

  const triggerStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#F0F0F0',
  }
  const contentStyle = {
    background: '#161616',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
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
          {/* Animation asset (.json only) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
              Spine Animation Asset
            </label>
            <Select
              value={assetId}
              onValueChange={v => { setAssetId(v === '__none__' ? '' : (v ?? '')); setAnimation(''); setSkin(''); setLoaded(null) }}
            >
              <SelectTrigger className="w-full h-9 text-sm" style={triggerStyle}>
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent style={contentStyle}>
                <SelectItem value="__none__">— None —</SelectItem>
                {jsonAssets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Animation (from skeleton) */}
          {animOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
                Animation
              </label>
              <Select value={animation || '__default__'} onValueChange={v => setAnimation(v === '__default__' ? '' : (v ?? ''))}>
                <SelectTrigger className="w-full h-9 text-sm" style={triggerStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={contentStyle}>
                  <SelectItem value="__default__">— Default (first) —</SelectItem>
                  {animOptions.map(anim => (
                    <SelectItem key={anim} value={anim}>{anim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Skin (from skeleton) */}
          {skinOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
                Skin
              </label>
              <Select value={skin || '__default__'} onValueChange={v => setSkin(v === '__default__' ? '' : (v ?? ''))}>
                <SelectTrigger className="w-full h-9 text-sm" style={triggerStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={contentStyle}>
                  <SelectItem value="__default__">— Default —</SelectItem>
                  {skinOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                style={triggerStyle}
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
                style={triggerStyle}
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
              border: '1px solid rgba(255,255,255,0.07)',
              ...(cardBgType === 'image' && cardBgValue
                ? { backgroundImage: `url(${cardBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: cardBgValue && cardBgValue !== '#00000000' ? `#${cardBgValue.slice(1, 7)}` : 'rgba(255,255,255,0.02)' }),
            }}
          >
            {previewUrls && spineVersion ? (
              <SpineAvatarPreview
                key={`${assetId}-${animation}-${skin}`}
                jsonUrl={previewUrls.jsonUrl}
                atlasUrl={previewUrls.atlasUrl}
                animationName={animation}
                skinName={skin}
                autoFit
                backgroundColor={cardBgType === 'color' && cardBgValue ? cardBgValue : bg}
                spineVersion={spineVersion}
                onLoaded={setLoaded}
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
            {!spineVersion
              ? 'Set a Spine version in project settings'
              : assetId ? 'Live Spine preview' : 'Select an asset to preview'}
          </p>
        </div>
      </div>
    </div>
  )
}
