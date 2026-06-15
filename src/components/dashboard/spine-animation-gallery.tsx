'use client'

import { useEffect, useState } from 'react'
import { SpineAvatarPreview } from './spine-avatar-preview'

interface SpineAnimationGalleryProps {
  taskId: string
  jsonName: string
  atlasName: string
  spineVersion: string
  /** Override the spine API base path. Defaults to '/api/spine'.
   *  Share pages pass '/api/share-spine/<token>' for anonymous access. */
  spineApiBase?: string
  /** Project-level card background */
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
  /** When set, pre-selects this skin and hides the skin picker so it cannot be changed. */
  lockedSkin?: string | null
}

/**
 * Renders one looping Spine view per animation found in the skeleton, with the
 * animation name underneath. A single Skin dropdown re-skins every view.
 * Animation/skin lists are read by parsing the skeleton .json directly (served
 * via the /api/spine proxy) so no manual switching is needed.
 */
export function SpineAnimationGallery({
  taskId,
  jsonName,
  atlasName,
  spineVersion,
  spineApiBase = '/api/spine',
  cardBgType,
  cardBgValue,
  lockedSkin,
}: SpineAnimationGalleryProps) {
  const jsonUrl = `${spineApiBase}/${taskId}/${encodeURIComponent(jsonName)}`
  const atlasUrl = `${spineApiBase}/${taskId}/${encodeURIComponent(atlasName)}`

  const [animations, setAnimations] = useState<string[]>([])
  const [skins, setSkins] = useState<string[]>([])
  const [skin, setSkin] = useState<string>(lockedSkin ?? '')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // Track which animation cells failed to render, with optional error message.
  const [cellErrors, setCellErrors] = useState<Record<string, string | true>>({})

  // Background from project-level setting
  const bg = cardBgType === 'color' && cardBgValue ? cardBgValue : '#00000000'
  const cellBg = cardBgType === 'color' && cardBgValue && cardBgValue !== '#00000000'
    ? `#${cardBgValue.slice(1, 7)}`
    : 'rgba(255,255,255,0.02)'

  useEffect(() => {
    let cancelled = false
    fetch(jsonUrl)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any
        const anims: string[] = d?.animations ? Object.keys(d.animations) : []
        let sk: string[] = []
        if (Array.isArray(d?.skins)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sk = d.skins.map((s: any) => s?.name).filter(Boolean)
        } else if (d?.skins && typeof d.skins === 'object') {
          sk = Object.keys(d.skins)
        }
        setAnimations(anims)
        setSkins(sk)
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [jsonUrl])

  const realSkins = skins.filter(s => s && s !== 'default')

  if (status === 'loading') {
    return <p className="text-xs" style={{ color: '#666' }}>Loading animations…</p>
  }
  if (status === 'error') {
    return <p className="text-xs" style={{ color: '#EF4444' }}>Failed to load Spine skeleton.</p>
  }
  if (animations.length === 0) {
    return <p className="text-xs" style={{ color: '#666' }}>No animations found in this skeleton.</p>
  }

  return (
    <div className="space-y-4">
      {/* Controls: pill buttons for background + skin */}
      {/* Controls: skin pills (background is now project-level) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Skin pills — hidden when skin is locked by project settings */}
        {realSkins.length > 0 && !lockedSkin && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSkin('')}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                background: skin === '' ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: skin === '' ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: skin === '' ? '#FF9500' : '#555',
              }}
            >
              Default
            </button>
            {realSkins.map(s => (
              <button
                key={s}
                onClick={() => setSkin(s)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: skin === s ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                  border: skin === s ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  color: skin === s ? '#FF9500' : '#555',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* One looping view per animation — portrait cells */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {animations.map(anim => {
          const cellKey = `${anim}-${skin}-${bg}`
          const hasError = cellErrors[cellKey]
          return (
            <div
              key={cellKey}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="aspect-[3/4] relative" style={{ background: cellBg }}>
                {hasError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3">
                    <p className="text-[10px] font-semibold" style={{ color: '#EF4444' }}>Preview error</p>
                    {typeof hasError === 'string' && (
                      <p className="text-[9px] text-center leading-tight break-words" style={{ color: '#666' }}>
                        {hasError.length > 80 ? hasError.slice(0, 80) + '…' : hasError}
                      </p>
                    )}
                  </div>
                ) : (
                  <SpineAvatarPreview
                    jsonUrl={jsonUrl}
                    atlasUrl={atlasUrl}
                    animationName={anim}
                    skinName={skin}
                    autoFit
                    backgroundColor={bg}
                    spineVersion={spineVersion}
                    onError={(msg) => setCellErrors(prev => ({ ...prev, [cellKey]: msg || true }))}
                  />
                )}
              </div>
              <div
                className="px-3 py-2.5 shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wider truncate"
                  style={{ color: '#888' }}
                  title={anim}
                >
                  {anim}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
