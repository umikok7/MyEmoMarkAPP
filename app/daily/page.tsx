"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { DayStrip } from "@/components/DayStrip"
import { formatDateLabel, formatMonthYear } from "@/lib/date"
import { useAuthStore } from "@/store/use-auth-store"
import { useCoupleSpaces } from "@/features/couple"
import {
  BlockEditorSheet,
  DayGrid,
  useDayBlockMutations,
  useDayBlocks,
  normalizeTimeRange,
  type DailyBlock,
  type TimeRange,
} from "@/features/time-blocks"

type ViewMode = "me" | "both"

const NOW_TICK_MS = 60_000

const pickPartnerId = (
  spaces: Array<{ user_id_1: string; user_id_2: string }>,
  userId: string | null
): string | null => {
  const accepted = spaces[0]
  if (!accepted || !userId) {return null}
  return accepted.user_id_1 === userId ? accepted.user_id_2 : accepted.user_id_1
}

export default function DailyPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [viewMode, setViewMode] = React.useState<ViewMode>("both")
  const [draftRange, setDraftRange] = React.useState<TimeRange | null>(null)
  const [draftTitle, setDraftTitle] = React.useState("")
  const [draftNote, setDraftNote] = React.useState("")
  const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(() => new Date())

  const { userId } = useAuthStore()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { data: spaces } = useCoupleSpaces({ enabled: isLoggedIn })
  const partnerId = pickPartnerId(spaces ?? [], userId)

  const { blocks, partnerBlocks, isLoading } = useDayBlocks(selectedDate, userId, partnerId)
  const { saveBlock, editBlock, removeBlock } = useDayBlockMutations(selectedDate, userId, blocks)
  const isSaving = saveBlock.isPending || editBlock.isPending || removeBlock.isPending

  React.useEffect(() => {
    const tick = () => { setCurrentTime(new Date()); }
    tick()
    const interval = window.setInterval(tick, NOW_TICK_MS)
    return () => { window.clearInterval(interval); }
  }, [])

  const closeEditor = React.useCallback(() => {
    setIsEditorOpen(false)
    setDraftTitle("")
    setDraftNote("")
    setEditingBlockId(null)
    setDraftRange(null)
  }, [])

  const handleDraftStart = (startMinute: number) => {
    setEditingBlockId(null)
    setDraftRange({ start: startMinute, end: startMinute })
  }

  const handleDraftMove = (minute: number) => {
    setDraftRange((prev) => (prev ? normalizeTimeRange(prev.start, minute) : prev))
  }

  const handleDraftCommit = (range: TimeRange) => {
    setDraftRange(normalizeTimeRange(range.start, range.end))
    setIsEditorOpen(true)
  }

  const handleBlockClick = (block: DailyBlock) => {
    setEditingBlockId(block.id)
    setDraftRange({ start: block.start_minute, end: block.end_minute })
    setDraftTitle(block.title)
    setDraftNote(block.note ?? "")
    setIsEditorOpen(true)
  }

  const handleSubmit = () => {
    if (!draftRange) {return}
    const title = draftTitle.trim()
    if (!title) {
      setIsEditorOpen(true)
      return
    }
    if (editingBlockId) {
      editBlock.mutate(
        { blockId: editingBlockId, draft: { range: draftRange, title, note: draftNote.trim() } },
        { onSuccess: closeEditor }
      )
      return
    }
    saveBlock.mutate(
      { range: draftRange, title, note: draftNote.trim() },
      { onSuccess: closeEditor }
    )
  }

  const handleDelete = () => {
    if (!editingBlockId) {return}
    removeBlock.mutate(editingBlockId, { onSuccess: closeEditor })
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f2eb_0%,#fffaf4_45%,#ffffff_100%)] text-foreground flex justify-center">
      <main className="w-full max-w-md pb-32">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.03] shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="px-6 pt-[env(safe-area-inset-top)] pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-serif font-semibold text-foreground/90 mt-2">
                {formatMonthYear(selectedDate)}
              </h1>
              <div className="relative top-4 inline-flex items-center rounded-full bg-white/80 border border-stone-100 shadow-sm p-1">
                {(["me", "both"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setViewMode(mode); }}
                    className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-semibold tracking-[0.04em] uppercase transition cursor-pointer",
                      viewMode === mode ? "bg-black text-white" : "text-stone-500"
                    )}
                  >
                    {mode === "me" ? "我的" : "两者"}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-stone-500 tracking-wide">{formatDateLabel(selectedDate)}</p>
          </div>

          <div className="px-6 pb-3">
            <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        </header>

        <DayGrid
          blocks={blocks}
          partnerBlocks={partnerBlocks}
          isLoading={isLoading}
          viewMode={viewMode}
          currentTime={currentTime}
          selectedDate={selectedDate}
          draftRange={draftRange}
          onDraftStart={handleDraftStart}
          onDraftMove={handleDraftMove}
          onDraftCommit={handleDraftCommit}
          onDraftCancel={() => { setDraftRange(null); }}
          onBlockClick={handleBlockClick}
        />
      </main>

      {isEditorOpen && draftRange && (
        <BlockEditorSheet
          range={draftRange}
          title={draftTitle}
          note={draftNote}
          editingBlockId={editingBlockId}
          isSaving={isSaving}
          onTitleChange={setDraftTitle}
          onNoteChange={setDraftNote}
          onClose={closeEditor}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
