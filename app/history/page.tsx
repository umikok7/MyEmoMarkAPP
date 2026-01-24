"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
// Badge import removed
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, CloudSun, Leaf, Wind, Droplets, Zap, Sparkles, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

// Mood Config Map
const MOOD_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  happy: { label: "Joy", color: "text-rose-400", bg: "bg-rose-50", icon: CloudSun },
  calm: { label: "Calm", color: "text-teal-500", bg: "bg-teal-50", icon: Leaf },
  anxious: { label: "Worry", color: "text-amber-500", bg: "bg-amber-50", icon: Wind },
  sad: { label: "Blue", color: "text-blue-400", bg: "bg-blue-50", icon: Droplets },
  angry: { label: "Heat", color: "text-red-400", bg: "bg-red-50", icon: Zap },
}

export default function HistoryPage() {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<JournalEntry[]>([])

  // Fetch data
  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://localhost/api/moods')
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        
        // Transform backend definition to frontend props
        // Backend: { id, mood_type, intensity, note, tags, created_at }
        // Frontend: { id, date, time, mood, intensity, note, tags }
        const items = json?.data?.items || []
        const mappedData = items.map((item: any) => {
          const dateObj = new Date(item.created_at)
          return {
            id: item.id,
            date: item.created_at,
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            mood: item.mood_type as MoodType,
            intensity: item.intensity,
            note: item.note,
            tags: item.tags || []
          }
        })
        setData(mappedData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])


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
        <header className="flex items-center gap-4 mb-10 pt-4">
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

          {Object.entries(groupedEntries).map(([dateLabel, entries], index) => (
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
                   <TimelineCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}

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

function TimelineCard({ entry }: { entry: JournalEntry }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const config = MOOD_CONFIG[entry.mood]
  const Icon = config.icon

  return (
    <Card 
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "border-none shadow-sm transition-all duration-500 cursor-pointer overflow-hidden",
        isExpanded ? "bg-white shadow-md scale-[1.02] ring-1 ring-black/5" : "bg-white/60 hover:bg-white/80"
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
        "bg-white/50 border-t border-black/[0.03] transition-all duration-500 ease-in-out",
        isExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
      )}>
        <div className="p-5 pt-4 space-y-4">
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
           <div className="flex flex-wrap gap-2">
             {entry.tags.map(tag => (
               <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground/70">
                 #{tag}
               </span>
             ))}
           </div>
           
        </div>
      </div>
    </Card>
  )
}
