'use client'

import { useEffect, useState } from 'react'
import { SpineAvatarPreview } from './spine-avatar-preview'

interface SpineAnimationGalleryProps {
  taskId: string
  jsonName: string
  atlasName: string
  spineVersion: string
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
}: SpineAnimationGalleryProps) {
  const jsonUrl = `/api/spine/${taskId}/${encodeURIComponent(jsonName)}`
  const atlasUrl = `/api/spine/${taskId}/${encodeURIComponent(atlasName)}`

  const [animations, setAnimations] = useState<string[]>([])
  const [skins, setSkins] = useState<string[]>([])
  const [skin, setSkin] = useState<string>('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

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
      {/* Skin selector (only when the skeleton has real skins) */}
      {realSkins.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
            Skin
          </label>
          <select
            value={skin}
            onChange={e => setSkin(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="">— Default —</option>
            {realSkins.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* One looping view per animation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {animations.map(anim => (
          <div
            key={`${anim}-${skin}`}
            className="rounded-xl overflow-hidden flex flex-col"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="aspect-square relative" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <SpineAvatarPreview
                jsonUrl={jsonUrl}
                atlasUrl={atlasUrl}
                animationName={anim}
                skinName={skin}
                spineVersion={spineVersion}
              />
            </div>
            <div className="px-2.5 py-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-medium text-white truncate" title={anim}>{anim}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
