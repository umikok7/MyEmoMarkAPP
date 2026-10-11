"use client"

import * as React from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  HOUR_HEIGHT,
  clampMinute,
  formatMinuteLabel,
  getBlockColorTheme,
  snapMinute,
} from "../utils"
import type { DailyBlock, TimeRange } from "../types"

interface DayGridProps {
  blocks: DailyBlock[]
  partnerBlocks: DailyBlock[]
  isLoading: boolean
  viewMode: "me" | "both"
  currentTime: Date
  selectedDate: Date
  draftRange: TimeRange | null
  onDraftStart: (startMinute: number) => void
  onDraftMove: (endMinute: number) => void
  onDraftCommit: (range: TimeRange) => void
  onDraftCancel: () => void
  onBlockClick: (block: DailyBlock) => void
}

const GRID_TOTAL_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES
const HOURS_VISIBLE = 20

export function DayGrid({
  blocks,
  partnerBlocks,
  isLoading,
  viewMode,
  currentTime,
  selectedDate,
  draftRange,
  onDraftStart,
  onDraftMove,
  onDraftCommit,
  onDraftCancel,
  onBlockClick,
}: DayGridProps) {
  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const activePointerRef = React.useRef<number | null>(null)
  const startMinuteRef = React.useRef<number | null>(null)
  const longPressTimerRef = React.useRef<number | null>(null)

  const pixelsPerMinute = HOUR_HEIGHT / 60
  const gridHeight = (GRID_TOTAL_MINUTES / 60) * HOUR_HEIGHT

  const minuteFromPointer = React.useCallback(
    (clientY: number) => {
      const rect = gridRef.current?.getBoundingClientRect()
      if (!rect) {return DAY_START_MINUTES}
      const offset = clampMinute(
        DAY_START_MINUTES + ((clientY - rect.top) / rect.height) * GRID_TOTAL_MINUTES
      )
      return snapMinute(offset)
    },
    []
  )

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  React.useEffect(() => clearLongPressTimer, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== null) {return}
    const target = event.target as HTMLElement
    if (target.closest("[data-block-id]")) {return}

    const minute = minuteFromPointer(event.clientY)
    startMinuteRef.current = minute
    activePointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)

    const activateDrafting = () => {
      onDraftStart(minute)
      if (navigator.vibrate) {navigator.vibrate(10)}
    }

    if (event.pointerType === "touch" || event.pointerType === "mouse") {
      longPressTimerRef.current = window.setTimeout(activateDrafting, 150)
      return
    }
    activateDrafting()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draftRange || activePointerRef.current !== event.pointerId) {return}
    const startMinute = startMinuteRef.current
    if (startMinute === null) {return}
    onDraftMove(minuteFromPointer(event.clientY))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    clearLongPressTimer()
    if (!draftRange || activePointerRef.current !== event.pointerId) {
      onDraftCancel()
      return
    }
    const startMinute = startMinuteRef.current
    if (startMinute === null) {
      onDraftCancel()
      return
    }
    const range = { start: startMinute, end: minuteFromPointer(event.clientY) }
    onDraftCommit(range)
  }

  const handlePointerCancel = () => {
    clearLongPressTimer()
    onDraftCancel()
  }

  // 当天时自动滚动到当前时刻
  React.useEffect(() => {
    const selectedDateKey = selectedDate.toDateString()
    if (selectedDateKey !== new Date().toDateString()) {return}
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
    if (currentMinutes < DAY_START_MINUTES || currentMinutes > DAY_END_MINUTES) {return}

    const scrollContainer = scrollRef.current
    if (!scrollContainer) {return}
    const top = (currentMinutes - DAY_START_MINUTES) * pixelsPerMinute
    scrollContainer.scrollTo({
      top: Math.max(0, top - scrollContainer.clientHeight / 2),
      behavior: "smooth",
    })
  }, [currentTime, selectedDate, pixelsPerMinute])

  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const showNowIndicator =
    isToday && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES

  const renderBlock = (block: DailyBlock, index: number, isPartner: boolean) => {
    const theme = getBlockColorTheme(index)
    const top = (block.start_minute - DAY_START_MINUTES) * pixelsPerMinute
    const height = Math.max((block.end_minute - block.start_minute) * pixelsPerMinute, 32)
    return (
      <div
        key={block.id}
        data-block-id={block.id}
        onClick={(event) => {
          event.stopPropagation()
          if (!isPartner) {onBlockClick(block)}
        }}
        className={cn(
          "absolute left-1 right-1 rounded-lg border px-2 py-1.5 text-xs",
          theme.bg,
          theme.border,
          theme.text,
          isPartner && "opacity-60",
          !isPartner && "cursor-pointer"
        )}
        style={{ top, height }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium truncate">{block.title}</span>
          <span className="text-[9px] opacity-60 shrink-0">
            {formatMinuteLabel(block.start_minute)}
          </span>
        </div>
        {block.note ? (
          <p className="mt-0.5 text-[9px] opacity-70 whitespace-normal break-words">{block.note}</p>
        ) : null}
      </div>
    )
  }

  return (
    <section className="px-5 pt-6">
      <div className="grid grid-cols-[25px_1fr_1fr] gap-1 mb-2">
        <div />
        <div className="flex items-center gap-2 pl-1">
          <span className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
            <User className="w-3 h-3 text-stone-500" />
          </span>
          <span className="text-xs font-semibold text-stone-600 uppercase tracking-[0.2em]">我的</span>
        </div>
        <div className={cn("flex items-center gap-2 pl-1", viewMode === "me" && "opacity-50")}>
          <span className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
            <User className="w-3 h-3 text-stone-500" />
          </span>
          <span className="text-xs font-semibold text-stone-600 uppercase tracking-[0.2em]">对方</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative overflow-y-auto overscroll-contain"
        style={{ maxHeight: "60vh" }}
      >
        {showNowIndicator && (
          <div
            className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
            style={{ top: `calc(${(nowMinutes - DAY_START_MINUTES) * pixelsPerMinute}px - 4px)` }}
          >
            <div className="w-[25px] shrink-0 pl-0.5 justify-end" />
            <div className="w-2 h-2 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0" />
            <div className="flex-1 h-[1px] bg-gradient-to-r from-red-400 via-orange-400 to-transparent rounded-full" />
          </div>
        )}

        <div className="grid grid-cols-[25px_1fr_1fr] gap-1">
          <div className="relative text-[10px] text-stone-400" style={{ height: gridHeight }}>
            {Array.from({ length: HOURS_VISIBLE }).map((_, index) => {
              const hour = 5 + index
              return (
                <div
                  key={hour}
                  className="absolute left-0 leading-none"
                  style={{ top: (hour * 60 - DAY_START_MINUTES) * pixelsPerMinute }}
                >
                  {String(hour).padStart(2, "0")}
                </div>
              )
            })}
          </div>

          <div
            ref={gridRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="relative rounded-xl bg-white/80 border border-black/[0.04] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden select-none touch-pan-y"
            style={{
              height: gridHeight,
              userSelect: "none",
              touchAction: "none",
              backgroundImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)",
              backgroundSize: `${HOUR_HEIGHT}px ${HOUR_HEIGHT}px, ${HOUR_HEIGHT / 2}px ${HOUR_HEIGHT / 2}px`,
              backgroundPosition: "0 0, 0 0",
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-400">
                Loading...
              </div>
            )}
            {blocks.map((block, index) => renderBlock(block, index, false))}
            {draftRange && (
              <div
                className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-stone-400/60 bg-stone-100/40 backdrop-blur-sm"
                style={{
                  top: (draftRange.start - DAY_START_MINUTES) * pixelsPerMinute,
                  height: Math.max(
                    (draftRange.end - draftRange.start) * pixelsPerMinute,
                    32
                  ),
                }}
              >
                <div className="px-5 py-1 text-[9px] text-stone-500">
                  {formatMinuteLabel(draftRange.start)} - {formatMinuteLabel(draftRange.end)}
                </div>
              </div>
            )}
          </div>

          <div
            className={cn(
              "relative rounded-xl bg-white/70 border border-black/[0.04] shadow-[0_6px_18px_rgba(0,0,0,0.05)] overflow-hidden pointer-events-none",
              viewMode === "me" && "opacity-50"
            )}
            style={{
              height: gridHeight,
              backgroundImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)",
              backgroundSize: `${HOUR_HEIGHT}px ${HOUR_HEIGHT}px, ${HOUR_HEIGHT / 2}px ${HOUR_HEIGHT / 2}px`,
              backgroundPosition: "0 0, 0 0",
            }}
          >
            {partnerBlocks.map((block, index) => renderBlock(block, index, true))}
          </div>
        </div>
      </div>
    </section>
  )
}
