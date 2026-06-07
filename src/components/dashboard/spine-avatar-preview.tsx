'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface SpineAvatarPreviewHandle {
  setAnimation: (name: string) => void
}

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

export const SpineAvatarPreview = forwardRef<SpineAvatarPreviewHandle, SpineAvatarPreviewProps>(
  function SpineAvatarPreview(
    {
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
    }: SpineAvatarPreviewProps,
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const initializedRef = useRef(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerInstanceRef = useRef<any>(null)
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

    useImperativeHandle(ref, () => ({
      setAnimation: (name: string) => {
        try {
          playerInstanceRef.current?.animationState?.setAnimation(0, name, true)
        } catch {
          /* non-fatal */
        }
      },
    }))

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
              playerInstanceRef.current = player
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
                /* non-fatal */
              }
            },
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jsonUrl, atlasUrl, animationName, skinName, autoFit, backgroundColor, spineVersion])

    // In autoFit mode, scale/offsetX/offsetY are only meaningful in viewport mode.
    // Do NOT apply them as CSS transforms — that would push the canvas off-screen
    // when world-unit values (e.g. scale=5, offsetY=1000) are stored in the DB.
    return (
      <div className="w-full h-full" style={{ background: 'transparent' }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    )
  }
)

SpineAvatarPreview.displayName = 'SpineAvatarPreview'
