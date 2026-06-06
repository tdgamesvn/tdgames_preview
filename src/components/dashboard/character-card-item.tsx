'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SpineAvatarPreview } from './spine-avatar-preview'
import type { PrvTask } from '@/lib/types/database'

export interface SpineCardConfig {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  scale: number
  offsetX: number
  offsetY: number
  spineVersion: string
}

interface CharacterCardItemProps {
  task: PrvTask
  href: string
  artUrl?: string          // presigned URL of first art asset (fallback #2)
  spineConfig?: SpineCardConfig  // Spine avatar config (fallback #1 > artUrl)
}

export function CharacterCardItem({ task, href, artUrl, spineConfig }: CharacterCardItemProps) {
  const router = useRouter()
  const [spineError, setSpineError] = useState(false)

  const initial = task.name.charAt(0).toUpperCase()
  const showSpine = Boolean(spineConfig) && !spineError
  const showArt = !showSpine && Boolean(artUrl)
  const showPlaceholder = !showSpine && !showArt

  return (
    <div
      onClick={() => router.push(href)}
      className="cursor-pointer rounded-2xl overflow-hidden flex flex-col transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        width: '200px',
        height: '260px',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.border = '1px solid rgba(255,149,0,0.45)'
        el.style.background = 'rgba(255,149,0,0.04)'
        el.style.boxShadow = '0 0 0 1px rgba(255,149,0,0.15)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.border = '1px solid rgba(255,255,255,0.08)'
        el.style.background = 'rgba(255,255,255,0.03)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Preview area */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {showSpine && (
          <SpineAvatarPreview
            {...spineConfig!}
            onError={() => setSpineError(true)}
          />
        )}
        {showArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artUrl}
            alt={task.name}
            className="w-full h-full object-cover"
          />
        )}
        {showPlaceholder && (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
              style={{ background: 'rgba(255,149,0,0.12)', color: '#FF9500' }}
            >
              {initial}
            </div>
          </div>
        )}
      </div>

      {/* Name footer */}
      <div
        className="px-3 py-2.5 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-sm font-semibold text-white truncate">{task.name}</p>
      </div>
    </div>
  )
}
