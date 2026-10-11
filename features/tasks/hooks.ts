"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createTask, deleteTask, fetchPinnedTasks, fetchTasksForDate, updateTask } from "./api"
import type { TaskItem } from "./types"

const buildDayKey = (date: Date) => date.toISOString().slice(0, 10)

export const useDayTasks = (date: Date, userId: string | null) => {
  const dayKey = buildDayKey(date)

  const dayQuery = useQuery({
    queryKey: ["tasks", "day", userId, dayKey],
    queryFn: () => fetchTasksForDate(date, userId ?? undefined),
    enabled: userId !== null,
  })

  const pinnedQuery = useQuery({
    queryKey: ["tasks", "pinned", userId, dayKey],
    queryFn: () => fetchPinnedTasks(date),
    enabled: Boolean(userId) && userId !== "guest",
  })

  const tasks: TaskItem[] = dayQuery.data ?? []
  const pinnedTasks: TaskItem[] = pinnedQuery.data ?? []

  return {
    tasks,
    pinnedTasks,
    isLoading: dayQuery.isLoading || pinnedQuery.isLoading,
    isError: dayQuery.isError || pinnedQuery.isError,
    refetch: () => {
      void dayQuery.refetch()
      void pinnedQuery.refetch()
    },
  }
}

export const useTaskMutations = (date: Date, userId: string | null) => {
  const queryClient = useQueryClient()
  const dayKey = buildDayKey(date)
  const dayQueryKey = ["tasks", "day", userId, dayKey] as const
  const pinnedQueryKey = ["tasks", "pinned", userId, dayKey] as const

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: dayQueryKey })
    void queryClient.invalidateQueries({ queryKey: pinnedQueryKey })
  }

  const setDayTasks = (updater: (prev: TaskItem[]) => TaskItem[]) => {
    queryClient.setQueryData<TaskItem[]>(dayQueryKey, (prev) => (prev ? updater(prev) : prev))
  }

  const setPinnedTasks = (updater: (prev: TaskItem[]) => TaskItem[]) => {
    queryClient.setQueryData<TaskItem[]>(pinnedQueryKey, (prev) => (prev ? updater(prev) : prev))
  }

  const addTask = useMutation({
    mutationFn: (title: string) => {
      if (!userId) {throw new Error("Not signed in")}
      return createTask(title, date, userId)
    },
    onSuccess: (data) => {
      if (data.record) {
        setDayTasks((prev) => [
          ...prev,
          { id: data.record.id, title: data.record.title, done: data.record.is_done, is_pinned: data.record.is_pinned },
        ])
      }
    },
    onError: () => {
      toast("添加失败", { description: "请重试", duration: 2000 })
    },
  })

  const toggleTask = useMutation({
    mutationFn: (task: TaskItem) => updateTask(task.id, { is_done: !task.done }),
    onMutate: async (task) => {
      const nextDone = !task.done
      setDayTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: nextDone } : item)))
      setPinnedTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: nextDone } : item)))
    },
    onError: (_error, task) => {
      setDayTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: task.done } : item)))
      setPinnedTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: task.done } : item)))
      toast("更新失败", { description: "请重试", duration: 2000 })
    },
  })

  const togglePin = useMutation({
    mutationFn: (task: TaskItem) => {
      const nextPinned = !task.is_pinned
      return updateTask(task.id, { is_pinned: nextPinned }).then(() => nextPinned)
    },
    onMutate: async (task) => {
      const nextPinned = !task.is_pinned
      if (nextPinned) {
        setDayTasks((prev) => prev.filter((item) => item.id !== task.id))
        setPinnedTasks((prev) =>
          prev.some((item) => item.id === task.id) ? prev : [...prev, { ...task, is_pinned: true }]
        )
      } else {
        setPinnedTasks((prev) => prev.filter((item) => item.id !== task.id))
        setDayTasks((prev) =>
          prev.some((item) => item.id === task.id) ? prev : [...prev, { ...task, is_pinned: false }]
        )
      }
      return { previousPinned: task.is_pinned ?? false }
    },
    onSuccess: (isPinned) => {
      toast(isPinned ? "已固定" : "已取消固定", {
        description: isPinned ? "任务将持续显示在后续天数" : undefined,
        duration: 2000,
      })
    },
    onError: (_error, task, context) => {
      // 回滚乐观移动：把任务放回原来的列表
      if (context?.previousPinned) {
        setPinnedTasks((prev) =>
          prev.some((item) => item.id === task.id) ? prev : [...prev, { ...task, is_pinned: true }]
        )
        setDayTasks((prev) => prev.filter((item) => item.id !== task.id))
      } else {
        setDayTasks((prev) =>
          prev.some((item) => item.id === task.id) ? prev : [...prev, { ...task, is_pinned: false }]
        )
        setPinnedTasks((prev) => prev.filter((item) => item.id !== task.id))
      }
      toast("操作失败", { description: "请重试", duration: 2000 })
    },
  })

  const removeTask = useMutation({
    mutationFn: (task: TaskItem) => deleteTask(task.id),
    onMutate: async (task) => {
      setDayTasks((prev) => prev.filter((item) => item.id !== task.id))
      setPinnedTasks((prev) => prev.filter((item) => item.id !== task.id))
      toast("已删除", { description: task.title, duration: 2000 })
    },
    onError: (_error, task) => {
      if (task.is_pinned) {
        setPinnedTasks((prev) => [...prev, task])
      } else {
        setDayTasks((prev) => [...prev, task])
      }
      toast("删除失败", { description: "请重试", duration: 2000 })
    },
  })

  return { addTask, toggleTask, togglePin, removeTask, invalidate }
}
