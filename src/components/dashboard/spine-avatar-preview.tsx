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
  /** When true, the player auto-fits each animation's bounds to the box, and
   *  scale/offset are applied as a CSS transform on top (manual zoom/move). */
  autoFit?: boolean
  /** Canvas clear color (hex, 8-digit allows alpha). Default transparent. */
  backgroundColor?: string
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
  autoFit = false,
  backgroundColor = '#00000000',
  spineVersion,
  onError,
  onLoaded,
}: SpineAvatarPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  // Keep latest values without forcing the player to re-init on every change.
  const onErrorRef = useRef(onError)
  const onLoadedRef = useRef(onLoaded)
  const scaleRef = useRef(scale)
  const offsetXRef = useRef(offsetX)
  const offsetYRef = useRef(offsetY)
  onErrorRef.current = onError
  onLoadedRef.current = onLoaded
  scaleRef.current = scale
  offsetXRef.current = offsetX
  offsetYRef.current = offsetY

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

        // autoFit → let the player compute each animation's bounding box and fit
        // it (with padding); manual scale/offset are applied via CSS transform.
        // Otherwise use a fixed 200-unit world window driven by scale/offset.
        const viewport = autoFit
          ? { padLeft: '6%', padRight: '6%', padTop: '6%', padBottom: '6%' }
          : {
              x: -100 * scaleRef.current + offsetXRef.current,
              y: -100 * scaleRef.current + offsetYRef.current,
              width: 200 * scaleRef.current,
              height: 200 * scaleRef.current,
              padLeft: '0%',
              padRight: '0%',
              padTop: '0%',
              padBottom: '0%',
            }

        new SpinePlayerClass(containerRef.current, {
          jsonUrl,
          atlasUrl,
          animation: animationName || undefined,
          skin: skinName || undefined,
          showControls: false,
          backgroundColor,
          premultipliedAlpha: true,
          defaultMix: 0.2,
          viewport,
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
    // scale/offset are intentionally excluded: in autoFit they're CSS-only (no
    // re-init); in fixed mode they're read once at init via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonUrl, atlasUrl, animationName, skinName, autoFit, backgroundColor, spineVersion])

  // In autoFit mode, manual zoom/move is a CSS transform so dragging the
  // sliders updates instantly without reloading the skeleton.
  const transform =
    autoFit && (scale !== 1 || offsetX !== 0 || offsetY !== 0)
      ? `translate(${offsetX}%, ${offsetY}%) scale(${scale})`
      : undefined

  return (
    <div
      className="w-full h-full"
      style={{ background: 'transparent', transform, transformOrigin: 'center' }}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
