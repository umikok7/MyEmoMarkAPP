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
  chatLayout: boolean
  showAuthor: boolean
  onPinned?: (moodId: string, collection: PinnedCollection) => void
}

export function TimelineCard({ entry, space, chatLayout, showAuthor, onPinned }: TimelineCardProps) {
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
  const [isLikeAnimating, setIsLikeAnimating] = React.useState(false)
  const [pinnedCollection, setPinnedCollection] = React.useState<PinnedCollection>(
    entry.pinned_collection ?? null
  )
  const [isPinMenuOpen, setIsPinMenuOpen] = React.useState(false)
  const [pinAnchorRect, setPinAnchorRect] = React.useState<DOMRect | null>(null)
  const pinButtonRef = React.useRef<HTMLButtonElement | null>(null)

  const config = getMoodMeta(entry.mood as MoodType)
  const MoodIcon = config?.icon
  const isPartnerCard = chatLayout && entry.is_mine === false
  const canLike = entry.is_mine === false
  const canPin = space === "couple" && entry.is_mine === true

  const handleLike = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!canLike) {return}
    if (navigator.vibrate) {navigator.vibrate(8)}

    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setIsLikeAnimating(true)
    window.setTimeout(() => { setIsLikeAnimating(false); }, 300)

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

  const card = (
    <SurfaceCard
      onClick={() => {
        if (isEditing) {return}
        setIsExpanded(!isExpanded)
      }}
      variant="glass"
      className={cn(
        "cursor-pointer overflow-hidden transition-all duration-500",
        isExpanded && "bg-white shadow-md",
        chatLayout && isPartnerCard && "bg-rose-50/30 hover:bg-rose-50/50",
        pinnedCollection === "lesson" && ["border-l-4 border-l-amber-500", "bg-gradient-to-r from-amber-50/50 to-white/60", "shadow-md hover:shadow-lg"],
        pinnedCollection === "education" && ["border-l-4 border-l-indigo-500", "bg-gradient-to-r from-indigo-50/50 to-white/60", "shadow-md hover:shadow-lg"],
        pinnedCollection === "alert" && ["border-l-4 border-l-rose-500", "bg-gradient-to-r from-rose-50/50 to-white/60", "shadow-md hover:shadow-lg"]
      )}
    >
      <div className={cn("p-4 flex gap-3 items-start", chatLayout && isPartnerCard && "flex-row-reverse")}>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300",
            config?.bg ?? "bg-stone-100",
            chatLayout && isPartnerCard && "opacity-80"
          )}
        >
          {MoodIcon && <MoodIcon className={cn("w-4 h-4", config?.color)} strokeWidth={1.5} />}
        </div>

        <div className={cn("flex-1 min-w-0 pt-0.5", chatLayout && isPartnerCard && "items-end")}>
          {chatLayout && entry.is_mine !== undefined ? (
            <div className={cn("flex items-center gap-2 mb-1.5", isPartnerCard ? "flex-row-reverse" : "flex-row")}>
              <AuthorBadge isMine={entry.is_mine} />
              <span className="font-mono text-xs font-semibold text-muted-foreground/60">{entry.time}</span>
              {canPin && (
                <button
                  ref={pinButtonRef}
                  type="button"
                  onClick={(event) => { event.stopPropagation(); }}
                  {...longPressHandlers}
                  className="p-2 -m-1 rounded-lg transition-colors cursor-pointer relative hover:bg-muted/50 disabled:opacity-60 disabled:pointer-events-none"
                  title="长按选择合集"
                  disabled={pinToCollection.isPending}
                  aria-label="长按选择置顶合集"
                >
                  <Pin
                    className={cn(
                      "w-4 h-4 transition-colors",
                      pinnedCollection === "lesson" && "text-amber-500 fill-amber-500/20",
                      pinnedCollection === "education" && "text-indigo-500 fill-indigo-500/20",
                      pinnedCollection === "alert" && "text-rose-500 fill-rose-500/20",
                      pinnedCollection === null && "text-muted-foreground/40"
                    )}
                    strokeWidth={1.8}
                  />
                </button>
              )}
              {isLiked && (
                <span className="flex items-center" title="Partner has seen this">
                  <Heart className="w-3.5 h-3.5 text-rose-400/60 fill-rose-400/15" />
                </span>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center mb-1">
              <h3 className={cn("text-sm font-bold tracking-wide", config?.color)}>
                {config?.label ?? entry.mood}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold font-mono text-muted-foreground/65">{entry.time}</span>
                {canPin && (
                  <button
                    ref={pinButtonRef}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); }}
                    {...longPressHandlers}
                    className="p-2 -m-1 rounded-lg transition-colors cursor-pointer relative hover:bg-muted/50 disabled:opacity-60 disabled:pointer-events-none"
                    title="长按选择合集"
                    disabled={pinToCollection.isPending}
                    aria-label="长按选择置顶合集"
                  >
                    <Pin
                      className={cn(
                        "w-4 h-4 transition-colors",
                        pinnedCollection === "lesson" && "text-amber-500 fill-amber-500/20",
                        pinnedCollection === "education" && "text-indigo-500 fill-indigo-500/20",
                        pinnedCollection === "alert" && "text-rose-500 fill-rose-500/20",
                        pinnedCollection === null && "text-muted-foreground/40"
                      )}
                      strokeWidth={1.8}
                    />
                  </button>
                )}
                {isLiked && (
                  <span className="flex items-center" title="Partner has seen this">
                    <Heart className="w-3.5 h-3.5 text-rose-400/60 fill-rose-400/15" />
                  </span>
                )}
                {showAuthor && entry.is_mine !== undefined && <AuthorBadge isMine={entry.is_mine} />}
              </div>
            </div>
          )}

          {chatLayout && (
            <h3 className={cn("font-bold tracking-wide mb-1 text-base text-right", isPartnerCard ? "text-right" : "text-left", config?.color)}>
              {config?.label ?? entry.mood}
            </h3>
          )}

          {isEditing ? (
            <textarea
              value={editNote}
              onChange={(event) => { setEditNote(event.target.value); }}
              onClick={(event) => { event.stopPropagation(); }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation()
                  setEditNote(entry.note)
                  setIsEditing(false)
                }
              }}
              rows={Math.min(6, Math.max(3, Math.ceil(editNote.length / 26)))}
              autoFocus
              className={cn(
                  "w-full resize-none rounded-lg bg-white/50 px-3 py-2",
                  "leading-relaxed font-normal text-sm text-foreground/70",
                  "focus:outline-none transition-all duration-500",
                chatLayout && isPartnerCard && "text-right"
              )}
            />
          ) : (
            <p
              className={cn(
                "leading-relaxed transition-all duration-500 font-normal text-sm text-foreground/60",
                isExpanded ? "line-clamp-none" : "line-clamp-2",
                chatLayout && isPartnerCard && "text-right"
              )}
            >
              {entry.note}
            </p>
          )}

          {!isExpanded && (
            <div className={cn("mt-2.5 flex gap-2 items-center", chatLayout && isPartnerCard ? "justify-end" : "justify-start")}>
              <span className="px-2.5 py-1 rounded-full bg-secondary/30 text-secondary-foreground text-[10px]">
                {entry.intensity * 10}% Intensity
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "bg-white/50 border-t border-black/[0.03] transition-all duration-500 ease-in-out overflow-y-auto",
          isExpanded ? (isEditing ? "max-h-96 opacity-100" : "max-h-64 opacity-100") : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="p-4 pt-3 space-y-3">
          <div>
            <div className={cn("flex justify-between text-muted-foreground mb-1.5 px-1 text-xs")}>
              <span>Intensity</span>
              <span>{entry.intensity * 10}%</span>
            </div>
            <div className="h-1 w-full bg-stone-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-stone-400/60 rounded-full" style={{ width: `${entry.intensity * 10}%` }} />
            </div>
          </div>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-stone-100/60 text-muted-foreground/70 text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="pt-1">
            <div className="h-px w-full bg-stone-200/60" />
            <div className="mt-2.5 flex items-center justify-between tracking-wide text-xs">
              {canLike && (
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 min-h-[36px] min-w-[36px] px-2.5 rounded-full",
                    "transition-all duration-300 active:scale-[0.95] cursor-pointer",
                    isLiked ? "text-rose-400/80" : "text-muted-foreground/50 hover:text-rose-300/70"
                  )}
                  onClick={handleLike}
                >
                  <Heart
                    className={cn("w-3.5 h-3.5 transition-all duration-300", isLikeAnimating && "scale-125", isLiked && "fill-rose-400/30")}
                    strokeWidth={isLiked ? 1.5 : 1.8}
                  />
                </button>
              )}
              <div className="flex items-center gap-4">
                {!isPartnerCard && isEditing && (
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                )}
                {!isPartnerCard && (
                  <button
                    type="button"
                    className={cn(
                      "transition-opacity duration-300 active:scale-[0.98] cursor-pointer",
                      isEditing ? "text-foreground/80 font-medium" : "text-muted-foreground/70 hover:text-foreground/70"
                    )}
                    onClick={handleEditButtonClick}
                    disabled={updateMood.isPending}
                  >
                    {isEditing ? (updateMood.isPending ? "Saving..." : "Save") : "Edit entry"}
                  </button>
                )}
                {!isPartnerCard && !isEditing && (
                  <button
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation()
                      setIsDeleteOpen(true)
                    }}
                  >
                    Delete entry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

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
    </SurfaceCard>
  )

  // 全局统一卡片几何：宽 = 容器 - 5rem，chat/时间线布局尺寸一致
  if (!chatLayout) {
    return (
      <div className="w-[calc(100%-5rem)] mx-auto py-1.5">{card}</div>
    )
  }

  return (
    <div className="relative py-1.5">
      {/* 两侧轨道装饰线，绝对定位不挤占卡片宽度 */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-stone-200/70" />
      <div className="absolute right-3 top-0 bottom-0 w-px bg-rose-200/60" />
      <div
        className={cn(
          "absolute top-[22px] w-2 h-2 rounded-full ring-2 ring-white z-10",
          isPartnerCard ? "right-[10px] bg-rose-300/80" : "left-[10px] bg-stone-300/90"
        )}
      />

      {/* 等宽卡片 + 轻微左右偏移（32px），避免满幅对甩 */}
      <div
        className={cn(
          "relative w-[calc(100%-5rem)] min-w-0",
          isPartnerCard ? "ml-auto mr-6" : "mr-auto ml-6"
        )}
      >
        {card}
      </div>
    </div>
  )
}
