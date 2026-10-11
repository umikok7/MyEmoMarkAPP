"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/use-auth-store"
import {
  SpaceSwitchContainer,
  useCoupleSpaces,
  useSpaceStore,
  type SpaceKind,
} from "@/features/couple"
import { LikeNotifications } from "@/features/notifications"
import { getMoodMeta, type MoodType } from "@/features/moods"
import {
  EmptyState,
  TimelineCard,
  groupEntriesByDate,
  mapServerMoodToEntry,
  useMoodHistory,
} from "@/features/history"
import type { JournalEntry, PinnedCollection } from "@/features/history"

type PinnedGroupKey = "lesson" | "education" | "alert"

const PINNED_GROUPS: Array<{
  key: PinnedGroupKey
  label: string
  gradient: string
  border: string
  textColor: string
  iconBg: string
  iconBorder: string
  iconText: string
  dotColor: string
}> = [
  {
    key: "lesson",
    label: "教训卡片",
    gradient: "from-amber-50 to-amber-100/50",
    border: "border-amber-200/60",
    textColor: "text-amber-700",
    iconBg: "bg-amber-100",
    iconBorder: "border-amber-200",
    iconText: "text-amber-600",
    dotColor: "text-amber-500",
  },
  {
    key: "education",
    label: "教育卡片",
    gradient: "from-indigo-50 to-indigo-100/50",
    border: "border-indigo-200/60",
    textColor: "text-indigo-700",
    iconBg: "bg-indigo-100",
    iconBorder: "border-indigo-200",
    iconText: "text-indigo-600",
    dotColor: "text-indigo-500",
  },
  {
    key: "alert",
    label: "警醒卡片",
    gradient: "from-rose-50 to-rose-100/50",
    border: "border-rose-200/60",
    textColor: "text-rose-700",
    iconBg: "bg-rose-100",
    iconBorder: "border-rose-200",
    iconText: "text-rose-600",
    dotColor: "text-rose-500",
  },
]

