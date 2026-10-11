"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Heart, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/surface-card"
import { toast } from "sonner"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { getMoodMeta, type MoodType } from "@/features/moods"
import { useAuthStore } from "@/store/use-auth-store"
import { useSpaceStore } from "@/features/couple"
import { useMoodRecordMutations } from "../hooks"
import type { HistorySpace } from "../api"
import type { JournalEntry, PinnedCollection } from "../types"
import { AuthorBadge } from "./AuthorBadge"
import { PinCollectionMenu } from "./PinCollectionMenu"

interface TimelineCardProps {
  entry: JournalEntry
  space: HistorySpace
  onPinned?: (moodId: string, collection: PinnedCollection) => void
}

export function TimelineCard({ entry, space, onPinned }: TimelineCardProps) {
  const userId = useAuthStore((state) => state.userId)
  const coupleSpaceId = useSpaceStore((state) => state.coupleSpaceId)

  const { updateMood, deleteMood, toggleLike, pinToCollection } = useMoodRecordMutations(
    space,
    coupleSpaceId,
    userId
  )

  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editNote, setEditNote] = React.useState(entry.note)
  const [isLiked, setIsLiked] = React.useState(Boolean(entry.liked_by_user_id))
  const [pinnedCollection, setPinnedCollection] = React.useState<PinnedCollection>(
    entry.pinned_collection ?? null
  )
  const [isPinMenuOpen, setIsPinMenuOpen] = React.useState(false)
  const [pinAnchorRect, setPinAnchorRect] = React.useState<DOMRect | null>(null)
  const pinButtonRef = React.useRef<HTMLButtonElement | null>(null)

  const config = getMoodMeta(entry.mood as MoodType)
  const canEditEntry = entry.is_mine !== false
  const canLike = entry.is_mine === false
  const canPin = space === "couple" && entry.is_mine === true

  const handleLike = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!canLike) {return}
    if (navigator.vibrate) {navigator.vibrate(8)}

    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    toggleLike.mutate(
      { moodId: entry.id, liked: nextLiked },
      {
        onError: () => {
          setIsLiked(!nextLiked)
          toast("操作失败", { description: "请重试", duration: 2000 })
        },
      }
    )
  }

  const openPinMenu = () => {
    if (!canPin || pinToCollection.isPending) {return}
    const rect = pinButtonRef.current?.getBoundingClientRect()
    if (!rect) {return}
    setPinAnchorRect(rect)
    setIsPinMenuOpen(true)
  }

  const { triggeredRef: _pinLongPressTriggered, ...longPressHandlers } = useLongPress(openPinMenu, {
    delay: 500,
  })

  const handlePinSelect = (collection: PinnedCollection) => {
    setIsPinMenuOpen(false)
    if (collection === pinnedCollection) {return}
    const previous = pinnedCollection
    setPinnedCollection(collection)
    pinToCollection.mutate(
      { moodId: entry.id, collection },
      {
        onError: () => {
          setPinnedCollection(previous)
          toast("操作失败", { description: "请重试", duration: 2000 })
        },
      }
    )
    onPinned?.(entry.id, collection)
  }

  const handleEditButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (isEditing) {
      if (!editNote.trim()) {
        toast("内容不能为空", { duration: 2000 })
        return
      }
      updateMood.mutate(
        {
          moodId: entry.id,
          mood: entry.mood as MoodType,
          intensity: entry.intensity,
          note: editNote,
          tags: entry.tags,
        },
        {
          onSuccess: () => {
            toast("已更新", { description: "已焕然一新。", duration: 2000 })
            setIsEditing(false)
            setIsExpanded(false)
          },
          onError: () => {
            toast("保存失败", { description: "请稍后重试。", duration: 2200 })
          },
        }
      )
      return
    }
    setEditNote(entry.note)
    setIsEditing(true)
    setIsExpanded(true)
  }

  const handleCancelEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setEditNote(entry.note)
    setIsEditing(false)
    setIsExpanded(false)
  }

  const handleConfirmDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    deleteMood.mutate(entry.id, {
      onSuccess: () => {
        toast("已删除", { description: "那段记忆被轻轻放下了。", duration: 2000 })
        setIsDeleteOpen(false)
      },
      onError: () => {
        toast("删除失败", { description: "请稍后重试。", duration: 2200 })
      },
    })
  }

  const editButtonLabel = updateMood.isPending ? "保存中" : isEditing ? "保存" : "编辑"

  const card = (
    <div className="border-b border-stone-200/70">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isEditing) {
            setIsExpanded(!isExpanded)
          }
        }}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !isEditing) {
            event.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        className="flex w-full cursor-pointer items-stretch gap-3 py-1.5 text-left"
      >
        <span className={cn("my-0.5 w-1 shrink-0 rounded-full", config?.dot ?? "bg-stone-300")} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className={cn("truncate text-sm font-semibold", config?.color)}>{config?.label ?? entry.mood}</h3>
              {entry.is_mine !== undefined && <AuthorBadge isMine={entry.is_mine} />}
              {isLiked && <Heart className="h-3 w-3 shrink-0 fill-rose-400/30 text-rose-400/70" aria-label="已读" />}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <time className="font-mono text-xs text-muted-foreground/65">{entry.time}</time>
              {canPin && (
                <button
                  ref={pinButtonRef}
                  type="button"
                  onClick={(event) => { event.stopPropagation() }}
                  {...longPressHandlers}
                  className="rounded p-1 text-muted-foreground/50 hover:bg-stone-100 disabled:opacity-50"
                  title="长按选择合集"
                  disabled={pinToCollection.isPending}
                  aria-label="长按选择置顶合集"
                >
                  <Pin className={cn("h-3.5 w-3.5", pinnedCollection && "fill-current")} />
                </button>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-0.5">
              <textarea
                value={editNote}
                onChange={(event) => { setEditNote(event.target.value) }}
                onClick={(event) => { event.stopPropagation() }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation()
                    setEditNote(entry.note)
                    setIsEditing(false)
                  }
                }}
                rows={Math.min(8, Math.max(1, Math.ceil(editNote.length / 42)))}
                autoFocus
                className="mt-0.5 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-[inherit] text-xs font-normal leading-5 text-muted-foreground/75 whitespace-pre-wrap focus:outline-none"
              />
              <div className="mt-1 flex justify-end gap-3 text-[11px]">
                <button type="button" className="text-muted-foreground" onClick={handleCancelEdit}>取消</button>
                <button type="button" className="font-medium text-foreground/75" onClick={handleEditButtonClick} disabled={updateMood.isPending}>
                  {editButtonLabel}
                </button>
              </div>
            </div>
          ) : (
            <p className={cn("mt-0.5 text-xs leading-5 text-muted-foreground/75", isExpanded ? "whitespace-pre-wrap" : "line-clamp-1")}>
              {entry.note || "暂无记录"}
            </p>
          )}
        </div>
      </div>

      {isExpanded && !isEditing && (
        <div className="ml-4 space-y-2 pb-2.5 pl-3">
          {!isEditing && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {entry.tags.map((tag) => <span key={tag} className="text-[11px] text-muted-foreground/70">#{tag}</span>)}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 text-[8px]">
            {canLike ? (
              <button type="button" className={cn("inline-flex min-h-8 items-center gap-1 text-muted-foreground/60", isLiked && "text-rose-500")} onClick={handleLike}>
                <Heart className={cn("h-3 w-3", isLiked && "fill-current")} />
                {isLiked ? "已读" : "标记已读"}
              </button>
            ) : <span />}
            <div className="flex items-center gap-3">
              {canEditEntry && (
                <button type="button" className="font-medium text-foreground/75" onClick={handleEditButtonClick} disabled={updateMood.isPending}>
                  {editButtonLabel}
                </button>
              )}
              {canEditEntry && (
                <button type="button" className="text-muted-foreground/60" onClick={(event) => { event.stopPropagation(); setIsDeleteOpen(true) }}>删除</button>
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleteOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-sm"
            onClick={() => { setIsDeleteOpen(false); }}
          >
            <SurfaceCard
              variant="solid"
              className="w-[92%] max-w-sm p-6 animate-[fade-scale_0.25s_ease-out] shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)]"
              onClick={(event) => { event.preventDefault(); }}
            >
              <h3 className="text-base font-light text-foreground/85 tracking-wide">Remove this memory?</h3>
              <p className="text-xs text-muted-foreground/70 mt-3 leading-relaxed">
                You cannot undo this action. If this entry feels heavy, it is okay to let it go.
              </p>
              <div className="mt-5 h-px w-full bg-stone-200/60" />
              <div className="mt-4 flex items-center justify-end gap-4 text-xs">
                <button
                  type="button"
                  className="text-stone-400/80 hover:text-stone-600 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                  onClick={(event) => {
                    event.preventDefault()
                    setIsDeleteOpen(false)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="text-[#a67c5b]/80 hover:text-[#8f6647] transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                  onClick={handleConfirmDelete}
                  disabled={deleteMood.isPending}
                >
                  {deleteMood.isPending ? "Removing..." : "Remove"}
                </button>
              </div>
            </SurfaceCard>
          </div>,
          document.body
        )}

      {isPinMenuOpen && pinAnchorRect && (
        <PinCollectionMenu
          anchorRect={pinAnchorRect}
          currentCollection={pinnedCollection}
          onSelect={handlePinSelect}
          onClose={() => { setIsPinMenuOpen(false); }}
        />
      )}
    </div>
  )

  return <div className="w-full">{card}</div>
}
