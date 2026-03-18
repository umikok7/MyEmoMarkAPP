"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CloudSun, Leaf, Wind, Droplets, Zap, Calendar, ArrowLeft, Heart, Pin } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/api"
import { AuthorBadge } from "@/components/author-badge"
import { EmptyState } from "@/components/empty-state"
import { SpaceSwitchDisplay } from "@/components/space-switch-display"
import { InvitePartnerModal } from "@/components/invite-partner-modal"
import { PendingInvitationStatus } from "@/components/pending-invitation-status"
import { InviteAcceptModal } from "@/components/invite-accept-modal"
import { LikeNotifications } from "@/components/like-notifications"
import type { CoupleSpace } from "@/components/space-switch"

// Mock Data removed
type MoodType = "happy" | "calm" | "anxious" | "sad" | "angry"

interface JournalEntry {
  id: string
  date: string
  time: string
  mood: MoodType
  intensity: number
  note: string
  tags: string[]
  author_id?: string
  is_mine?: boolean
  liked_by_user_id?: string | null
  is_pinned?: boolean
}

type ServerMoodItem = {
  id: string
  user_id?: string
  created_by_user_id?: string
  mood_type: MoodType
  intensity: number
  note?: string
  tags?: string[]
  created_at: string
  liked_by_user_id?: string | null
}

type CoupleMoodItem = {
  id: string
  space_id: string
  created_by_user_id: string
  mood_type: MoodType
  intensity: number
  note?: string
  tags?: string[]
  created_at: string
  liked_by_user_id?: string | null
  liked_at?: string | null
  is_pinned?: boolean
}

type LikeNotification = {
  id: string
  likerName: string
  likerAvatar?: string
  moodNote: string
  moodType: string
  likedAt: string
}

// Mood Config Map
const MOOD_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  happy: { label: "Joy", color: "text-rose-400", bg: "bg-rose-50", icon: CloudSun },
  calm: { label: "Calm", color: "text-teal-500", bg: "bg-teal-50", icon: Leaf },
  anxious: { label: "Worry", color: "text-amber-500", bg: "bg-amber-50", icon: Wind },
  sad: { label: "Blue", color: "text-blue-400", bg: "bg-blue-50", icon: Droplets },
  angry: { label: "Heat", color: "text-red-400", bg: "bg-red-50", icon: Zap },
}

const PAGE_LIMIT = 10

