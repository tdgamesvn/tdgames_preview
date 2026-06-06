'use client'

import { useEffect, useRef } from 'react'

export interface SpineLoadedData {
  animations: string[]
  skins: string[]
}

interface SpineAvatarPreviewProps {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  skinName?: string
  scale?: number
  offsetX?: number
  offsetY?: number
  spineVersion: string
  onError?: () => void
  /** Called once the skeleton is loaded, exposing its animations + skins. */
  onLoaded?: (data: SpineLoadedData) => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getScriptUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

export function SpineAvatarPreview({
  jsonUrl,
  atlasUrl,
  animationName,
  skinName,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  spineVersion,
  onError,
  onLoaded,
}: SpineAvatarPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  // Keep latest callbacks without forcing the player to re-init on every render.
  const onErrorRef = useRef(onError)
  const onLoadedRef = useRef(onLoaded)
  onErrorRef.current = onError
  onLoadedRef.current = onLoaded

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

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
          onErrorRef.current?.()
          return
        }

        initializedRef.current = true

        new SpinePlayerClass(containerRef.current, {
          jsonUrl,
          atlasUrl,
          animation: animationName || undefined,
          skin: skinName || undefined,
          showControls: false,
          backgroundColor: '#00000000',
          premultipliedAlpha: true,
          defaultMix: 0.2,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          success: (player: any) => {
            if (cancelled) return
            try {
              const data = player?.skeleton?.data
              if (data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const animations: string[] = (data.animations ?? []).map((a: any) => a.name).filter(Boolean)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const skins: string[] = (data.skins ?? []).map((s: any) => s.name).filter(Boolean)
                onLoadedRef.current?.({ animations, skins })
              }
            } catch {
              /* non-fatal: dropdowns just stay empty */
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: () => {
            if (!cancelled) onErrorRef.current?.()
          },
        })
      } catch {
        if (!cancelled) onErrorRef.current?.()
      }
    }

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [jsonUrl, atlasUrl, animationName, skinName, scale, offsetX, offsetY, spineVersion])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  )
}
