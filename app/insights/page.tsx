"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AnniversaryModal, DayCheckinModal } from "@/features/insights"
import { MoodDonutChart } from "@/features/insights"
import { useMonthInsights, HEATMAP_LEVELS, getHeatmapLevel } from "@/features/insights"
import type { AnniversaryItem } from "@/features/insights"
import anniversariesData from "@/data/anniversaries.json"

const ANNIVERSARIES = anniversariesData as AnniversaryItem[]
const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"]

export default function InsightsPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date())
  const [selectedAnniversary, setSelectedAnniversary] = React.useState<AnniversaryItem | null>(null)
  const [selectedCheckinDate, setSelectedCheckinDate] = React.useState<Date | null>(null)

  const { donutData, suggestion, monthLabel, calendar, checkins, isLoading } = useMonthInsights(selectedDate)

  const checkinsByDate = React.useMemo(
    () => checkins.reduce<Record<string, typeof checkins>>((itemsByDate, task) => {
      const dateKey = String(task.task_date).slice(0, 10)
      itemsByDate[dateKey] = itemsByDate[dateKey] ?? []
      itemsByDate[dateKey].push(task)
      return itemsByDate
    }, {}),
    [checkins]
  )

  const anniversaryMap = React.useMemo(
    () =>
      ANNIVERSARIES.reduce<Record<string, AnniversaryItem>>((acc, item) => {
        acc[item.date] = item
        return acc
      }, {}),
    []
  )

  const isCurrentMonth =
    selectedDate.getFullYear() === new Date().getFullYear() &&
    selectedDate.getMonth() === new Date().getMonth()

  const goToPreviousMonth = () => { setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); }

  const goToNextMonth = () => {
    const today = new Date()
    const next = new Date(selectedDate)
    next.setMonth(selectedDate.getMonth() + 1)
    if (next <= today) {
      setSelectedDate(next)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1ec] pb-32">
      <div className="max-w-md mx-auto px-5 pt-safe">
        <header className="flex items-center gap-3 pt-6 pb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2 h-9 w-9">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-light text-foreground/70 tracking-wide">Reflection</h1>
            {monthLabel && <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>}
          </div>
        </header>

        <div className="space-y-5">
          <section className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Your Month</h2>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-7 w-7 rounded-full hover:bg-black/5"
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Button>

                <button
                  onClick={() => { setSelectedDate(new Date()); }}
                  disabled={isCurrentMonth || isLoading}
                  className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {monthLabel || "Today"}
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={isCurrentMonth || isLoading}
                  className="h-7 w-7 rounded-full hover:bg-black/5 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-sm text-muted-foreground/40">Loading calendar...</div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {WEEK_DAYS.map((day, index) => (
                    <div key={`${day}-${index}`} className="text-center text-xs text-muted-foreground/50 font-light py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((day, index) => {
                    const heatmapLevel = getHeatmapLevel(day.taskCompleted, day.taskCount)
                    const heatmapColor = HEATMAP_LEVELS[heatmapLevel]
                    const anniversary = day.dateString ? anniversaryMap[day.dateString] : undefined
                    const dayCheckins = day.dateString ? checkinsByDate[day.dateString] ?? [] : []

                    return (
                      <div key={`${day.dateString ?? "pad"}-${index}`} className="relative flex min-h-[72px] items-stretch justify-center">
                        {day.date === null ? (
                          <span className="text-xs text-transparent">.</span>
                        ) : anniversary ? (
                          <button
                            type="button"
                            onClick={() => { setSelectedCheckinDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.date ?? 1)); }}
                            className="group relative min-h-[72px] w-full rounded-lg transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                            aria-label={`Record check-ins for ${day.dateString}`}
                          >
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#fff8f6] via-[#f9e6e2] to-[#f3d4d0]" />
                            <div className="absolute inset-0 rounded-lg border border-[#ebc5c7] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_58%)]" />
                            <span className="relative z-10 flex justify-center pt-1 text-xs font-semibold text-[#8f4d59]">{day.date}</span>
                            <span className="relative z-10 mt-1 flex w-full flex-col items-center gap-0.5 px-0.5 pb-1 text-center">
                              {dayCheckins.map((task) => (
                                <span
                                  key={task.id}
                                  title={task.title}
                                  className={cn(
                                    "w-full truncate rounded-[2px] px-0.5 text-center text-[8px] leading-[12px]",
                                    task.is_done
                                      ? "bg-emerald-100/90 text-emerald-900 line-through"
                                      : "bg-white/70 text-stone-700"
                                  )}
                                >
                                  {task.title}
                                </span>
                              ))}
                            </span>
                            <Heart className="absolute right-1 top-1 h-2.5 w-2.5 fill-current text-[#c98793] transition-transform duration-300 group-hover:scale-110" />
                            {dayCheckins.length === 0 && (
                              <Sparkles className="absolute bottom-1 right-1 h-2.5 w-2.5 text-[#d59ba3] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSelectedCheckinDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.date ?? 1)); }}
                            className="relative flex min-h-[72px] w-full flex-col items-center rounded-lg cursor-pointer"
                            aria-label={`Record check-ins for ${day.dateString ?? day.date}`}
                          >
                            {day.taskCount > 0 && (
                              <div className={cn("absolute inset-0 rounded-lg transition-all duration-300 border", heatmapColor.bg, heatmapColor.border)} />
                            )}
                            <span
                              className={cn(
                                "relative z-10 pt-1 text-xs",
                                day.taskCount > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground/30 font-light"
                              )}
                            >
                              {day.date}
                            </span>
                            <span className="relative z-10 mt-1 flex w-full flex-col items-center gap-0.5 px-0.5 pb-1 text-center">
                              {dayCheckins.map((task) => (
                                <span
                                  key={task.id}
                                  title={task.title}
                                  className={cn(
                                    "w-full truncate rounded-[2px] px-0.5 text-center text-[8px] leading-[12px]",
                                    task.is_done
                                      ? "bg-emerald-100/90 text-emerald-900 line-through"
                                      : "bg-white/70 text-stone-700"
                                  )}
                                >
                                  {task.title}
                                </span>
                              ))}
                            </span>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-black/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Task Progress</span>
                <div className="flex items-center gap-2">
                  {HEATMAP_LEVELS.map((color, index) => (
                    <div key={index} className={cn("w-3 h-3 rounded-sm border", color.bg, color.border)} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm p-5 rounded-3xl">
            <h2 className="text-xs font-medium text-muted-foreground mb-3 tracking-wider uppercase">Mood Balance</h2>
            <MoodDonutChart data={donutData} isLoading={isLoading} />
          </Card>

          <div className="relative mt-4 pt-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-white/40 backdrop-blur-sm rounded-sm shadow-sm" />
            <Card className="border-none shadow-sm bg-gradient-to-br from-[#fff9f5] to-[#fef5ed] p-6 rounded-2xl mt-1">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/30 mt-2 flex-shrink-0" />
                <p className="text-sm font-light text-foreground/80 leading-relaxed">
                  {isLoading ? "..." : suggestion}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AnniversaryModal anniversary={selectedAnniversary} onClose={() => { setSelectedAnniversary(null); }} />
      {selectedCheckinDate && (
        <DayCheckinModal
          date={selectedCheckinDate}
          anniversary={anniversaryMap[`${selectedCheckinDate.getFullYear()}-${String(selectedCheckinDate.getMonth() + 1).padStart(2, "0")}-${String(selectedCheckinDate.getDate()).padStart(2, "0")}`]}
          onClose={() => { setSelectedCheckinDate(null); }}
          onOpenAnniversary={setSelectedAnniversary}
        />
      )}
    </div>
  )
}
