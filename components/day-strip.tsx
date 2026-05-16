"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { addDays, formatWeekday, isSameDay, startOfWeek, toDateKey } from "@/lib/date"

const DATE_RANGE_DAYS = 21

type DayStripProps = {
  selectedDate: Date
  onSelect: (date: Date) => void
  className?: string
}

export function DayStrip({ selectedDate, onSelect, className }: DayStripProps) {
  const dateScrollRef = React.useRef<HTMLDivElement | null>(null)

  const dateStrip = React.useMemo(() => {
    const weekStart = startOfWeek(selectedDate)
    return Array.from({ length: DATE_RANGE_DAYS }, (_, index) => addDays(weekStart, index))
  }, [selectedDate])

  React.useEffect(() => {
    const dayKey = toDateKey(selectedDate)
    const container = dateScrollRef.current
    if (!container) return
    const target = container.querySelector<HTMLButtonElement>(`button[data-date='${dayKey}']`)
    target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [selectedDate])

  return (
    <div
      ref={dateScrollRef}
      className={cn("flex gap-4 overflow-x-auto scroll-smooth py-3 no-scrollbar", className)}
    >
      {dateStrip.map((date) => {
        const isActive = isSameDay(date, selectedDate)
        const dayKey = toDateKey(date)
        return (
          <button
            key={dayKey}
            onClick={() => onSelect(date)}
            data-date={dayKey}
            className="flex flex-col items-center min-w-[52px]"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold transition",
                isActive ? "bg-black/[0.06] text-foreground" : "text-muted-foreground/60"
              )}
            >
              {date.getDate()}
            </div>
            <span
              className={cn(
                "text-xs tracking-[0.2em] uppercase mt-1",
                isActive ? "text-foreground/80" : "text-muted-foreground/50"
              )}
            >
              {formatWeekday(date)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
