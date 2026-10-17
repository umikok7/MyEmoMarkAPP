"use client"

import * as React from "react"
import { BookOpen, Check, Heart, Pin, PinOff, Sparkles, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { getMoodMeta, type MoodType } from "@/features/moods"
import { useAuthStore } from "@/store/use-auth-store"
import { useSpaceStore } from "@/features/couple"
import { useMoodRecordMutations } from "../hooks"
import type { HistorySpace } from "../api"
import type { JournalEntry, PinnedCollection } from "../types"
import { AuthorBadge } from "./AuthorBadge"

const PIN_MENU_ITEMS: Array<{
  collection: Exclude<PinnedCollection, null>
  label: string
  icon: React.ElementType
  iconColor: string
  focusBg: string
}> = [
  {
    collection: "lesson",
    label: "加入教训卡片合集",
    icon: Sparkles,
    iconColor: "text-amber-500",
    focusBg: "focus:bg-amber-50/70",
  },
  {
    collection: "education",
    label: "加入教育卡片合集",
    icon: BookOpen,
    iconColor: "text-indigo-500",
    focusBg: "focus:bg-indigo-50/70",
  },
  {
    collection: "alert",
    label: "加入警醒卡片合集",
    icon: AlertTriangle,
    iconColor: "text-rose-500",
    focusBg: "focus:bg-rose-50/70",
  },
]

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

  const handleConfirmDelete = () => {
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
                <DropdownMenu open={isPinMenuOpen} onOpenChange={setIsPinMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation() }}
                      className="rounded p-1 text-muted-foreground/50 hover:bg-stone-100 disabled:opacity-50"
                      title="选择合集"
                      disabled={pinToCollection.isPending}
                      aria-label="选择置顶合集"
                    >
                      <Pin className={cn("h-3.5 w-3.5", pinnedCollection && "fill-current")} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="bottom"
                    align="center"
                    sideOffset={8}
                    className="min-w-[240px] rounded-none border-[#f0ebe6] bg-[#fdfbf7] p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]"
                  >
                    {PIN_MENU_ITEMS.map((item) => {
                      const Icon = item.icon
                      const isCurrent = pinnedCollection === item.collection
                      return (
                        <DropdownMenuItem
                          key={item.collection}
                          onSelect={() => { handlePinSelect(item.collection) }}
                          className={cn(
                            "gap-3 rounded-none px-3 py-2.5 text-sm font-light text-foreground/80",
                            item.focusBg
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", item.iconColor)} strokeWidth={1.8} />
                          <span className="flex-1">{item.label}</span>
                          {isCurrent && <Check className="h-4 w-4 shrink-0 text-foreground/60" strokeWidth={2} />}
                        </DropdownMenuItem>
                      )
                    })}
                    {pinnedCollection !== null && (
                      <>
                        <DropdownMenuSeparator className="mx-2 bg-stone-200" />
                        <DropdownMenuItem
                          onSelect={() => { handlePinSelect(null) }}
                          className="gap-3 rounded-none px-3 py-2.5 text-sm font-medium text-muted-foreground/70 focus:bg-stone-100/60"
                        >
                          <PinOff className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
                          <span className="flex-1">取消置顶</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="w-[92%] max-w-sm gap-0 rounded-3xl border-0 bg-[#fdfbf7] p-6 shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)]">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-base font-light tracking-wide text-foreground/85">
              Remove this memory?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground/70">
              You cannot undo this action. If this entry feels heavy, it is okay to let it go.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex-row items-center justify-end gap-4 border-t border-stone-200/60 pt-4">
            <AlertDialogCancel className="h-auto cursor-pointer rounded-none border-0 bg-transparent p-0 text-xs text-stone-400/80 shadow-none transition-opacity duration-300 hover:bg-transparent hover:text-stone-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMood.isPending}
              className="h-auto cursor-pointer rounded-none bg-transparent p-0 text-xs text-[#a67c5b]/80 shadow-none transition-opacity duration-300 hover:bg-transparent hover:text-[#8f6647]"
            >
              {deleteMood.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  return <div className="w-full">{card}</div>
}
