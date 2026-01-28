"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import ReactECharts from 'echarts-for-react';
import { Button } from "@/components/ui/button"
import { buildApiUrl } from "@/lib/api"

type CalendarDay = {
  date: number | null
  dateString: string | null
  mood: string | null
  color: string | null
  intensity: number | null
}

type DonutData = {
  name: string
  value: number
  color: string
}

export default function InsightsPage() {
  const [loading, setLoading] = React.useState(true)
  const [calendar, setCalendar] = React.useState<CalendarDay[]>([])
  const [donutData, setDonutData] = React.useState<DonutData[]>([])
  const [suggestion, setSuggestion] = React.useState("")
  const [monthLabel, setMonthLabel] = React.useState("")
  
  // Month navigation state
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  React.useEffect(() => {
    const fetchInsights = async () => {
      try {
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth() + 1 // JavaScript months are 0-indexed
        
        const res = await fetch(buildApiUrl("/moods/analytics", { year, month }), {
          credentials: "include",
        })
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        
        const data = json.data || {}
        setCalendar(data.calendar || [])
        setDonutData(data.donut_chart || [])
        setSuggestion(data.suggestion || "")
        setMonthLabel(data.month || "")

      } catch (err) {
         console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [selectedDate])
  
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
  
  // Donut chart configuration
  const donutOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#f0ebe6',
      borderWidth: 1,
      textStyle: {
        color: '#5c5c5c',
        fontSize: 12
      }
    },
    legend: {
      show: false
    },
    series: [
      {
        name: 'Moods',
        type: 'pie',
        radius: ['55%', '85%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fffdfa',
          borderWidth: 3
        },
        label: {
          show: false
        },
        emphasis: {
          scale: false,
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#5c5c5c'
          }
        },
        labelLine: {
          show: false
        },
        data: donutData
      }
    ]
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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
                  {calendar.map((day, idx) => (
                    <div
                      key={idx}
                      className="aspect-square flex items-center justify-center relative"
                    >
                      {day.date ? (
                        <div className="w-full h-full flex items-center justify-center rounded-lg relative">
                          {/* Background color for mood */}
                          {day.color && (
                            <div 
                              className="absolute inset-0 rounded-lg opacity-40"
                              style={{ backgroundColor: day.color }}
                            />
                          )}
                          {/* Date number */}
                          <span className={`relative z-10 text-xs ${
                            day.mood 
                              ? 'text-foreground/80 font-medium' 
                              : 'text-muted-foreground/30 font-light'
                          }`}>
                            {day.date}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-transparent">.</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
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
    </div>
  )
}
