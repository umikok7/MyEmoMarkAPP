import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client"
import { toDateKey } from "@/lib/date"
import type { ServerTaskItem, TaskItem } from "./types"

const mapServerTask = (item: ServerTaskItem): TaskItem => ({
  id: item.id,
  title: item.title,
  done: item.is_done,
  is_pinned: item.is_pinned,
})

export const fetchTasksForDate = async (date: Date, userId?: string): Promise<TaskItem[]> => {
  const data = await apiGet<{ items: ServerTaskItem[] }>("/tasks", {
    date: toDateKey(date),
    user_id: userId,
  })
  return (data.items ?? []).map(mapServerTask)
}

export const fetchPinnedTasks = async (date: Date): Promise<TaskItem[]> => {
  const data = await apiGet<{ items: ServerTaskItem[] }>("/tasks", { include_pinned: true })
  const dateKey = toDateKey(date)
  return (data.items ?? [])
    .map((item) => {
      const completedBeforeDate = item.completed_at
        ? new Date(item.completed_at).toISOString().split("T")[0] <= dateKey
        : false
      return { id: item.id, title: item.title, done: completedBeforeDate, is_pinned: true }
    })
}

export const createTask = (title: string, taskDate: Date, userId: string) =>
  apiPost<{ record: ServerTaskItem }>("/tasks", {
    user_id: userId,
    title,
    task_date: toDateKey(taskDate),
  })

export const updateTask = (taskId: string, patch: { is_done?: boolean; is_pinned?: boolean }) =>
  apiPatch<{ record: ServerTaskItem }>(`/tasks/${taskId}`, patch)

export const deleteTask = (taskId: string) => apiDelete(`/tasks/${taskId}`)
