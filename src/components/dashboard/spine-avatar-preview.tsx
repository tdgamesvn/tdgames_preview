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
  /** Called when the Spine player fails. Optional message describes the error. */
  onError?: (message?: string) => void
  /** Called once the skeleton is loaded, exposing its animations + skins. */
  onLoaded?: (data: SpineLoadedData) => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getScriptUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

/**
 * Module-level promise cache: ensures concurrent Spine players all await the
 * SAME load promise instead of each assuming "script element present = loaded".
 * Without this, cards 2+ skip the await and hit window.spine = undefined.
 */
const spineScriptPromises: Partial<Record<string, Promise<void>>> = {}

function ensureSpineScript(version: string): Promise<void> {
  const scriptId = `spine-js-${version}`
  if (spineScriptPromises[scriptId]) return spineScriptPromises[scriptId]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).spine?.SpinePlayer) {
    spineScriptPromises[scriptId] = Promise.resolve()
    return spineScriptPromises[scriptId]
  }

  const existing = document.getElementById(scriptId)
  if (existing) {
    // Script tag in DOM but not yet loaded — attach to its events.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).spine?.SpinePlayer) {
      // Already loaded (load event fired before we attached listener)
      spineScriptPromises[scriptId] = Promise.resolve()
      return spineScriptPromises[scriptId]
    }
    spineScriptPromises[scriptId] = new Promise<void>((resolve, reject) => {
      const onLoad = () => resolve()
      const onError = () => {
        delete spineScriptPromises[scriptId] // clear so next attempt retries
        reject(new Error(`Failed to load Spine v${version}`))
      }
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener('error', onError, { once: true })
    })
    return spineScriptPromises[scriptId]
  }

  spineScriptPromises[scriptId] = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = scriptId
    script.src = getScriptUrl(version)
    script.onload = () => resolve()
    script.onerror = () => {
      delete spineScriptPromises[scriptId] // clear so next attempt retries
      reject(new Error(`Failed to load Spine v${version}`))
    }
    document.body.appendChild(script)
  })
  return spineScriptPromises[scriptId]
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

        // Catch uncaught Spine runtime errors (e.g. "Region not found in atlas")
        // that are thrown inside requestAnimationFrame and bypass both try/catch
        // and the SpinePlayer's error callback.
        let errorFired = false
        function onWindowError(event: ErrorEvent) {
          if (errorFired || cancelled) return
          const msg = event.message || event.error?.message || ''
          // Only catch errors originating from the Spine runtime script
          const src = event.filename || ''
          if (src.includes('spine-player') || msg.includes('Region not found') || msg.includes('spine')) {
            errorFired = true
            event.preventDefault() // suppress console noise
            onErrorRef.current?.(msg)
          }
        }
        window.addEventListener('error', onWindowError)

        try {
          await ensureSpineScript(spineVersion)

          if (cancelled || !containerRef.current) return

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const SpinePlayerClass = (window as any).spine?.SpinePlayer
          if (!SpinePlayerClass) {
            onErrorRef.current?.('Spine runtime failed to load')
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

          // Store the player reference immediately so cleanup can dispose it
          // even if the component unmounts before success/error fires.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const player = new SpinePlayerClass(containerRef.current, {
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
            success: (p: any) => {
              if (cancelled) {
                try { p?.dispose?.() } catch { /* ignore */ }
                return
              }
              playerInstanceRef.current = p
              // Remove the global listener once successfully loaded
              window.removeEventListener('error', onWindowError)
              // Force SpinePlayer container transparent so project bg shows
              if (containerRef.current) {
                containerRef.current.querySelectorAll('div').forEach(d => {
                  (d as HTMLElement).style.background = 'transparent'
                })
              }
              try {
                const data = p?.skeleton?.data
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
            error: (_p: unknown, msg: string) => {
              if (!cancelled && !errorFired) {
                errorFired = true
                onErrorRef.current?.(msg || 'Spine player error')
              }
            },
          })
          // Fallback: store player in ref if success hasn't fired yet
          if (!playerInstanceRef.current) playerInstanceRef.current = player

          // Override SpinePlayer's default black CSS background on ALL child divs
          // so the project-level bg color (via WebGL clear) shows correctly.
          // SpinePlayer creates various wrapper divs with black bg — force them all transparent.
          if (containerRef.current) {
            const allDivs = containerRef.current.querySelectorAll('div')
            allDivs.forEach(d => { (d as HTMLElement).style.background = 'transparent' })
          }
        } catch (err) {
          if (!cancelled && !errorFired) {
            errorFired = true
            onErrorRef.current?.(err instanceof Error ? err.message : 'Spine init failed')
          }
        }

        // Safety: remove global listener after 10s if neither success nor error fired
        setTimeout(() => window.removeEventListener('error', onWindowError), 10000)
      }

      return () => {
        cancelled = true
        observer.disconnect()
        // Reset so effect re-runs on prop changes can re-initialize
        initializedRef.current = false
        // Dispose the player to release WebGL context
        try {
          playerInstanceRef.current?.dispose?.()
        } catch {
          /* ignore disposal errors */
        }
        playerInstanceRef.current = null
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
