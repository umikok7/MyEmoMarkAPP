"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Sparkles, X } from "lucide-react"
import Link from "next/link"
import ReactECharts from "echarts-for-react"
import { Button } from "@/components/ui/button"
import { buildApiUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import anniversariesData from "@/data/anniversaries.json"

type CalendarDay = {
  date: number | null
  dateString: string | null
  taskCount: number
  taskCompleted: number
}

type AnniversaryItem = {
  date: string
  title: string
  subtitle: string
  description: string
}

// Muji风格热力图颜色配置
const HEATMAP_COLORS = [
  { bg: "bg-[#FAFAFA]", border: "border-[#F0F0F0]", label: "无数据" },
  { bg: "bg-[#F5F2EB]", border: "border-[#E8E4DC]", label: "1-25%" },
  { bg: "bg-[#E8DFD0]", border: "border-[#DDD5C3]", label: "26-50%" },
  { bg: "bg-[#C4B5A0]", border: "border-[#B8A68E]", label: "51-75%" },
  { bg: "bg-[#8B7355]", border: "border-[#7A6548]", label: "76-100%" },
]

const getHeatmapLevel = (completed: number, total: number): number => {
  if (total === 0) return 0
  const rate = (completed / total) * 100
  if (rate <= 25) return 1
  if (rate <= 50) return 2
  if (rate <= 75) return 3
  return 4
}

type DonutData = {
  name: string
  value: number
  color: string
}

const ANNIVERSARIES = anniversariesData as AnniversaryItem[]

const formatAnniversaryDate = (dateString: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateString}T00:00:00`))

export default function InsightsPage() {
  const [loading, setLoading] = React.useState(true)
  const [calendar, setCalendar] = React.useState<CalendarDay[]>([])
  const [donutData, setDonutData] = React.useState<DonutData[]>([])
  const [suggestion, setSuggestion] = React.useState("")
  const [monthLabel, setMonthLabel] = React.useState("")
  const [userId, setUserId] = React.useState<string | null>(null)
  const [selectedAnniversary, setSelectedAnniversary] = React.useState<AnniversaryItem | null>(null)

  // Month navigation state
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  // 获取用户ID
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const rawUser = window.localStorage.getItem("awesome-user")
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

  React.useEffect(() => {
    const abortController = new AbortController()

    const fetchInsights = async () => {
      try {
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth() + 1

        // 并行请求心情数据和月度任务数据
        const [moodsRes, tasksRes] = await Promise.all([
          fetch(buildApiUrl("/moods/analytics", { year, month }), {
            credentials: "include",
            signal: abortController.signal,
          }),
          fetch(buildApiUrl("/tasks/month", { year, month, user_id: userId || undefined }), {
            credentials: "include",
            signal: abortController.signal,
          }),
        ])

        if (!moodsRes.ok) throw new Error("Failed to fetch moods")
        const moodsJson = await moodsRes.json()
        const moodsData = moodsJson.data || {}

        // 处理月度任务数据
        let taskMap: Record<string, { total: number; completed: number }> = {}
        if (tasksRes.ok) {
          const tasksJson = await tasksRes.json()
          const tasks = tasksJson?.data?.tasks || []
          taskMap = tasks.reduce((acc: Record<string, { total: number; completed: number }>, task: { task_date: string | Date; is_done: boolean }) => {
            const dateStr = new Date(task.task_date).toISOString().split("T")[0]
            if (!acc[dateStr]) {
              acc[dateStr] = { total: 0, completed: 0 }
            }
            acc[dateStr].total++
            if (task.is_done) {
              acc[dateStr].completed++
            }
            return acc
          }, {})
        }

        // 生成日历数据
        const currentYear = year
        const currentMonth = month - 1
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        const totalDays = lastDay.getDate()
        const startDayOfWeek = firstDay.getDay()

        const calendar: CalendarDay[] = []
        for (let i = 0; i < startDayOfWeek; i++) {
          calendar.push({ date: null, dateString: null, taskCount: 0, taskCompleted: 0 })
        }

        for (let day = 1; day <= totalDays; day++) {
          const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const taskData = taskMap[dateString] || { total: 0, completed: 0 }
          calendar.push({
            date: day,
            dateString,
            taskCount: taskData.total,
            taskCompleted: taskData.completed,
          })
        }

        setCalendar(calendar)
        setDonutData(moodsData.donut_chart || [])
        setSuggestion(moodsData.suggestion || "")
        setMonthLabel(moodsData.month || "")

      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchInsights()

    return () => abortController.abort()
  }, [selectedDate, userId])

  React.useEffect(() => {
    if (!selectedAnniversary) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAnniversary(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedAnniversary])
  
  const goToPreviousMonth = () => {
    setLoading(true)
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }
  
  const goToNextMonth = () => {
    setLoading(true)
    const today = new Date()
    const nextMonth = new Date(selectedDate)
    nextMonth.setMonth(selectedDate.getMonth() + 1)
    
    // Don't allow going beyond current month
    if (nextMonth <= today) {
      setSelectedDate(nextMonth)
    } else {
      setLoading(false)
    }
  }
  
  const goToCurrentMonth = () => {
    setLoading(true)
    setSelectedDate(new Date())
  }
  
  const isCurrentMonth = () => {
    const today = new Date()
    return selectedDate.getFullYear() === today.getFullYear() && 
           selectedDate.getMonth() === today.getMonth()
  }
  
  const anniversaryMap = React.useMemo(() => {
    return ANNIVERSARIES.reduce<Record<string, AnniversaryItem>>((acc, item) => {
      acc[item.date] = item
      return acc
    }, {})
  }, [])

  // Donut chart configuration
  const donutOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#f0ebe6",
      borderWidth: 1,
      textStyle: {
        color: "#5c5c5c",
        fontSize: 12,
      },
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: "Moods",
        type: "pie",
        radius: ["55%", "85%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fffdfa",
          borderWidth: 3,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: false,
          label: {
            show: true,
            fontSize: 14,
            fontWeight: "normal",
            color: "#5c5c5c",
          },
        },
        labelLine: {
          show: false,
        },
        data: donutData,
      },
    ],
  }

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <div className="min-h-screen bg-[#f5f1ed] pb-32">
      <div className="max-w-md mx-auto px-5 pt-safe">
        
        {/* Header */}
        <header className="flex items-center gap-3 pt-6 pb-8">
          <Link href="/">
             <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2 h-9 w-9">
               <ArrowLeft className="w-5 h-5 text-muted-foreground" />
             </Button>
          </Link>
          <div>
            <h1 className="text-lg font-light text-foreground/70 tracking-wide">
              Reflection
            </h1>
            {monthLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
            )}
          </div>
        </header>

        <div className="space-y-5">
          
          {/* Monthly Mood Calendar - Main Focus */}
          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm p-5 rounded-3xl">
            {/* Calendar Header with Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                Your Month
              </h2>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-7 w-7 rounded-full hover:bg-black/5"
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Button>
                
                <button
                  onClick={goToCurrentMonth}
                  disabled={isCurrentMonth() || loading}
                  className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {monthLabel || "Today"}
                </button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={isCurrentMonth() || loading}
                  className="h-7 w-7 rounded-full hover:bg-black/5 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-sm text-muted-foreground/40">Loading calendar...</div>
              </div>
            ) : (
              <div>
                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-center text-xs text-muted-foreground/50 font-light py-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((day, idx) => {
                    const heatmapLevel = getHeatmapLevel(day.taskCompleted, day.taskCount)
                    const heatmapColor = HEATMAP_COLORS[heatmapLevel]
                    const anniversary = day.dateString ? anniversaryMap[day.dateString] : undefined
                    const isAnniversary = Boolean(anniversary)

                    return (
                      <div
                        key={idx}
                        className="aspect-square flex items-center justify-center relative"
                      >
                        {day.date ? (
                          isAnniversary ? (
                            <button
                              type="button"
                              onClick={() => setSelectedAnniversary(anniversary ?? null)}
                              className={cn(
                                "group w-full h-full rounded-lg relative overflow-hidden",
                                "transition-all duration-300 ease-out",
                                "hover:scale-[1.03] active:scale-[0.98]"
                              )}
                              aria-label={`Open anniversary for ${formatAnniversaryDate(day.dateString ?? "")}`}
                            >
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#fff8f6] via-[#f9e6e2] to-[#f3d4d0]" />
                              <div className="absolute inset-0 rounded-lg border border-[#ebc5c7] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_58%)]" />
                              <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-[#fff5f3] blur-sm transition-transform duration-300 group-hover:scale-125" />

                              <span className="relative z-10 flex h-full items-center justify-center text-xs font-semibold text-[#8f4d59]">
                                {day.date}
                              </span>

                              <Heart className="absolute right-1 top-1 h-2.5 w-2.5 fill-current text-[#c98793] transition-transform duration-300 group-hover:scale-110" />
                              <Sparkles className="absolute bottom-1 right-1 h-2.5 w-2.5 text-[#d59ba3] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                            </button>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center rounded-lg relative">
                              {/* 热力图背景 - 有任务记录时显示 */}
                              {day.taskCount > 0 && (
                                <div
                                  className={`absolute inset-0 rounded-lg transition-all duration-300 ${heatmapColor.bg} ${heatmapColor.border}`}
                                />
                              )}

                              {/* 日期数字 */}
                              <span
                                className={`relative z-10 text-xs ${
                                  day.taskCount > 0
                                    ? "text-foreground/80 font-medium"
                                    : "text-muted-foreground/30 font-light"
                                }`}
                              >
                                {day.date}
                              </span>

                              {/* 完成度指示点 */}
                              {day.taskCount > 0 && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60" />
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-transparent">.</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Heatmap Legend */}
            <div className="mt-4 pt-4 border-t border-black/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Task Progress</span>
                <div className="flex items-center gap-2">
                  {HEATMAP_COLORS.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <div
                        className={`w-3 h-3 rounded-sm ${color.bg} ${color.border}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Small Donut Chart for Mood Distribution */}
          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm p-5 rounded-3xl">
            <h2 className="text-xs font-medium text-muted-foreground mb-3 tracking-wider uppercase">
              Mood Balance
            </h2>
            
            <div className="flex items-center gap-4">
              {/* Chart */}
              <div className="flex-shrink-0 w-28 h-28">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-xs text-muted-foreground/40">...</div>
                  </div>
                ) : (
                  <ReactECharts 
                    option={donutOption} 
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "svg" }}
                  />
                )}
              </div>
              
              {/* Legend */}
              <div className="flex-1 space-y-1.5">
                {donutData.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-foreground/70 font-light flex-1">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-light">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Suggestion Card - Sticky Note Style */}
          <div className="relative mt-4 pt-3">
            {/* Tape effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-white/40 backdrop-blur-sm rounded-sm shadow-sm" />
            
            <Card className="border-none shadow-sm bg-gradient-to-br from-[#fff9f5] to-[#fef5ed] p-6 rounded-2xl mt-1">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary/30 mt-2 flex-shrink-0" />
                  <p className="text-sm font-light text-foreground/80 leading-relaxed">
                    {loading ? "..." : suggestion}
                  </p>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {selectedAnniversary && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-5 py-10"
          onClick={() => setSelectedAnniversary(null)}
        >
          <div className="absolute inset-0 bg-[#6f5158]/15 backdrop-blur-md" />

          <div
            className={cn(
              "relative w-full max-w-sm overflow-hidden rounded-[32px]",
              "bg-gradient-to-br from-[#fffdfa] via-[#fff7f2] to-[#fbe8e3]",
              "border border-white/70 shadow-[0_28px_80px_-28px_rgba(98,56,63,0.5)]",
              "px-6 pb-6 pt-7 animate-[fadeScale_0.24s_ease-out]"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[#ffd9d2]/35 blur-2xl" />
            <div className="absolute right-5 top-5 z-20">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedAnniversary(null)
                }}
                aria-label="Close anniversary details"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/75 text-[#9d6d75] shadow-sm transition-colors hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#b57984] shadow-sm">
                <Heart className="h-3.5 w-3.5 fill-current" />
                纪念日
              </div>

              <div className="mt-5 rounded-[28px] bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white/70">
                <p className="text-xs tracking-[0.2em] text-[#c1979d]">
                  {formatAnniversaryDate(selectedAnniversary.date)}
                </p>
                <h3 className="mt-3 text-[28px] leading-[1.15] text-[#7d4a53]" style={{ fontFamily: "Georgia, serif" }}>
                  {selectedAnniversary.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#9f737a]">
                  {selectedAnniversary.subtitle}
                </p>
                <div className="mt-5 h-px bg-gradient-to-r from-transparent via-[#e9cfc9] to-transparent" />
                <p className="mt-5 text-sm leading-7 text-[#6b5a5e]">
                  {selectedAnniversary.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between px-1 text-[11px] tracking-[0.18em] text-[#b79097]">
                <span>have a nice day!</span>
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      )}
     </div>
  )
}
