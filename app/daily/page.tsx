"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/api"
import { DayStrip } from "@/components/day-strip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateLabel, formatMonthYear, toDateKey } from "@/lib/date"
import { Lock, User } from "lucide-react"

type DailyBlock = {
  id: string
  user_id: string
  title: string
  note?: string
  task_date: string
  start_minute: number
  end_minute: number
  color_tag?: string | null
  created_at: string
  updated_at: string
}

type TimeRange = {
  start: number
  end: number
}

const DAY_START_MINUTES = 5 * 60
const DAY_END_MINUTES = 25 * 60
const SLOT_MINUTES = 30
const HOUR_HEIGHT = 64

const colorThemes = [
  {
    key: "peach",
    bg: "bg-[#fde8dd]",
    border: "border-[#f5c8b6]",
    text: "text-[#9b4a39]",
  },
  {
    key: "sun",
    bg: "bg-[#f7efd7]",
    border: "border-[#e5d7aa]",
    text: "text-[#8a6a2a]",
  },
  {
    key: "lavender",
    bg: "bg-[#ece7f6]",
    border: "border-[#d6c9ef]",
    text: "text-[#5a4c83]",
  },
  {
    key: "sky",
    bg: "bg-[#e5f0f6]",
    border: "border-[#c8dce8]",
    text: "text-[#3a667d]",
  },
]