export default function HistoryPage() {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<JournalEntry[]>([])
  const [userId, setUserId] = React.useState<string | null>(null)
  const [offset, setOffset] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(true)
  const [isFetchingMore, setIsFetchingMore] = React.useState(false)
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  const [currentSpace, setCurrentSpace] = React.useState<"personal" | "couple">("personal")
  const [selectedCoupleSpaceId, setSelectedCoupleSpaceId] = React.useState<string | null>(null)
  const [coupleSpaces, setCoupleSpaces] = React.useState<CoupleSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = React.useState(true)
  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [showAcceptModal, setShowAcceptModal] = React.useState(false)
  const [pendingInvitation, setPendingInvitation] = React.useState<CoupleSpace | null>(null)

  const [notifications, setNotifications] = React.useState<LikeNotification[]>([])
  const [hasUnreadLikes, setHasUnreadLikes] = React.useState(false)

  // Fetch data
  const mapItem = React.useCallback((item: ServerMoodItem | CoupleMoodItem): JournalEntry => {
    const dateObj = new Date(item.created_at)
    const likedBy = (item as ServerMoodItem).liked_by_user_id ?? (item as CoupleMoodItem).liked_by_user_id

    if (currentSpace === "couple") {
      const coupleItem = item as CoupleMoodItem
      const isMine = coupleItem.created_by_user_id === userId
      return {
        id: coupleItem.id,
        date: item.created_at,
        time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mood: coupleItem.mood_type as MoodType,
        intensity: coupleItem.intensity,
        note: coupleItem.note ?? "",
        tags: coupleItem.tags || [],
        author_id: coupleItem.created_by_user_id,
        is_mine: isMine,
        liked_by_user_id: likedBy,
        is_pinned: coupleItem.is_pinned ?? false,
      }
    }

    // Personal mode with couple space: server returns created_by_user_id for both partners
    const serverItem = item as ServerMoodItem
    if (serverItem.created_by_user_id) {
      return {
        id: serverItem.id,
        date: item.created_at,
        time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mood: item.mood_type as MoodType,
        intensity: item.intensity,
        note: item.note ?? "",
        tags: item.tags || [],
        author_id: serverItem.created_by_user_id,
        is_mine: serverItem.created_by_user_id === userId,
        liked_by_user_id: likedBy,
      }
    }

    return {
      id: item.id,
      date: item.created_at,
      time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mood: item.mood_type as MoodType,
      intensity: item.intensity,
      note: item.note ?? "",
      tags: item.tags || [],
      liked_by_user_id: likedBy,
    }
  }, [currentSpace, userId])

  const mapItems = React.useCallback((items: ServerMoodItem[]): JournalEntry[] => {
    return items.map(mapItem)
  }, [mapItem])

  React.useEffect(() => {
    const rawUser = localStorage.getItem("awesome-user")
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser)
        setUserId(parsed?.id || "guest")
        return
      } catch (error) {
        console.error("Failed to parse stored user", error)
      }
    }
    setUserId("guest")
  }, [])

  const fetchCoupleSpaces = React.useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("/couple-spaces"), { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      const spaces = (json?.data?.items || []) as CoupleSpace[]
      setCoupleSpaces(spaces)

      const acceptedSpaces = spaces.filter((s) => s.status === "accepted")
      const pendingReceived = spaces.filter(
        (s) => s.status === "pending" && s.creator_user_id !== userId
      )

      if (acceptedSpaces.length > 0) {
        setSelectedCoupleSpaceId(acceptedSpaces[0].id)
      }

      if (pendingReceived.length > 0 && !showAcceptModal) {
        setPendingInvitation(pendingReceived[0])
        setShowAcceptModal(true)
      }
    } catch (error) {
      console.error("Failed to fetch couple spaces:", error)
    } finally {
      setLoadingSpaces(false)
    }
  }, [userId, showAcceptModal])

  React.useEffect(() => {
    if (userId && userId !== "guest") {
      fetchCoupleSpaces()
    } else {
      setLoadingSpaces(false)
    }
  }, [userId, fetchCoupleSpaces])

  const handleSpaceChange = React.useCallback((space: "personal" | "couple") => {
    setCurrentSpace(space)
  }, [])

  const handleInviteSent = React.useCallback(() => {
    fetchCoupleSpaces()
  }, [fetchCoupleSpaces])

  const handleAccept = React.useCallback(() => {
    setShowAcceptModal(false)
    setPendingInvitation(null)
    fetchCoupleSpaces()
  }, [fetchCoupleSpaces])

  const handleDecline = React.useCallback(() => {
    setShowAcceptModal(false)
    setPendingInvitation(null)
    fetchCoupleSpaces()
  }, [fetchCoupleSpaces])

  const handleCancelInvite = React.useCallback(async (spaceId: string) => {
    try {
      await fetch(buildApiUrl(`/couple-spaces/${spaceId}`), {
        method: "DELETE",
        credentials: "include",
      })
      fetchCoupleSpaces()
    } catch (error) {
      console.error("Failed to cancel invitation:", error)
    }
  }, [fetchCoupleSpaces])

  const fetchHistoryPage = React.useCallback(async (offsetValue: number, append = false) => {
    if (userId === null) return
    try {
      let url: string
      if (currentSpace === "personal") {
        url = buildApiUrl("/moods", {
          limit: PAGE_LIMIT,
          offset: offsetValue,
          user_id: userId,
          ...(selectedCoupleSpaceId ? { space_id: selectedCoupleSpaceId } : {}),
        })
      } else if (selectedCoupleSpaceId) {
        url = buildApiUrl("/couple-moods", {
          limit: PAGE_LIMIT,
          offset: offsetValue,
          space_id: selectedCoupleSpaceId,
        })
      } else {
        return
      }

      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) {
        throw new Error("Failed to fetch history")
      }
      const json = await res.json()
      const items = (json?.data?.items || []) as (ServerMoodItem | CoupleMoodItem)[]
      const mappedData = mapItems(items)
      if (items.length < PAGE_LIMIT) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }
      setData((prev) => (append ? [...prev, ...mappedData] : mappedData))
      setOffset(offsetValue + mappedData.length)
    } catch (err) {
      console.error("History fetch error:", err)
      if (!append) {
        setHasMore(false)
        setData([])
      }
    } finally {
      if (!append) {
        setLoading(false)
      }
    }
  }, [currentSpace, selectedCoupleSpaceId, userId, mapItems])

  React.useEffect(() => {
    if (userId === null || loadingSpaces) return
    setData([])
    setOffset(0)
    setHasMore(true)
    setLoading(true)
    fetchHistoryPage(0)
  }, [fetchHistoryPage, userId, currentSpace, selectedCoupleSpaceId, loadingSpaces])

  const loadMore = React.useCallback(async () => {
    if (!hasMore || isFetchingMore || loading) return
    setIsFetchingMore(true)
    await fetchHistoryPage(offset, true)
    setIsFetchingMore(false)
  }, [fetchHistoryPage, hasMore, isFetchingMore, loading, offset])

  const fetchLikeNotifications = React.useCallback(async () => {
    if (!userId || userId === "guest") return
    try {
      const res = await fetch(buildApiUrl("/notifications/likes"), { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      const items = (json?.data?.items || []) as Array<{
        id: string
        liker_name: string
        mood_note: string
        mood_type: string
        liked_at: string
      }>
      const mapped: LikeNotification[] = items.map((item) => ({
        id: item.id,
        likerName: item.liker_name,
        moodNote: item.mood_note || "",
        moodType: item.mood_type,
        likedAt: item.liked_at,
      }))
      setNotifications(mapped)
      const hasUnread = json?.data?.hasUnread ?? false
      setHasUnreadLikes(hasUnread)
    } catch (error) {
      console.error("Failed to fetch like notifications:", error)
    }
  }, [userId])

  const handleOpenNotifications = React.useCallback(() => {
    if (hasUnreadLikes) {
      setHasUnreadLikes(false)
    }
  }, [hasUnreadLikes])

  React.useEffect(() => {
    if (userId && userId !== "guest") {
      fetchLikeNotifications()
    }
  }, [userId, fetchLikeNotifications])

  React.useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        loadMore()
      }
    }, { rootMargin: '200px' })
    observer.observe(sentinelRef.current)
    return () => {
      observer.disconnect()
    }
  }, [loadMore])


  // Separate pinned and unpinned entries (for couple space)
  const { pinnedEntries, unpinnedEntries } = React.useMemo(() => {
    const pinned: JournalEntry[] = []
    const unpinned: JournalEntry[] = []
    data.forEach((entry) => {
      if (entry.is_pinned) {
        pinned.push(entry)
      } else {
        unpinned.push(entry)
      }
    })
    return { pinnedEntries: pinned, unpinnedEntries: unpinned }
  }, [data])

  const [pinnedExpanded, setPinnedExpanded] = React.useState(false)

  // Group unpinned entries by date
  const groupedEntries = React.useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {}
    unpinnedEntries.forEach((entry) => {
      // Simple date formatting for grouping header
      const dateObj = new Date(entry.date)
      // "Jan 24, Wed" format
      const dateKey = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(entry)
    })
    return groups
  }, [unpinnedEntries])

  const isChatLayout = currentSpace === "personal" && selectedCoupleSpaceId !== null

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 pb-32 flex justify-center">
      <main className="w-full max-w-md">
        
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6 pt-4 safe-area-header">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <h1 className="text-2xl font-normal text-foreground tracking-wide">
              情绪回顾
            </h1>
          </div>
          <LikeNotifications
            notifications={notifications}
            hasUnread={hasUnreadLikes}
            onOpen={handleOpenNotifications}
          />
        </header>

        {!loadingSpaces && (
          <div className="relative">
            {(() => {
              const acceptedSpaces = coupleSpaces.filter((s) => s.status === "accepted")
              const pendingSentSpaces = coupleSpaces.filter(
                (s) => s.status === "pending" && s.creator_user_id === userId
              )
              const hasAccepted = acceptedSpaces.length > 0
              const hasPendingSent = pendingSentSpaces.length > 0

              if (hasAccepted) {
                return (
                  <div className="mb-10">
                    <SpaceSwitchDisplay
                      currentSpace={currentSpace}
                      spaces={acceptedSpaces}
                      selectedSpaceId={currentSpace === "couple" ? acceptedSpaces[0]?.id : null}
                      onSpaceChange={handleSpaceChange}
                    />
                  </div>
                )
              }

              if (hasPendingSent) {
                return (
                  <PendingInvitationStatus
                    spaceName={pendingSentSpaces[0]?.space_name}
                    onCancel={() => handleCancelInvite(pendingSentSpaces[0].id)}
                  />
                )
              }

              return (
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full",
                      "bg-stone-100 hover:bg-stone-200",
                      "text-sm font-medium text-stone-600",
                      "transition-all duration-300 cursor-pointer",
                      "shadow-sm hover:shadow-md"
                    )}
                  >
                    Invite Partner
                  </button>
                  <p className="mt-3 text-xs text-stone-400 text-center leading-relaxed">
                    Share your emotional journey together<br />
                    Start by inviting your partner
                  </p>
                </div>
              )
            })()}
          </div>
        )}

        {loading || loadingSpaces ? (
             <div className="flex justify-center pt-20 text-muted-foreground/40 animate-pulse">Loading...</div>
         ) : data.length === 0 ? (
           <EmptyState space={currentSpace} />
         ) : (
        /* Timeline Feed */
        <div className="space-y-10 relative">
          
          {/* Pinned Cards Stacked Section */}
          {pinnedEntries.length > 0 && currentSpace === "couple" && (
            <div className="mb-8 pl-14">
              <button
                onClick={() => setPinnedExpanded(!pinnedExpanded)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-2xl",
                  "bg-gradient-to-r from-amber-50 to-amber-100/50",
                  "border border-amber-200/60",
                  "shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {pinnedEntries.slice(0, 3).map((entry) => {
                      const config = MOOD_CONFIG[entry.mood]
                      const Icon = config.icon
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center",
                            "border-2 border-amber-100 bg-white shadow-sm",
                          )}
                        >
                          <Icon className={cn("w-4 h-4", config.color)} strokeWidth={1.5} />
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-sm font-semibold text-amber-700">
                    {pinnedEntries.length} 张教训卡片
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-600/70">
                    {pinnedExpanded ? "收起" : "展开"}
                  </span>
                  <Pin className={cn(
                    "w-4 h-4 text-amber-500 transition-transform duration-300",
                    pinnedExpanded && "rotate-180"
                  )} />
                </div>
              </button>

              {/* Expanded Content */}
              <div className={cn(
                "overflow-hidden transition-all duration-500 ease-out",
                pinnedExpanded ? "mt-4 max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {/* Group pinned entries by date */}
                {Object.entries(
                  pinnedEntries.reduce<Record<string, JournalEntry[]>>((groups, entry) => {
                    const dateObj = new Date(entry.date)
                    const dateKey = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
                    if (!groups[dateKey]) {
                      groups[dateKey] = []
                    }
                    groups[dateKey].push(entry)
                    return groups
                  }, {})
                ).map(([dateLabel, entries]) => (
                  <div key={dateLabel}>
                    {/* Date Header for pinned section */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <span className="text-xs font-semibold text-amber-700 tracking-widest uppercase">{dateLabel}</span>
                    </div>
                    <div className="space-y-3 pl-4">
                      {entries.map((entry) => (
                        <TimelineCard
                          key={entry.id}
                          entry={entry}
                          showAuthor={false}
                          chatLayout={false}
                          currentSpace={currentSpace}
                          onPinned={(id, isPinned) => {
                            setData((prev) => prev.map((item) =>
                              item.id === id ? { ...item, is_pinned: isPinned } : item
                            ))
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vertical Line Decoration — hidden in chat layout */}
          {!isChatLayout && (
            <div className="absolute left-[19px] top-2 bottom-0 w-[1px] bg-gradient-to-b from-muted-foreground/20 via-muted-foreground/10 to-transparent z-0" />
          )}

          {Object.entries(groupedEntries).map(([dateLabel, entries]) => (
            <div key={dateLabel} className="relative z-10 group">
              
              {/* Date Header */}
              {isChatLayout ? (
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-muted/60" />
                  <span className="text-xs font-semibold text-muted-foreground/65 tracking-widest uppercase px-2">{dateLabel}</span>
                  <div className="flex-1 h-px bg-muted/60" />
                </div>
              ) : (
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shadow-sm z-10">
                     <Calendar className="w-4 h-4 text-muted-foreground/70" />
                  </div>
                  <div className="text-base font-bold text-foreground/75 tracking-widest uppercase">
                    {dateLabel}
                  </div>
                </div>
              )}

              {/* Entries */}
              <div className={cn(!isChatLayout ? "space-y-3 pl-14" : "")}>
                {entries.map((entry) => (
                    <TimelineCard
                      key={entry.id}
                      entry={entry}
                      showAuthor={currentSpace === "couple"}
                      chatLayout={isChatLayout}
                      currentSpace={currentSpace}
                      onUpdated={(record) => {
                        if (!record) return
                        const updated = mapItem(record)
                        setData((prev) => prev.map((item) => (item.id === entry.id ? updated : item)))
                      }}
                      onDeleted={(deletedId) => {
                        if (!deletedId) return
                        setData((prev) => prev.filter((item) => item.id !== deletedId))
                      }}
                      onPinned={(id, isPinned) => {
                        setData((prev) => prev.map((item) =>
                          item.id === id ? { ...item, is_pinned: isPinned } : item
                        ))
                      }}
                    />
                ))}
              </div>
            </div>
          ))}

       <div ref={sentinelRef} className="h-1" />
       {isFetchingMore && (
         <div className="text-xs text-muted-foreground/60 tracking-wide flex justify-center pt-4">
          Loading more entries...
         </div>
       )}

          {/* End of Reflection */}
          <div className="flex items-center gap-4 pt-4 opacity-50">
             <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mx-[15px]" />
             <span className="text-xs text-muted-foreground/50 tracking-widest uppercase">End of records</span>
          </div>

        </div>
        )}

        <InvitePartnerModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvited={handleInviteSent}
        />

        <InviteAcceptModal
          isOpen={showAcceptModal}
          spaceName={pendingInvitation?.space_name}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      </main>
    </div>
  )
}

function TimelineCard({
  entry,
  onUpdated,
  onDeleted,
  onPinned,
  showAuthor,
  chatLayout,
  currentSpace,
}: {
  entry: JournalEntry
  onUpdated?: (record: ServerMoodItem) => void
  onDeleted?: (deletedId: string) => void
  onPinned?: (id: string, isPinned: boolean) => void
  showAuthor?: boolean
  chatLayout?: boolean
  currentSpace?: "personal" | "couple"
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editNote, setEditNote] = React.useState(entry.note)
  const [editTags, setEditTags] = React.useState(entry.tags)
  const [editIntensity, setEditIntensity] = React.useState(entry.intensity)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isLiked, setIsLiked] = React.useState(!!entry.liked_by_user_id)
  const [isLikeAnimating, setIsLikeAnimating] = React.useState(false)
  const [isPinned, setIsPinned] = React.useState(entry.is_pinned ?? false)
  const [isPinning, setIsPinning] = React.useState(false)
  const config = MOOD_CONFIG[entry.mood]
  const Icon = config.icon

  const handleStartEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setEditNote(entry.note)
    setEditTags(entry.tags)
    setEditIntensity(entry.intensity)
    setIsEditing(true)
  }

  const handleCancelEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setEditNote(entry.note)
    setEditTags(entry.tags)
    setEditIntensity(entry.intensity)
    setIsEditing(false)
  }

  // In chat layout, partner's cards are read-only
  const isPartnerCard = chatLayout && entry.is_mine === false

  // Can like this card if it's not my own card (partner's card)
  const canLike = entry.is_mine === false

  const handleLike = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    
    if (!canLike) return

    if (navigator.vibrate) {
      navigator.vibrate(8)
    }

    const newLikedState = !isLiked
    setIsLikeAnimating(true)
    setIsLiked(newLikedState)
    
    setTimeout(() => {
      setIsLikeAnimating(false)
    }, 300)

    const apiEndpoint = currentSpace === "couple"
      ? buildApiUrl(`/couple-moods/${entry.id}/like`)
      : buildApiUrl(`/moods/${entry.id}/like`)

    const method = newLikedState ? "POST" : "DELETE"

    fetch(apiEndpoint, {
      method,
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          setIsLiked(!newLikedState)
          throw new Error("Failed to update like")
        }
      })
      .catch((error) => {
        console.error("Like error:", error)
        setIsLiked(!newLikedState)
        toast("Could not update", {
          description: "Please try again.",
          duration: 2000,
        })
      })
  }, [canLike, isLiked, currentSpace, entry.id])

  const canPin = currentSpace === "couple" && entry.is_mine === true

  const handlePin = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (!canPin || isPinning) return

    if (navigator.vibrate) {
      navigator.vibrate(8)
    }

    const newPinnedState = !isPinned
    setIsPinning(true)
    setIsPinned(newPinnedState)

    const apiEndpoint = buildApiUrl(`/couple-moods/${entry.id}/pin`)

    fetch(apiEndpoint, {
      method: "PATCH",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          setIsPinned(!newPinnedState)
          throw new Error("Failed to update pin")
        }
        return res.json()
      })
      .then((json) => {
        setIsPinning(false)
        onPinned?.(entry.id, json.data.is_pinned)
      })
      .catch((error) => {
        console.error("Pin error:", error)
        setIsPinned(!newPinnedState)
        setIsPinning(false)
        toast("Could not update", {
          description: "Please try again.",
          duration: 2000,
        })
      })
  }, [canPin, isPinned, isPinning, entry.id, onPinned])

  const card = (
    <Card 
      onClick={() => {
        if (isEditing) return
        setIsExpanded(!isExpanded)
      }}
      className={cn(
        "border-none transition-all duration-500 cursor-pointer overflow-hidden",
        isExpanded ? "bg-white shadow-md ring-1 ring-black/5" : "bg-white/60 hover:bg-white/80 shadow-sm",
        // Faint rose tint for partner card
        chatLayout && isPartnerCard && "bg-rose-50/30 hover:bg-rose-50/50",
        // Pinned card: important/warning style
        isPinned && [
          "border-l-4 border-l-amber-500",
          "bg-gradient-to-r from-amber-50/50 to-white/60",
          "shadow-md hover:shadow-lg",
        ]
      )}
    >
      <div className={cn(
        "p-5 flex gap-4 items-start",
        // Mirror layout for partner cards — icon moves to right side
        chatLayout && isPartnerCard && "flex-row-reverse"
      )}>
        {/* Thumbnail / Icon Area */}
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300",
          config.bg,
          chatLayout && isPartnerCard && "opacity-80"
        )}>
          <Icon className={cn("w-5 h-5", config.color)} strokeWidth={1.5} />
        </div>

        {/* Content Preview */}
        <div className={cn(
          "flex-1 min-w-0 pt-0.5",
          chatLayout && isPartnerCard && "items-end"
        )}>
          {/* Chat layout: AuthorBadge + time on its own row */}
          {chatLayout && entry.is_mine !== undefined ? (
            <div className={cn(
              "flex items-center gap-2 mb-1.5",
              isPartnerCard ? "flex-row-reverse" : "flex-row"
            )}>
              <AuthorBadge isMine={entry.is_mine} />
              <span className={cn("font-mono", chatLayout ? "text-sm font-semibold text-muted-foreground/60" : "text-[11px] text-muted-foreground/45")}>{entry.time}</span>
              {isPinned && canPin && (
                <button
                  onClick={handlePin}
                  className="p-1 rounded-md hover:bg-amber-100/50 transition-colors cursor-pointer"
                  title="Unpin"
                  disabled={isPinning}
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                </button>
              )}
              {canPin && !isPinned && (
                <button
                  onClick={handlePin}
                  className="p-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  title="Pin to top"
                  disabled={isPinning}
                >
                  <Pin className="w-3.5 h-3.5 text-muted-foreground/40" />
                </button>
              )}
              {isLiked && (
                <span className="flex items-center" title="Seen by partner">
                  <Heart className="w-3.5 h-3.5 text-rose-400/60 fill-rose-400/15" />
                </span>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center mb-1">
              <h3 className={cn("text-base font-bold tracking-wide", config.color)}>{config.label}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono text-muted-foreground/65">{entry.time}</span>
                {isPinned && canPin && (
                  <button
                    onClick={handlePin}
                    className="p-1 rounded-md hover:bg-amber-100/50 transition-colors cursor-pointer"
                    title="Unpin"
                    disabled={isPinning}
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                  </button>
                )}
                {canPin && !isPinned && (
                  <button
                    onClick={handlePin}
                    className="p-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                    title="Pin to top"
                    disabled={isPinning}
                  >
                    <Pin className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </button>
                )}
                {isLiked && (
                  <span className="flex items-center" title="Seen by partner">
                    <Heart className="w-3.5 h-3.5 text-rose-400/60 fill-rose-400/15" />
                  </span>
                )}
                {showAuthor && entry.is_mine !== undefined && (
                  <AuthorBadge isMine={entry.is_mine} />
                )}
              </div>
            </div>
          )}

          {/* Mood label row (chat layout only) */}
          {chatLayout && (
            <h3 className={cn(
              "font-bold tracking-wide mb-1.5 text-lg",
              isPartnerCard ? "text-right" : "",
              config.color
            )}>{config.label}</h3>
          )}
          
          <p className={cn(
            "leading-relaxed transition-all duration-500 font-normal",
            chatLayout ? "text-[15px] text-foreground/55" : "text-sm text-muted-foreground/70",
             isExpanded ? "line-clamp-none" : "line-clamp-2",
             chatLayout && isPartnerCard && "text-right"
          )}>
            {entry.note}
          </p>

          {!isExpanded && (
              <div className={cn(
                "mt-2.5 flex gap-2 items-center",
                chatLayout && isPartnerCard ? "justify-end" : "justify-start"
              )}>
                 <span className={cn(
                   "px-2.5 py-1 rounded-full bg-secondary/30 text-secondary-foreground",
                   chatLayout ? "text-xs font-semibold" : "text-[10px]"
                 )}>
                    {entry.intensity}% Intensity
                 </span>
              </div>
           )}
        </div>
      </div>

      {/* Expanded Details */}
      <div className={cn(
        "bg-white/50 border-t border-black/[0.03] transition-all duration-500 ease-in-out overflow-y-auto",
        isExpanded ? (isEditing ? "max-h-96 opacity-100" : "max-h-64 opacity-100") : "max-h-0 opacity-0 overflow-hidden"
      )}>
        <div className="p-5 pt-4 space-y-4">
          <div className={cn(
            "transition-all duration-500",
            isEditing ? "opacity-0 scale-[0.99] pointer-events-none h-0 overflow-hidden" : "opacity-100 scale-100"
          )}>
           {/* Intensity Bar */}
           <div>
              <div className={cn(
                "flex justify-between text-muted-foreground mb-2 px-1",
                chatLayout ? "text-sm font-semibold" : "text-xs"
              )}>
                <span>Intensity</span>
                <span>{entry.intensity}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-primary/50 rounded-full" 
                   style={{ width: `${entry.intensity}%` }} 
                 />
              </div>
           </div>

           {/* Tags */}
           <div className="flex flex-wrap gap-2 pt-1">
             {entry.tags.map(tag => (
               <span key={tag} className={cn(
                 "px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground/70",
                 chatLayout ? "text-sm font-medium" : "text-xs"
               )}>
                 #{tag}
               </span>
             ))}
           </div>

           <div className="pt-2">
              <div className="h-px w-full bg-muted/60" />
              <div className={cn(
                "mt-3 flex items-center justify-between tracking-wide",
                chatLayout ? "text-sm font-medium" : "text-xs",
                "transition-all duration-500",
                isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              )}>
                {canLike && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 rounded-full",
                      "transition-all duration-300 active:scale-[0.95]",
                      isLiked 
                        ? "text-rose-400/80" 
                        : "text-muted-foreground/50 hover:text-rose-300/70"
                    )}
                    onClick={handleLike}
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-all duration-300",
                        isLikeAnimating && "scale-125",
                        isLiked && "fill-rose-400/30"
                      )} 
                      strokeWidth={isLiked ? 1.5 : 1.8}
                    />
                  </button>
                </div>
                )}
                <div className="flex items-center gap-4">
                {!isPartnerCard && (
                  <button
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98]"
                    onClick={handleStartEdit}
                  >
                    Edit entry
                  </button>
                )}
                {!isPartnerCard && (
                  <button
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98]"
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

          <div className={cn(
            "transition-all duration-500",
            isEditing ? "opacity-100 scale-100" : "opacity-0 scale-[0.99] pointer-events-none h-0 overflow-hidden"
          )}
          onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-3xl bg-[#fcfbf9] ring-1 ring-black/5 p-4 space-y-4 shadow-[0_10px_30px_-25px_rgba(0,0,0,0.25)]">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
                  <span>Intensity</span>
                  <span>{editIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={editIntensity}
                  onChange={(event) => setEditIntensity(Number(event.target.value))}
                  className="w-full h-1.5 rounded-full bg-muted/70 accent-primary/60"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground/70 px-1">Note</label>
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
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
                      className="text-[11px] px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98]"
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
                <div className="h-px w-full bg-muted/60" />
                <div className="mt-3 flex items-center justify-end gap-4 text-xs tracking-wide">
                  <button
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98]"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="text-foreground/70 hover:text-foreground/80 transition-opacity duration-300 active:scale-[0.98]"
                    onClick={(event) => {
                      event.stopPropagation()
                      setIsSaving(true)
                      const apiEndpoint = currentSpace === "couple"
                        ? `/couple-moods/${entry.id}`
                        : `/moods/${entry.id}`
                      fetch(buildApiUrl(apiEndpoint), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          mood_type: entry.mood,
                          intensity: editIntensity,
                          note: editNote,
                          tags: editTags,
                        }),
                      })
                        .then((res) => {
                          if (!res.ok) {
                            throw new Error("Failed to update mood")
                          }
                          return res.json()
                        })
                        .then((payload) => {
                          const record = payload?.data?.record as ServerMoodItem | undefined
                          if (record) {
                            onUpdated?.(record)
                          }
                          toast("Saved gently", {
                            description: "Your memory has been refreshed.",
                            duration: 2000,
                          })
                          setIsEditing(false)
                        })
                        .catch((error) => {
                          console.error("Update mood failed", error)
                          toast("Could not save", {
                            description: "Please try again in a moment.",
                            duration: 2200,
                          })
                        })
                        .finally(() => {
                          setIsSaving(false)
                        })
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDeleteOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)}>
          <div
            className="w-[92%] max-w-sm rounded-[28px] bg-[#fdfbf7] shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 p-6 animate-[fadeScale_0.25s_ease-out]"
            onClick={(e) => e.preventDefault()}
          >
            <h3 className="text-base font-light text-foreground/85 tracking-wide">Remove this memory?</h3>
              <p className="text-xs text-muted-foreground/70 mt-3 leading-relaxed">
              You cannot undo this action. If this entry feels heavy, it is okay to let it go.
            </p>
            <div className="mt-5 h-px w-full bg-muted/60" />
            <div className="mt-4 flex items-center justify-end gap-4 text-xs">
              <button
                type="button"
                className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  setIsDeleteOpen(false)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="text-[#a67c5b]/80 hover:text-[#8f6647] transition-opacity duration-300 active:scale-[0.98] cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  setIsDeleting(true)
                  const deleteApiEndpoint = currentSpace === "couple"
                    ? `/couple-moods/${entry.id}`
                    : `/moods/${entry.id}`
                  fetch(buildApiUrl(deleteApiEndpoint), {
                    method: "DELETE",
                    credentials: "include",
                  })
                    .then((res) => {
                      if (!res.ok) {
                        throw new Error("Failed to delete mood")
                      }
                      return res.json()
                    })
                    .then(() => {
                      onDeleted?.(entry.id)
                      toast("Removed softly", {
                        description: "That memory has been let go.",
                        duration: 2000,
                      })
                      setIsDeleteOpen(false)
                    })
                    .catch((error) => {
                      console.error("Delete mood failed", error)
                      toast("Could not remove", {
                        description: "Please try again in a moment.",
                        duration: 2200,
                      })
                    })
                    .finally(() => {
                      setIsDeleting(false)
                    })
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Card>
  )

  if (chatLayout) {
    return (
      // 3-column flex: [left track] [card content] [right track]
      // Track columns are full-height in-flow divs — lines stack naturally with no absolute positioning
      <div className="flex items-stretch">

        {/* Left track column — stone, used by my entries */}
        <div className="w-6 shrink-0 flex flex-col items-center relative">
          {/* Continuous vertical line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-stone-200/70" />
          {/* Node dot — only for my cards */}
          {!isPartnerCard && (
            <div className="relative z-10 mt-[20px] w-2 h-2 rounded-full bg-stone-300/90 ring-2 ring-white shrink-0" />
          )}
        </div>

        {/* Card area — py provides vertical rhythm, the track columns fill that height too */}
        <div className="flex-1 min-w-0 py-1.5">
          <div className={cn("flex", isPartnerCard ? "justify-end" : "justify-start")}>
            {/* Horizontal connector pip */}
            <div className={cn(
              "self-start mt-[22px] h-px w-3 shrink-0",
              isPartnerCard ? "order-last bg-rose-200" : "order-first bg-stone-200"
            )} />
            <div className="min-w-0 max-w-[calc(100%-12px)]">
              {card}
            </div>
          </div>
        </div>

        {/* Right track column — rose, used by partner entries */}
        <div className="w-6 shrink-0 flex flex-col items-center relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-rose-200/60" />
          {isPartnerCard && (
            <div className="relative z-10 mt-[20px] w-2 h-2 rounded-full bg-rose-300/80 ring-2 ring-white shrink-0" />
          )}
        </div>

      </div>
    )
  }

  return card
}
