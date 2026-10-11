import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client"
import { toDateKey } from "@/lib/date"
import type { ServerTaskItem, TaskItem, TaskSource } from "./types"

const mapServerTask = (item: ServerTaskItem): TaskItem => ({
  id: item.id,
  title: item.title,
  done: item.is_done,
  is_pinned: item.is_pinned,
})

export const fetchTasksForDate = async (date: Date, userId?: string, source: TaskSource = "home"): Promise<TaskItem[]> => {
  const data = await apiGet<{ items: ServerTaskItem[] }>("/tasks", {
    date: toDateKey(date),
    user_id: userId,
    source,
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

export const createTask = (title: string, taskDate: Date, userId: string, source: TaskSource = "home") =>
  apiPost<{ record: ServerTaskItem }>("/tasks", {
    user_id: userId,
    title,
    task_date: toDateKey(taskDate),
    task_source: source,
  })

export const updateTask = (taskId: string, patch: { is_done?: boolean; is_pinned?: boolean }, source: TaskSource = "home") =>
  apiPatch<{ record: ServerTaskItem }>(`/tasks/${taskId}`, { ...patch, task_source: source })

export const deleteTask = (taskId: string, source: TaskSource = "home") => apiDelete(`/tasks/${taskId}`, { source })
