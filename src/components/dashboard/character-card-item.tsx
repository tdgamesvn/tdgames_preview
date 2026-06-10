'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SpineAvatarPreview } from './spine-avatar-preview'
import type { PrvTask } from '@/lib/types/database'

export interface SpineCardConfig {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  skinName?: string
  scale: number
  offsetX: number
  offsetY: number
  spineVersion: string
}

interface CharacterCardItemProps {
  task: PrvTask
  href: string
  artUrl?: string
  spineConfig?: SpineCardConfig
  /** Project-level card background: 'color' or 'image' */
  cardBgType?: 'color' | 'image'
  /** Hex color or public image URL */
  cardBgValue?: string
}

export function CharacterCardItem({ task, href, artUrl, spineConfig, cardBgType, cardBgValue }: CharacterCardItemProps) {
  const router = useRouter()
  const [spineError, setSpineError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const initial = task.name.charAt(0).toUpperCase()
  const showSpine = Boolean(spineConfig) && !spineError
  const showArt = !showSpine && Boolean(artUrl)
  const showPlaceholder = !showSpine && !showArt

  return (
    <div
      onClick={() => router.push(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer rounded-2xl overflow-hidden flex flex-col w-full"
      style={{
        aspectRatio: '2/3',
        background: 'rgba(255,255,255,0.03)',
        border: hovered ? '1px solid rgba(255,149,0,0.45)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: hovered ? '0 8px 40px rgba(255,149,0,0.18), 0 0 0 1px rgba(255,149,0,0.1)' : 'none',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'border-color 250ms ease, box-shadow 250ms ease, transform 250ms ease',
      }}
    >
      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          style={{
            position: 'absolute', inset: 0,
            ...(cardBgType === 'image' && cardBgValue
              ? { backgroundImage: `url(${cardBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: cardBgValue && cardBgValue !== '#00000000' ? `#${cardBgValue.slice(1, 7)}` : 'rgba(255,255,255,0.02)' }),
          }}
        />
        {showSpine && (
          <SpineAvatarPreview
            {...spineConfig!}
            autoFit
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            backgroundColor={(task as any).avatar_bg ?? '#00000000'}
            onError={() => setSpineError(true)}
          />
        )}
        {showArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artUrl}
            alt={task.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
              style={{ background: 'rgba(255,149,0,0.1)', color: 'rgba(255,149,0,0.4)' }}
            >
              {initial}
            </div>
          </div>
        )}
      </div>

      {/* Name footer — reveals "View →" on hover */}
      <div
        className="px-3 shrink-0 flex items-center justify-between overflow-hidden"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          height: hovered ? '44px' : '36px',
          transition: 'height 250ms ease',
          background: hovered ? 'rgba(255,149,0,0.04)' : 'transparent',
        }}
      >
        <p className="text-xs font-semibold text-white truncate">{task.name}</p>
        <span
          className="text-[9px] font-black uppercase tracking-widest flex-shrink-0 ml-2 transition-opacity"
          style={{ color: '#FF9500', opacity: hovered ? 1 : 0 }}
        >
          View →
        </span>
      </div>
    </div>
  )
}
