"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
// Badge import removed
import { Button } from "@/components/ui/button"
import { CloudSun, Leaf, Wind, Droplets, Zap, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/api"

// Mock Data removed
type MoodType = "happy" | "calm" | "anxious" | "sad" | "angry"

interface JournalEntry {
  id: string
  date: string // ISO date string
  time: string
  mood: MoodType
  intensity: number
  note: string
  tags: string[]
}

type ServerMoodItem = {
  id: string
  mood_type: MoodType
  intensity: number
  note?: string
  tags?: string[]
  created_at: string
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

  // Fetch data
  const mapItem = React.useCallback((item: ServerMoodItem): JournalEntry => {
    const dateObj = new Date(item.created_at)
    return {
      id: item.id,
      date: item.created_at,
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mood: item.mood_type as MoodType,
      intensity: item.intensity,
      note: item.note ?? "",
      tags: item.tags || [],
    }
  }, [])

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

  const fetchHistoryPage = React.useCallback(async (offsetValue: number, append = false) => {
    if (userId === null) return
    try {
      const res = await fetch(buildApiUrl("/moods", {
        limit: PAGE_LIMIT,
        offset: offsetValue,
        user_id: userId || undefined,
      }), { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Failed to fetch history')
      }
      const json = await res.json()
      const items = (json?.data?.items || []) as ServerMoodItem[]
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
  }, [mapItems, userId])

  React.useEffect(() => {
    if (userId === null) return
    setData([])
    setOffset(0)
    setHasMore(true)
    setLoading(true)
    fetchHistoryPage(0)
  }, [fetchHistoryPage, userId])

  const loadMore = React.useCallback(async () => {
    if (!hasMore || isFetchingMore || loading) return
    setIsFetchingMore(true)
    await fetchHistoryPage(offset, true)
    setIsFetchingMore(false)
  }, [fetchHistoryPage, hasMore, isFetchingMore, loading, offset])

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


  // Group entries by date
  const groupedEntries = React.useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {}
    data.forEach((entry) => {
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
  }, [data])

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 pb-32 flex justify-center">
      <main className="w-full max-w-md">
        
        {/* Header */}
  <header className="flex items-center gap-4 mb-10 pt-4 safe-area-header">
          <Link href="/">
             <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2">
               <ArrowLeft className="w-5 h-5 text-muted-foreground" />
             </Button>
          </Link>
          <h1 className="text-2xl font-normal text-foreground tracking-wide">
            情绪回顾
          </h1>
        </header>

        {loading ? (
             <div className="flex justify-center pt-20 text-muted-foreground/40 animate-pulse">Loading...</div>
        ) : (
        /* Timeline Feed */
        <div className="space-y-10 relative">
          
          {/* Vertical Line Decoration */}
          <div className="absolute left-[19px] top-2 bottom-0 w-[1px] bg-gradient-to-b from-muted-foreground/20 via-muted-foreground/10 to-transparent z-0" />

          {Object.entries(groupedEntries).map(([dateLabel, entries]) => (
            <div key={dateLabel} className="relative z-10 group">
              
              {/* Date Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shadow-sm z-10">
                   <Calendar className="w-4 h-4 text-muted-foreground/70" />
                </div>
                <div className="text-sm font-medium text-muted-foreground/80 tracking-widest uppercase">
                  {dateLabel}
                </div>
              </div>

              {/* Entries */}
              <div className="space-y-4 pl-14">
                {entries.map((entry) => (
                   <TimelineCard
                     key={entry.id}
                     entry={entry}
                     onUpdated={(record) => {
                       if (!record) return
                       const updated = mapItem(record)
                       setData((prev) => prev.map((item) => (item.id === entry.id ? updated : item)))
                     }}
                     onDeleted={(deletedId) => {
                       if (!deletedId) return
                       setData((prev) => prev.filter((item) => item.id !== deletedId))
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
      </main>
    </div>
  )
}

function TimelineCard({
  entry,
  onUpdated,
  onDeleted,
}: {
  entry: JournalEntry
  onUpdated?: (record: ServerMoodItem) => void
  onDeleted?: (deletedId: string) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editNote, setEditNote] = React.useState(entry.note)
  const [editTags, setEditTags] = React.useState(entry.tags)
  const [editIntensity, setEditIntensity] = React.useState(entry.intensity)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
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

  return (
    <Card 
      onClick={() => {
        if (isEditing) return
        setIsExpanded(!isExpanded)
      }}
      className={cn(
        "border-none shadow-sm transition-all duration-500 cursor-pointer overflow-hidden",
        isExpanded ? "bg-white shadow-md ring-1 ring-black/5" : "bg-white/60 hover:bg-white/80"
      )}
    >
      <div className="p-5 flex gap-4 items-start">
        {/* Thumbnail / Icon Area */}
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300",
          config.bg
        )}>
          <Icon className={cn("w-6 h-6", config.color)} strokeWidth={1.5} />
        </div>

        {/* Content Preview */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex justify-between items-center mb-1">
             <h3 className="text-base font-medium text-foreground/90">{config.label}</h3>
             <span className="text-xs font-mono text-muted-foreground/60">{entry.time}</span>
          </div>
          
          <p className={cn(
            "text-sm text-muted-foreground/80 leading-relaxed transition-all duration-500",
             isExpanded ? "line-clamp-none" : "line-clamp-2"
          )}>
            {entry.note}
          </p>

          {!isExpanded && (
             <div className="mt-3 flex gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full bg-secondary/30 text-secondary-foreground">
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
              <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
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
               <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground/70">
                 #{tag}
               </span>
             ))}
           </div>

           <div className="pt-2">
             <div className="h-px w-full bg-muted/60" />
             <div className={cn(
               "mt-3 flex items-center justify-between text-xs tracking-wide",
               "transition-all duration-500",
               isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
             )}>
               <button
                 type="button"
                 className="text-muted-foreground/70 hover:text-foreground/70 transition-opacity duration-300 active:scale-[0.98]"
                 onClick={handleStartEdit}
               >
                 Edit entry
               </button>
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
                      fetch(buildApiUrl(`/moods/${entry.id}`), {
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
                  fetch(buildApiUrl(`/moods/${entry.id}`), {
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
}
