"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/use-auth-store"
import {
  SpaceSwitchContainer,
  useCoupleSpaces,
  useSpaceStore,
} from "@/features/couple"
import { LikeNotifications } from "@/features/notifications"
import {
  EmptyState,
  TimelineCard,
  groupEntriesByDate,
  mapServerMoodToEntry,
  useMoodHistory,
} from "@/features/history"

const useInfiniteScroll = (
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) => {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {return}
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => { observer.disconnect(); }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return sentinelRef
}

type PinnedGroupKey = "lesson" | "education" | "alert"

const PINNED_GROUPS: Array<{
  key: PinnedGroupKey
  label: string
}> = [
  { key: "lesson", label: "教训" },
  { key: "education", label: "教育" },
  { key: "alert", label: "警醒" },
]

export default function HistoryPage() {
  const [pinnedFilter, setPinnedFilter] = React.useState<PinnedGroupKey | null>(null)
  const { userId, isLoggedIn } = useAuthStore()
  const { space, coupleSpaceId } = useSpaceStore()
  const { acceptedSpaces } = useCoupleSpaces({ enabled: isLoggedIn })

  const activeCoupleSpaceId = acceptedSpaces[0]?.id ?? coupleSpaceId
  const historyQuery = useMoodHistory(space, activeCoupleSpaceId, userId, userId !== null)
  const entries = (historyQuery.data?.pages.flat() ?? []).map((record) =>
    mapServerMoodToEntry(record, space, userId)
  )

  const sentinelRef = useInfiniteScroll(
    historyQuery.hasNextPage,
    historyQuery.isFetchingNextPage,
    () => { void historyQuery.fetchNextPage() }
  )

  const filteredEntries = pinnedFilter
    ? entries.filter((entry) => entry.pinned_collection === pinnedFilter)
    : entries
  const groupedEntries = groupEntriesByDate(filteredEntries)

  const handlePinned = () => {
    void historyQuery.refetch()
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-3 pb-28 flex justify-center">
      <main className="w-full max-w-md">
        <header className="flex items-center justify-between gap-3 mb-4 pt-2 safe-area-header">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <h1 className="text-xl font-medium text-foreground">回顾</h1>
          </div>
          <LikeNotifications />
        </header>

        <SpaceSwitchContainer currentSpace={space} onSpaceChange={(next, id) => { useSpaceStore.getState().setSpace(next, id); }} />

        {historyQuery.isLoading ? (
          <div className="flex justify-center pt-20 text-muted-foreground/40 animate-pulse">Loading...</div>
        ) : entries.length === 0 ? (
          <EmptyState space={space} />
        ) : (
          <div className="space-y-6 relative">
            {space === "couple" && (
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1" role="group" aria-label="按置顶类型筛选">
                {PINNED_GROUPS.map((group) => {
                  const isSelected = pinnedFilter === group.key
                  const count = entries.filter((entry) => entry.pinned_collection === group.key).length
                  return (
                    <button
                      key={group.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => { setPinnedFilter(isSelected ? null : group.key) }}
                      className={cn(
                        "min-w-0 rounded-md px-2 py-1.5 text-xs transition-colors",
                        isSelected ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {group.label}<span className="ml-1 text-[10px] opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {groupedEntries.map(([dateLabel, dayEntries, year], index) => {
              const prevYear = index > 0 ? groupedEntries[index - 1][2] : null
              const showYearMark = prevYear !== null && prevYear !== year
              return (
                <React.Fragment key={`${dateLabel}-${year}`}>
                  {showYearMark && (
                    <div className="flex items-center gap-3 pt-2" aria-label={`已进入 ${year} 年`}>
                      <div className="h-px flex-1 bg-stone-200/70" />
                      <span className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground/55">
                        {year}
                      </span>
                      <div className="h-px flex-1 bg-stone-200/70" />
                    </div>
                  )}
                  <section className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-3">
                    <h2 className="pt-2 text-right text-[11px] font-medium text-muted-foreground/70">{dateLabel}</h2>
                    <div>
                      {dayEntries.map((entry) => (
                        <TimelineCard
                          key={entry.id}
                          entry={entry}
                          space={space}
                          onPinned={handlePinned}
                        />
                      ))}
                    </div>
                  </section>
                </React.Fragment>
              )
            })}

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
