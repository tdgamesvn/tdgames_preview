'use client'

import { useRef, useState } from 'react'
import { SpineAvatarPreview, type SpineAvatarPreviewHandle } from '@/components/dashboard/spine-avatar-preview'

interface SpineHeroConfig {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  spineVersion: string
  spineAvatarBg: string
}

interface ShowcaseHeroProps {
  characterName: string
  spineConfig?: SpineHeroConfig
  artUrl?: string
  animations?: string[]
}

export function ShowcaseHero({
  characterName,
  spineConfig,
  artUrl,
  animations: initialAnimations = [],
}: ShowcaseHeroProps) {
  const spineRef = useRef<SpineAvatarPreviewHandle>(null)
  const [activeAnim, setActiveAnim] = useState(spineConfig?.animationName ?? '')
  const [animations, setAnimations] = useState<string[]>(initialAnimations)
  const [spineError, setSpineError] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const showSpine = Boolean(spineConfig) && !spineError
  const showArt = !showSpine && Boolean(artUrl)
  const showPlaceholder = !showSpine && !showArt

  function handleChipClick(name: string) {
    setActiveAnim(name)
    spineRef.current?.setAnimation(name)
  }

  const heroBg = showSpine && spineConfig?.spineAvatarBg && spineConfig.spineAvatarBg !== '#00000000'
    ? `#${spineConfig.spineAvatarBg.slice(1, 7)}`
    : '#0a0a0a'

  return (
    <div className="-mx-4 sm:-mx-6" style={{ position: 'relative' }}>
      {/* Hero zone */}
      <div
        style={{
          height: 'clamp(280px, 55vh, 680px)',
          position: 'relative',
          overflow: 'hidden',
          background: heroBg,
        }}
      >
        {/* Spine */}
        {showSpine && spineConfig && (
          <SpineAvatarPreview
            ref={spineRef}
            jsonUrl={spineConfig.jsonUrl}
            atlasUrl={spineConfig.atlasUrl}
            animationName={spineConfig.animationName}
            autoFit
            backgroundColor={spineConfig.spineAvatarBg}
            spineVersion={spineConfig.spineVersion}
            onError={() => setSpineError(true)}
            onLoaded={(data) => {
              if (data.animations.length > 0) setAnimations(data.animations)
            }}
          />
        )}

        {/* Art hero */}
        {showArt && (
          <button
            className="absolute inset-0 w-full h-full"
            onClick={() => setLightboxOpen(true)}
            aria-label="Expand image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artUrl}
              alt={characterName}
              className="w-full h-full object-contain"
            />
          </button>
        )}

        {/* Placeholder */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              style={{
                fontSize: '8rem', fontWeight: 900,
                color: 'rgba(255,149,0,0.06)',
                userSelect: 'none',
                textTransform: 'uppercase',
              }}
            >
              {characterName.charAt(0)}
            </span>
          </div>
        )}

        {/* Bottom fade */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '80px',
            background: 'linear-gradient(to top, #080808 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Animation chips overlaying bottom of hero */}
        {showSpine && animations.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-3 pt-4"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
          >
            {animations.map(anim => (
              <button
                key={anim}
                onClick={() => handleChipClick(anim)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: activeAnim === anim ? 'rgba(255,149,0,0.2)' : 'rgba(0,0,0,0.5)',
                  border: activeAnim === anim ? '1px solid rgba(255,149,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeAnim === anim ? '#FF9500' : '#666',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {anim}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Art lightbox */}
      {lightboxOpen && artUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artUrl}
            alt={characterName}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white p-2 text-2xl"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
