'use client'

import { useEffect, useRef } from 'react'

interface SpineAvatarPreviewProps {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  scale?: number
  offsetX?: number
  offsetY?: number
  spineVersion: string
  onError?: () => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getScriptUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

export function SpineAvatarPreview({
  jsonUrl,
  atlasUrl,
  animationName,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  spineVersion,
  onError,
}: SpineAvatarPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    // Defer init until card enters viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !initializedRef.current) {
          observer.disconnect()
          init()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(container)

    async function init() {
      if (cancelled) return
      try {
        // Load Spine runtime (shared across all avatar instances)
        const scriptId = `spine-js-${spineVersion}`
        if (!document.getElementById(scriptId)) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.id = scriptId
            script.src = getScriptUrl(spineVersion)
            script.onload = () => resolve()
            script.onerror = () => reject(new Error(`Failed to load Spine v${spineVersion}`))
            document.body.appendChild(script)
          })
        }

        if (cancelled || !containerRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpinePlayerClass = (window as any).spine?.SpinePlayer
        if (!SpinePlayerClass) {
          onError?.()
          return
        }

        initializedRef.current = true

        new SpinePlayerClass(containerRef.current, {
          jsonUrl,
          atlasUrl,
          animation: animationName || 'idle',
          showControls: false,
          backgroundColor: '#00000000',
          premultipliedAlpha: true,
          defaultMix: 0.2,
          // Position and scale the skeleton inside the card
          viewport: {
            x: -100 * scale + offsetX,
            y: -100 * scale + offsetY,
            width: 200 * scale,
            height: 200 * scale,
            padLeft: '0%',
            padRight: '0%',
            padTop: '0%',
            padBottom: '0%',
          },
        })
      } catch {
        if (!cancelled) onError?.()
      }
    }

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [jsonUrl, atlasUrl, animationName, scale, offsetX, offsetY, spineVersion, onError])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  )
}
