"use client"

import * as React from "react"

interface UseLongPressOptions {
  delay?: number
  movementThreshold?: number
}

export function useLongPress(
  onLongPress: (event: React.PointerEvent) => void,
  options?: UseLongPressOptions,
) {
  const { delay = 500, movementThreshold = 10 } = options ?? {}
  const timerRef = React.useRef<number | null>(null)
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null)
  const triggeredRef = React.useRef(false)
  const pointerIdRef = React.useRef<number | null>(null)

  const cancel = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPosRef.current = null
    pointerIdRef.current = null
  }, [])

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return
      triggeredRef.current = false
      startPosRef.current = { x: event.clientX, y: event.clientY }
      pointerIdRef.current = event.pointerId

      timerRef.current = window.setTimeout(() => {
        triggeredRef.current = true
        if (navigator.vibrate) navigator.vibrate(15)
        onLongPress(event)
        cancel()
      }, delay)
    },
    [onLongPress, delay, cancel],
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      if (timerRef.current === null || !startPosRef.current) return
      const dx = event.clientX - startPosRef.current.x
      const dy = event.clientY - startPosRef.current.y
      if (Math.hypot(dx, dy) > movementThreshold) {
        cancel()
      }
    },
    [movementThreshold, cancel],
  )

  const handlePointerEnd = React.useCallback(() => {
    cancel()
  }, [cancel])

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onPointerLeave: handlePointerEnd,
    triggeredRef,
  }
}