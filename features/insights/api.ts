import { apiGet } from "@/lib/api-client"

export type CalendarDay = {
  date: number | null
  dateString: string | null
  taskCount: number
  taskCompleted: number
}

export type MonthTask = {
  id: string
  owner_user_id: string
  title: string
  task_date: string | Date
  is_done: boolean
  is_pinned: boolean
}

export const fetchMonthTasks = (year: number, month: number, coupleSpaceId?: string) =>
  apiGet<{ tasks: MonthTask[] }>("/tasks/month", {
    year,
    month,
    space_id: coupleSpaceId,
    source: "insights",
  })

export const HEATMAP_LEVELS = [
  { bg: "bg-[#FAFAFA]", border: "border-[#F0F0F0]", label: "无数据" },
  { bg: "bg-[#F5F2EB]", border: "border-[#E8E4DC]", label: "1-25%" },
  { bg: "bg-[#E8DFD0]", border: "border-[#DDD5C3]", label: "26-50%" },
  { bg: "bg-[#C4B5A0]", border: "border-[#B8A68E]", label: "51-75%" },
  { bg: "bg-[#8B7355]", border: "border-[#7A6548]", label: "76-100%" },
]

export const getHeatmapLevel = (completed: number, total: number): number => {
  if (total === 0) {return 0}
  const rate = (completed / total) * 100
  if (rate <= 25) {return 1}
  if (rate <= 50) {return 2}
  if (rate <= 75) {return 3}
  return 4
}
