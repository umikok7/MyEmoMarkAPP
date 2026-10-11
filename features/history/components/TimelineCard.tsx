"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Heart, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
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
  const [editIntensity, setEditIntensity] = React.useState(entry.intensity)
  const [editNote, setEditNote] = React.useState(entry.note)
  const [editTags, setEditTags] = React.useState<string[]>(entry.tags)
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
  const isSaving = updateMood.isPending || deleteMood.isPending

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

  const handleStartEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setEditIntensity(entry.intensity)
    setEditNote(entry.note)
    setEditTags(entry.tags)
    setIsEditing(true)
  }

  const handleCancelEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setIsEditing(false)
  }

  const handleSaveEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!editNote.trim()) {
      toast("内容不能为空", { duration: 2000 })
      return
    }
    updateMood.mutate(
      {
        moodId: entry.id,
        mood: entry.mood as MoodType,
        intensity: editIntensity,
        note: editNote,
        tags: editTags,
      },
      {
        onSuccess: () => {
          toast("已更新", { description: "这条记忆已焕然一新。", duration: 2000 })
          setIsEditing(false)
        },
        onError: () => {
          toast("保存失败", { description: "请稍后重试。", duration: 2200 })
        },
      }
    )
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
    <Card
      onClick={() => {
        if (isEditing) {return}
        setIsExpanded(!isExpanded)
      }}
      className={cn(
        "border-none transition-all duration-500 cursor-pointer overflow-hidden",
        isExpanded ? "bg-white shadow-md ring-1 ring-black/5" : "bg-white/60 hover:bg-white/80 shadow-sm",
        chatLayout && isPartnerCard && "bg-rose-50/30 hover:bg-rose-50/50",
        pinnedCollection === "lesson" && ["border-l-4 border-l-amber-500", "bg-gradient-to-r from-amber-50/50 to-white/60", "shadow-md hover:shadow-lg"],
        pinnedCollection === "education" && ["border-l-4 border-l-indigo-500", "bg-gradient-to-r from-indigo-50/50 to-white/60", "shadow-md hover:shadow-lg"],
        pinnedCollection === "alert" && ["border-l-4 border-l-rose-500", "bg-gradient-to-r from-rose-50/50 to-white/60", "shadow-md hover:shadow-lg"]
      )}
    >
      <div className={cn("p-5 flex gap-4 items-start", chatLayout && isPartnerCard && "flex-row-reverse")}>
        <div
          className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300",
            config?.bg ?? "bg-stone-100",
            chatLayout && isPartnerCard && "opacity-80"
          )}
        >
          {MoodIcon && <MoodIcon className={cn("w-5 h-5", config?.color)} strokeWidth={1.5} />}
        </div>

        <div className={cn("flex-1 min-w-0 pt-0.5", chatLayout && isPartnerCard && "items-end")}>
          {chatLayout && entry.is_mine !== undefined ? (
            <div className={cn("flex items-center gap-2 mb-1.5", isPartnerCard ? "flex-row-reverse" : "flex-row")}>
              <AuthorBadge isMine={entry.is_mine} />
              <span className="font-mono text-sm font-semibold text-muted-foreground/60">{entry.time}</span>
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
                      "w-5 h-5 transition-colors",
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
              <h3 className={cn("text-base font-bold tracking-wide", config?.color)}>
                {config?.label ?? entry.mood}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono text-muted-foreground/65">{entry.time}</span>
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
                        "w-5 h-5 transition-colors",
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
            <h3 className={cn("font-bold tracking-wide mb-1.5 text-lg text-right", isPartnerCard ? "text-right" : "text-left", config?.color)}>
              {config?.label ?? entry.mood}
            </h3>
          )}

          <p
            className={cn(
              "leading-relaxed transition-all duration-500 font-normal",
              chatLayout ? "text-[15px] text-foreground/55" : "text-sm text-muted-foreground/70",
              isExpanded ? "line-clamp-none" : "line-clamp-2",
              chatLayout && isPartnerCard && "text-right"
            )}
          >
            {entry.note}
          </p>

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
        <div className="p-5 pt-4 space-y-4">
          <div
            className={cn(
              "transition-all duration-500",
              isEditing ? "opacity-0 scale-[0.99] pointer-events-none h-0 overflow-hidden" : "opacity-100 scale-100"
            )}
          >
            <div>
              <div className={cn("flex justify-between text-muted-foreground mb-2 px-1", chatLayout ? "text-sm font-semibold" : "text-xs")}>
                <span>Intensity</span>
                <span>{entry.intensity * 10}%</span>
              </div>
              <div className="h-1.5 w-full bg-stone-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-stone-400/60 rounded-full" style={{ width: `${entry.intensity * 10}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "px-3 py-1.5 rounded-full bg-stone-100/60 text-muted-foreground/70",
                    chatLayout ? "text-sm font-medium" : "text-xs"
                  )}
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <div className="h-px w-full bg-stone-200/60" />
              <div className={cn("mt-3 flex items-center justify-between tracking-wide", chatLayout ? "text-sm font-medium" : "text-xs")}>
                {canLike && (
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 rounded-full",
                      "transition-all duration-300 active:scale-[0.95] cursor-pointer",
                      isLiked ? "text-rose-400/80" : "text-muted-foreground/50 hover:text-rose-300/70"
                    )}
                    onClick={handleLike}
                  >
                    <Heart
                      className={cn("w-4 h-4 transition-all duration-300", isLikeAnimating && "scale-125", isLiked && "fill-rose-400/30")}
                      strokeWidth={isLiked ? 1.5 : 1.8}
                    />
                  </button>
                )}
                <div className="flex items-center gap-4">
                  {!isPartnerCard && (
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                      onClick={handleStartEdit}
                    >
                      Edit entry
                    </button>
                  )}
                  {!isPartnerCard && (
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

          {isEditing && (
            <div onClick={(event) => { event.stopPropagation(); }}>
              <div className="rounded-3xl bg-[#fcfbf9] ring-1 ring-black/5 p-4 space-y-4 shadow-[0_10px_30px_-25px_rgba(0,0,0,0.25)]">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
                    <span>Intensity</span>
                    <span>{editIntensity * 10}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={editIntensity}
                    onChange={(event) => { setEditIntensity(Number(event.target.value)); }}
                    className="w-full h-1.5 rounded-full bg-stone-200/70 accent-stone-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground/70 px-1">Note</label>
                  <textarea
                    value={editNote}
                    onChange={(event) => { setEditNote(event.target.value); }}
                    rows={3}
                    className="mt-2 w-full rounded-2xl bg-white/70 border border-transparent ring-1 ring-black/5 px-4 py-3 text-sm text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-black/10 transition"
                    placeholder="Add a gentle note..."
                  />
                </div>

                <div className="pt-2">
                  <label className="text-xs text-muted-foreground/70 px-1">Tags</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editTags.map((tag, index) => (
                      <button
                        key={`${tag}-${index}`}
                        type="button"
                        className="text-[11px] px-3 py-1.5 rounded-full bg-stone-100/40 text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditTags((prev) => prev.filter((_, i) => i !== index))
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                    <input
                      type="text"
                      placeholder="Add tag"
                      className="text-[11px] px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-black/5 text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-black/10"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          const value = event.currentTarget.value.trim()
                          if (value) {
                            setEditTags((prev) => [...prev, value])
                            event.currentTarget.value = ""
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="h-px w-full bg-stone-200/60" />
                  <div className="mt-3 flex items-center justify-end gap-4 text-xs tracking-wide">
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="text-foreground/70 hover:text-foreground/80 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isDeleteOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-sm"
            onClick={() => { setIsDeleteOpen(false); }}
          >
            <div
              className="w-[92%] max-w-sm rounded-[28px] bg-[#fdfbf7] shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 p-6 animate-[fade-scale_0.25s_ease-out]"
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
            </div>
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
    </Card>
  )

  if (!chatLayout) {return card}

  return (
    <div className="flex items-stretch">
      <div className="w-6 shrink-0 flex flex-col items-center relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-stone-200/70" />
        {!isPartnerCard && (
          <div className="relative z-10 mt-[20px] w-2 h-2 rounded-full bg-stone-300/90 ring-2 ring-white shrink-0" />
        )}
      </div>

      <div className="flex-1 min-w-0 py-1.5">
        <div className={cn("flex", isPartnerCard ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "self-start mt-[22px] h-px w-3 shrink-0",
              isPartnerCard ? "order-last bg-rose-200" : "order-first bg-stone-200"
            )}
          />
          <div className="min-w-0 max-w-[calc(100%-12px)]">{card}</div>
        </div>
      </div>

      <div className="w-6 shrink-0 flex flex-col items-center relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-rose-200/60" />
        {isPartnerCard && (
          <div className="relative z-10 mt-[20px] w-2 h-2 rounded-full bg-rose-300/80 ring-2 ring-white shrink-0" />
        )}
      </div>
    </div>
  )
}
