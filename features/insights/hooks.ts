"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchMonthTasks, type CalendarDay, type MonthTask } from "./api"
import { useAuthStore } from "@/store/use-auth-store"
import { useCoupleSpaces } from "@/features/couple"
import { useSpaceStore } from "@/features/couple/store"

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
  const coupleSpaceId = useSpaceStore((state) => state.coupleSpaceId)
  const { acceptedSpaces } = useCoupleSpaces({ enabled: Boolean(userId) && userId !== "guest" })
  const activeCoupleSpace = acceptedSpaces.find((space) => space.id === coupleSpaceId) ?? acceptedSpaces[0]
  const partnerUserId = activeCoupleSpace
    ? activeCoupleSpace.user_id_1 === userId
      ? activeCoupleSpace.user_id_2
      : activeCoupleSpace.user_id_1
    : null
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1

  const tasksQuery = useQuery({
    queryKey: ["tasks", "month", "insights", userId, activeCoupleSpace?.id ?? null, year, month],
    queryFn: () => fetchMonthTasks(year, month, activeCoupleSpace?.id),
  })

  return {
    calendar: buildMonthCalendar(year, selectedDate.getMonth(), tasksQuery.data?.tasks ?? []),
    checkins: tasksQuery.data?.tasks ?? [],
    userId,
    partnerUserId,
    coupleSpaceId: activeCoupleSpace?.id ?? null,
    isLoading: tasksQuery.isLoading,
  }
}