const PinnedSection = ({
  entries,
  space,
  group,
  onPinned,
}: {
  entries: JournalEntry[]
  space: SpaceKind
  group: (typeof PINNED_GROUPS)[number]
  onPinned: (moodId: string, collection: PinnedCollection) => void
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const grouped = groupEntriesByDate(entries)

  return (
    <div className="mb-8 pl-14">
      <button
        onClick={() => { setIsExpanded(!isExpanded); }}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-2xl",
          "bg-gradient-to-r",
          group.gradient,
          group.border,
          "border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {entries.slice(0, 3).map((entry) => {
              const meta = getMoodMeta(entry.mood as MoodType)
              const Icon = meta?.icon
              return (
                <div
                  key={entry.id}
                  className={cn("w-8 h-8 rounded-xl flex items-center justify-center border-2 bg-white shadow-sm", group.iconBorder)}
                >
                  {Icon && <Icon className={cn("w-4 h-4", meta?.color)} strokeWidth={1.5} />}
                </div>
              )
            })}
          </div>
          <span className={cn("text-sm font-semibold", group.textColor)}>
            {entries.length} 张{group.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs opacity-70", group.textColor)}>{isExpanded ? "收起" : "展开"}</span>
          <Pin className={cn("w-4 h-4 transition-transform duration-300", group.dotColor, isExpanded && "rotate-180")} />
        </div>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-out",
          isExpanded ? "mt-4 max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {grouped.map(([dateLabel, dayEntries]) => (
          <div key={dateLabel}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", group.iconBg, group.iconBorder)}>
                <Calendar className={cn("w-3.5 h-3.5", group.iconText)} />
              </div>
              <span className={cn("text-xs font-semibold tracking-widest uppercase", group.textColor)}>{dateLabel}</span>
            </div>
            <div className="space-y-3 pl-4">
              {dayEntries.map((entry) => (
                <TimelineCard
                  key={entry.id}
                  entry={entry}
                  space={space}
                  chatLayout={false}
                  showAuthor={false}
                  onPinned={onPinned}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { userId, isLoggedIn } = useAuthStore()
  const { space, coupleSpaceId } = useSpaceStore()
  const { acceptedSpaces } = useCoupleSpaces({ enabled: isLoggedIn })

  const activeCoupleSpaceId = acceptedSpaces[0]?.id ?? coupleSpaceId
  const isChatLayout = space === "personal" && activeCoupleSpaceId !== null

  const historyQuery = useMoodHistory(space, activeCoupleSpaceId, userId, userId !== null)
  const entries = (historyQuery.data?.pages.flat() ?? []).map((record) =>
    mapServerMoodToEntry(record, space, userId)
  )

  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {return}
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0]?.isIntersecting && historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
          void historyQuery.fetchNextPage()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => { observer.disconnect(); }
  }, [historyQuery])

  const pinnedByCollection = (collection: PinnedGroupKey) =>
    entries.filter((entry) => entry.pinned_collection === collection)
  const unpinnedEntries = entries.filter((entry) => !entry.pinned_collection)
  const groupedEntries = groupEntriesByDate(unpinnedEntries)

  const handlePinned = () => {
    void historyQuery.refetch()
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 pb-32 flex justify-center">
      <main className="w-full max-w-md">
        <header className="flex items-center justify-between gap-4 mb-6 pt-4 safe-area-header">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <h1 className="text-2xl font-normal text-foreground tracking-wide">情绪回顾</h1>
          </div>
          <LikeNotifications />
        </header>

        <SpaceSwitchContainer currentSpace={space} onSpaceChange={(next, id) => { useSpaceStore.getState().setSpace(next, id); }} />

        {historyQuery.isLoading ? (
          <div className="flex justify-center pt-20 text-muted-foreground/40 animate-pulse">Loading...</div>
        ) : entries.length === 0 ? (
          <EmptyState space={space} />
        ) : (
          <div className="space-y-10 relative">
            {PINNED_GROUPS.map((group) => {
              const pinnedEntries = pinnedByCollection(group.key)
              if (pinnedEntries.length === 0 || space !== "couple") {return null}
              return (
                <PinnedSection
                  key={group.key}
                  entries={pinnedEntries}
                  space={space}
                  group={group}
                  onPinned={handlePinned}
                />
              )
            })}

            {!isChatLayout && (
              <div className="absolute left-[19px] top-2 bottom-0 w-[1px] bg-gradient-to-b from-muted-foreground/20 via-muted-foreground/10 to-transparent z-0" />
            )}

            {groupedEntries.map(([dateLabel, dayEntries]) => (
              <div key={dateLabel} className="relative z-10">
                {isChatLayout ? (
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-stone-200/60" />
                    <span className="text-xs font-semibold text-muted-foreground/65 tracking-widest uppercase px-2">{dateLabel}</span>
                    <div className="flex-1 h-px bg-stone-200/60" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-background border border-stone-200 flex items-center justify-center shadow-sm z-10">
                      <Calendar className="w-4 h-4 text-muted-foreground/70" />
                    </div>
                    <div className="text-base font-bold text-foreground/75 tracking-widest uppercase">{dateLabel}</div>
                  </div>
                )}

                <div className={cn(!isChatLayout && "space-y-3 pl-14")}>
                  {dayEntries.map((entry) => (
                    <TimelineCard
                      key={entry.id}
                      entry={entry}
                      space={space}
                      chatLayout={isChatLayout}
                      showAuthor={space === "couple"}
                      onPinned={handlePinned}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div ref={sentinelRef} className="h-1" />
            {historyQuery.isFetchingNextPage && (
              <div className="text-xs text-muted-foreground/60 tracking-wide flex justify-center pt-4">
                Loading more entries...
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 opacity-50">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mx-[15px]" />
              <span className="text-xs text-muted-foreground/50 tracking-widest uppercase">End of records</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
