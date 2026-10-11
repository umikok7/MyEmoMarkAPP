"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchMoodAnalytics, fetchMonthTasks, type CalendarDay, type MonthTask } from "./api"
import { useAuthStore } from "@/store/use-auth-store"

const buildMonthCalendar = (
  year: number,
  monthIndex: number,
  tasks: MonthTask[]
): CalendarDay[] => {
  const taskMap = tasks.reduce<Record<string, { total: number; completed: number }>>(
    (acc, task) => {
      const dateKey = new Date(task.task_date).toISOString().split("T")[0]
      acc[dateKey] = acc[dateKey] ?? { total: 0, completed: 0 }
      acc[dateKey].total += 1
      if (task.is_done) {
        acc[dateKey].completed += 1
      }
      return acc
    },
    {}
  )

  const firstDay = new Date(year, monthIndex, 1)
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()

  const calendar: CalendarDay[] = []
  for (let i = 0; i < firstDay.getDay(); i++) {
    calendar.push({ date: null, dateString: null, taskCount: 0, taskCompleted: 0 })
  }
  for (let day = 1; day <= totalDays; day++) {
    const dateString = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const taskData = taskMap[dateString] ?? { total: 0, completed: 0 }
    calendar.push({
      date: day,
      dateString,
      taskCount: taskData.total,
      taskCompleted: taskData.completed,
    })
  }
  return calendar
}

export const useMonthInsights = (selectedDate: Date) => {
  const userId = useAuthStore((state) => state.userId)
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1

  const analyticsQuery = useQuery({
    queryKey: ["mood-analytics", userId, year, month],
    queryFn: () => fetchMoodAnalytics(year, month),
  })

  const tasksQuery = useQuery({
    queryKey: ["tasks", "month", "insights", userId, year, month],
    queryFn: () => fetchMonthTasks(year, month, userId ?? undefined),
  })

  return {
    donutData: analyticsQuery.data?.donut_chart ?? [],
    suggestion: analyticsQuery.data?.suggestion ?? "",
    monthLabel: analyticsQuery.data?.month ?? "",
    calendar: buildMonthCalendar(year, selectedDate.getMonth(), tasksQuery.data?.tasks ?? []),
    checkins: tasksQuery.data?.tasks ?? [],
    isLoading: analyticsQuery.isLoading || tasksQuery.isLoading,
  }
}