const formatMinuteLabel = (minutes: number) => {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

const clampMinute = (value: number) =>
  Math.min(Math.max(value, DAY_START_MINUTES), DAY_END_MINUTES)

const snapMinute = (value: number) =>
  Math.round(value / SLOT_MINUTES) * SLOT_MINUTES

const normalizeRange = (start: number, end: number): TimeRange => {
  const [low, high] = start <= end ? [start, end] : [end, start]
  if (high - low < SLOT_MINUTES) {
    const nextEnd = Math.min(low + SLOT_MINUTES, DAY_END_MINUTES)
    return { start: low, end: nextEnd }
  }
  return { start: low, end: high }
}

export default function DailyPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [viewMode, setViewMode] = React.useState<"me" | "both">("both")
  const [userId, setUserId] = React.useState<string | null>(null)
  const [partnerId, setPartnerId] = React.useState<string | null>(null)
  const [blocks, setBlocks] = React.useState<DailyBlock[]>([])
  const [partnerBlocks, setPartnerBlocks] = React.useState<DailyBlock[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isEditorOpen, setIsEditorOpen] = React.useState(false)
  const [draftRange, setDraftRange] = React.useState<TimeRange | null>(null)
  const [draftTitle, setDraftTitle] = React.useState("")
  const [draftNote, setDraftNote] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null)
  const [currentTime, setCurrentTime] = React.useState(new Date())

  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const activePointerId = React.useRef<number | null>(null)
  const startMinuteRef = React.useRef<number | null>(null)
  const longPressTimerRef = React.useRef<number | null>(null)
  const isSelectingRef = React.useRef(false)

  const totalMinutes = DAY_END_MINUTES - DAY_START_MINUTES
  const pixelsPerMinute = HOUR_HEIGHT / 60
  const gridHeight = (totalMinutes / 60) * HOUR_HEIGHT

  const resetSelection = React.useCallback(() => {
    setDraftRange(null)
    startMinuteRef.current = null
    isSelectingRef.current = false
    activePointerId.current = null
  }, [])

  const getMinuteFromPointer = React.useCallback(
    (clientY: number) => {
      const rect = gridRef.current?.getBoundingClientRect()
      if (!rect) return DAY_START_MINUTES
      const offset = clampMinute(
        DAY_START_MINUTES + ((clientY - rect.top) / rect.height) * totalMinutes
      )
      return snapMinute(offset)
    },
    [totalMinutes]
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isSaving) return
    if (activePointerId.current !== null) return

    // 如果点击的是日程块本身，不进入选择模式（让 block 的 onClick 处理）
    const target = event.target as HTMLElement
    if (target.closest('[data-block-id]')) return

    const minute = getMinuteFromPointer(event.clientY)
    startMinuteRef.current = minute
    activePointerId.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)

    const activateSelection = () => {
      isSelectingRef.current = true
      if (navigator.vibrate) navigator.vibrate(10)
      setDraftRange({ start: minute, end: minute })
    }

    if (event.pointerType === "touch" || event.pointerType === "mouse") {
      longPressTimerRef.current = window.setTimeout(activateSelection, 150)
      return
    }

    activateSelection()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSelectingRef.current || activePointerId.current !== event.pointerId) return
    const startMinute = startMinuteRef.current
    if (startMinute === null) return
    const currentMinute = getMinuteFromPointer(event.clientY)
    setDraftRange(normalizeRange(startMinute, currentMinute))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!isSelectingRef.current || activePointerId.current !== event.pointerId) {
      resetSelection()
      return
    }

    const startMinute = startMinuteRef.current
    if (startMinute === null) {
      resetSelection()
      return
    }

    const endMinute = getMinuteFromPointer(event.clientY)
    const range = normalizeRange(startMinute, endMinute)
    setDraftRange(range)
    setIsEditorOpen(true)
    isSelectingRef.current = false
  }

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    resetSelection()
  }

  const closeEditor = React.useCallback(() => {
    setIsEditorOpen(false)
    setDraftTitle("")
    setDraftNote("")
    setEditingBlockId(null)
    resetSelection()
  }, [resetSelection])

  const handleBlockClick = (block: DailyBlock) => {
    setEditingBlockId(block.id)
    setDraftRange({ start: block.start_minute, end: block.end_minute })
    setDraftTitle(block.title)
    setDraftNote(block.note || "")
    setIsEditorOpen(true)
  }

  const handleDeleteBlock = async () => {
    if (!editingBlockId) return
    setIsSaving(true)
    try {
      const response = await fetch(buildApiUrl(`/daily-blocks/${editingBlockId}`), {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete block")
      setBlocks((prev) => prev.filter((b) => b.id !== editingBlockId))
      toast("已删除")
      closeEditor()
    } catch (error) {
      console.error("Daily block delete failed", error)
      toast("删除失败", { description: "请重试", duration: 2000 })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateBlock = async () => {
    if (!editingBlockId || !draftRange) return
    const title = draftTitle.trim()
    if (!title) {
      toast("Title required", { description: "Please enter a title", duration: 2000 })
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch(buildApiUrl(`/daily-blocks/${editingBlockId}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          note: draftNote.trim() || null,
          start_minute: draftRange.start,
          end_minute: draftRange.end,
        }),
      })
      if (!response.ok) throw new Error("Failed to update block")
      const json = await response.json()
      const record = json?.data?.record as DailyBlock | undefined
      if (record) {
        setBlocks((prev) =>
          prev
            .map((b) => (b.id === editingBlockId ? record : b))
            .sort((a, b) => a.start_minute - b.start_minute)
        )
        toast("已更新", { description: record.title, duration: 1800 })
      }
      closeEditor()
    } catch (error) {
      console.error("Daily block update failed", error)
      toast("更新失败", { description: "请重试", duration: 2000 })
    } finally {
      setIsSaving(false)
    }
  }

  const fetchBlocks = React.useCallback(async () => {
    if (!userId) {
      setBlocks([])
      setPartnerBlocks([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const dateKey = toDateKey(selectedDate)
      const [userRes, partnerRes] = await Promise.all([
        fetch(buildApiUrl("/daily-blocks", { date: dateKey, user_id: userId }), {
          credentials: "include",
        }),
        partnerId
          ? fetch(buildApiUrl("/daily-blocks", { date: dateKey, user_id: partnerId }), {
              credentials: "include",
            })
          : Promise.resolve(null),
      ])

      const userJson = userRes.ok ? await userRes.json() : null
      const partnerJson = partnerRes?.ok ? await partnerRes.json() : null

      setBlocks((userJson?.data?.items || []) as DailyBlock[])
      setPartnerBlocks((partnerJson?.data?.items || []) as DailyBlock[])
    } catch (error) {
      console.error("Daily blocks fetch failed", error)
    } finally {
      setIsLoading(false)
    }
  }, [partnerId, selectedDate, userId])

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(buildApiUrl("/auth/profile"), { credentials: "include" })
        const json = await res.json()
        const profile = json?.data?.user as { id: string } | null
        setUserId(profile?.id ?? null)
      } catch (error) {
        console.error("Failed to load profile", error)
      }
    }

    loadProfile()
  }, [])

  React.useEffect(() => {
    const loadPartner = async () => {
      if (!userId) return
      try {
        const res = await fetch(buildApiUrl("/couple-spaces"), { credentials: "include" })
        if (!res.ok) return
        const json = await res.json()
        const spaces = (json?.data?.items || []) as Array<{ user_id_1: string; user_id_2: string }>
        const space = spaces[0]
        if (!space) return
        const partner = space.user_id_1 === userId ? space.user_id_2 : space.user_id_1
        setPartnerId(partner)
      } catch (error) {
        console.error("Failed to load partner", error)
      }
    }

    loadPartner()
  }, [userId])

  React.useEffect(() => {
    fetchBlocks()
  }, [userId, partnerId, fetchBlocks])

  // Update current time every minute
  React.useEffect(() => {
    const tick = () => setCurrentTime(new Date())
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to current time indicator on mount and when currentTime changes
  React.useEffect(() => {
    const selectedDateKey = toDateKey(selectedDate)
    const todayDateKey = toDateKey(new Date())
    if (selectedDateKey !== todayDateKey) return

    const now = currentTime
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    if (currentMinutes < DAY_START_MINUTES || currentMinutes > DAY_END_MINUTES) return

    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const top = (currentMinutes - DAY_START_MINUTES) * pixelsPerMinute
    const viewportHeight = scrollContainer.clientHeight
    const targetScroll = Math.max(0, top - viewportHeight / 2)
    scrollContainer.scrollTo({ top: targetScroll, behavior: "smooth" })
  }, [currentTime, selectedDate, pixelsPerMinute])

  const handleSaveBlock = async () => {
    if (!draftRange || !userId) return
    const title = draftTitle.trim()
    if (!title) {
      toast("Title required", { description: "Please enter a title", duration: 2000 })
      return
    }

    const hasOverlap = blocks.some(
      (block) =>
        Math.max(block.start_minute, draftRange.start) <
        Math.min(block.end_minute, draftRange.end)
    )

    if (hasOverlap) {
      toast("Time conflict", { description: "Choose an open time range", duration: 2200 })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(buildApiUrl("/daily-blocks"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          note: draftNote.trim() || null,
          task_date: toDateKey(selectedDate),
          start_minute: draftRange.start,
          end_minute: draftRange.end,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save block")
      }

      const json = await response.json()
      const record = json?.data?.record as DailyBlock | undefined
      if (record) {
        setBlocks((prev) => [...prev, record].sort((a, b) => a.start_minute - b.start_minute))
        toast("Saved", { description: record.title, duration: 1800 })
      }
      closeEditor()
    } catch (error) {
      console.error("Daily block save failed", error)
      toast("Save failed", { description: "Please try again", duration: 2000 })
    } finally {
      setIsSaving(false)
    }
  }

  const renderBlocks = (items: DailyBlock[], isPartner?: boolean) =>
    items.map((block, index) => {
      const theme = colorThemes[index % colorThemes.length]
      const top = (block.start_minute - DAY_START_MINUTES) * pixelsPerMinute
      const height = Math.max((block.end_minute - block.start_minute) * pixelsPerMinute, 32)
      const showNote = height >= 48 && block.note
      return (
        <div
          key={block.id}
          data-block-id={block.id}
          onClick={(e) => {
            e.stopPropagation()
            handleBlockClick(block)
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
            <p className="mt-0.5 text-[9px] opacity-70 whitespace-normal wrap-break-word">{block.note}</p>
          ) : null}
        </div>
      )
    })

  const selectionOverlay = draftRange && (isSelectingRef.current || isEditorOpen) && (
    <div
      className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-stone-400/60 bg-stone-100/40 backdrop-blur-sm"
      style={{
        top: (draftRange.start - DAY_START_MINUTES) * pixelsPerMinute,
        height: Math.max((draftRange.end - draftRange.start) * pixelsPerMinute, 32),
      }}
    >
      <div className="px-5 py-1 text-[9px] text-stone-500">
        {formatMinuteLabel(draftRange.start)} - {formatMinuteLabel(draftRange.end)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f2eb_0%,#fffaf4_45%,#ffffff_100%)] text-foreground flex justify-center">
      <main className="w-full max-w-md pb-32">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.03] shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="px-6 pt-[env(safe-area-inset-top)] pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-foreground/90 mt-2">
                  {formatMonthYear(selectedDate)}
                </h1>
              </div>
              <div className="relative top-4 inline-flex items-center rounded-full bg-white/80 border border-stone-100 shadow-sm p-1">
                <button
                  onClick={() => setViewMode("me")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[5px] font-semibold tracking-[0.04em] uppercase transition",
                    viewMode === "me" ? "bg-black text-white" : "text-stone-500"
                  )}
                >
                  我的
                </button>
                <button
                  onClick={() => setViewMode("both")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[5px] font-semibold tracking-[0.04em] uppercase transition",
                    viewMode === "both" ? "bg-black text-white" : "text-stone-500"
                  )}
                >
                  两者
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-stone-500 tracking-wide">{formatDateLabel(selectedDate)}</p>
          </div>

          <div className="px-6 pb-3">
            <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        </header>

        <section className="px-5 pt-6">
          {/* Header row */}
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

          {/* Time axis + Grids row */}
          <div
            ref={scrollRef}
            className="relative overflow-y-auto overscroll-contain"
            style={{ maxHeight: "60vh" }}
          >
            {/* Current time indicator - spans all columns */}
            {(() => {
              const selectedDateKey = toDateKey(selectedDate)
              const todayDateKey = toDateKey(new Date())
              if (selectedDateKey !== todayDateKey) return null

              const now = currentTime
              const currentMinutes = now.getHours() * 60 + now.getMinutes()
              if (currentMinutes < DAY_START_MINUTES || currentMinutes > DAY_END_MINUTES) return null

              const top = (currentMinutes - DAY_START_MINUTES) * pixelsPerMinute
              const hours = now.getHours()
              const minutes = now.getMinutes()
              const timeLabel = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`

              return (
                <div
                  className="absolute left-0 right-0 flex items-center pointer-events-none z-20 "
                  style={{ top: `calc(${top}px - 4px)` }}
                >
                  {/* Time label in axis column */}
                  <div className="w-[25px] shrink-0 pl-0.5 justify-end">
                    {/* <span className="text-[9px] font-medium text-red-500">
                      {timeLabel}
                    </span> */}
                  </div>
                  {/* Dot at boundary */}
                  <div className="w-2 h-2 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0" />
                  {/* Line spanning across both grids */}
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-red-400 via-orange-400 to-transparent rounded-full" />
                </div>
              )
            })()}

            <div className="grid grid-cols-[25px_1fr_1fr] gap-1">
            <div
              className="relative text-[10px] text-stone-400"
              style={{ height: gridHeight }}
            >
              {Array.from({ length: 20 }).map((_, index) => {
                const hour = 5 + index
                const top = (hour * 60 - DAY_START_MINUTES) * pixelsPerMinute
                return (
                  <div
                    key={`hour-${hour}`}
                    className="absolute left-0 leading-none"
                    style={{ top }}
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
                WebkitUserSelect: "none",
                userSelect: "none",
                touchAction: "none",
                backgroundImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)",
                backgroundSize: `${HOUR_HEIGHT}px ${HOUR_HEIGHT}px, ${HOUR_HEIGHT / 2}px ${HOUR_HEIGHT / 2}px`,
                backgroundPosition: `0 0, 0 0`,
              }}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-400">
                  Loading...
                </div>
              ) : blocks.length === 0 ? (
                <div className="absolute inset-0" />
              ) : null}
              {renderBlocks(blocks)}
              {selectionOverlay}
            </div>

            <div className={cn("relative rounded-xl bg-white/70 border border-black/[0.04] shadow-[0_6px_18px_rgba(0,0,0,0.05)] overflow-hidden pointer-events-none", viewMode === "me" && "opacity-50")}
              style={{
                height: gridHeight,
                backgroundImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)",
                backgroundSize: `${HOUR_HEIGHT}px ${HOUR_HEIGHT}px, ${HOUR_HEIGHT / 2}px ${HOUR_HEIGHT / 2}px`,
                backgroundPosition: `0 0, 0 0`,
              }}
            >
              {partnerBlocks.length === 0 ? (
                <div className="absolute inset-0" />
              ) : null}
              {renderBlocks(partnerBlocks, true)}
            </div>
          </div>
          </div>
        </section>
      </main>

      {isEditorOpen && draftRange ? (
        <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center bg-black/20">
          <div className="w-full max-w-md rounded-t-3xl bg-white px-6 py-5 shadow-[0_-10px_30px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-[0.3em]">
                  {editingBlockId ? "编辑计划" : "新计划"}
                </p>
                <h3 className="text-lg font-semibold text-stone-800 mt-1">
                  {formatMinuteLabel(draftRange.start)} - {formatMinuteLabel(draftRange.end)}
                </h3>
              </div>
              <button
                onClick={closeEditor}
                className="text-xs text-stone-400 hover:text-stone-600 transition"
              >
                关闭
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="写下你的计划..."
              />
              <Textarea
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="备注"
                className="min-h-[90px]"
              />
              <div className="flex gap-2">
                {editingBlockId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 rounded-full"
                    onClick={handleDeleteBlock}
                    disabled={isSaving}
                  >
                    {isSaving ? "删除中..." : "删除"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-full"
                    onClick={closeEditor}
                    disabled={isSaving}
                  >
                    取消
                  </Button>
                )}
                <Button
                  type="button"
                  className="flex-1 rounded-full bg-foreground text-white hover:bg-foreground/90"
                  onClick={editingBlockId ? handleUpdateBlock : handleSaveBlock}
                  disabled={isSaving}
                >
                  {isSaving ? "保存中..." : editingBlockId ? "修改" : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
