"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { NewTaskSheet } from "@/features/tasks"
import { createTask } from "@/features/tasks/api"
import { useAuthStore } from "@/store/use-auth-store"
import { toDateKey } from "@/lib/date"
import type { MonthTask } from "../api"
import type { AnniversaryItem } from "./AnniversaryModal"

interface DayCheckinModalProps {
  date: Date
  coupleSpaceId: string | null
  anniversary?: AnniversaryItem
  onClose: () => void
  onOpenAnniversary: (anniversary: AnniversaryItem) => void
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date)

export function DayCheckinModal({ date, coupleSpaceId, anniversary, onClose, onOpenAnniversary }: DayCheckinModalProps) {
  const userId = useAuthStore((state) => state.userId)
  const queryClient = useQueryClient()
  const monthKey = ["tasks", "month", "insights", userId, coupleSpaceId, date.getFullYear(), date.getMonth() + 1]
  const addTask = useMutation({
    mutationFn: (title: string) => {
      if (!userId) throw new Error("Not signed in")
      return createTask(title, date, userId, "insights")
    },
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: monthKey })
      const optimisticId = `optimistic-${Date.now()}`
      const optimisticTask: MonthTask = {
        id: optimisticId,
        owner_user_id: userId ?? "",
        title,
        task_date: toDateKey(date),
        is_done: false,
        is_pinned: false,
      }
      queryClient.setQueryData<{ tasks: MonthTask[] }>(monthKey, (previous) => ({
        tasks: [...(previous?.tasks ?? []), optimisticTask],
      }))
      return { optimisticId }
    },
    onError: (_error, _title, context) => {
      if (context) {
        queryClient.setQueryData<{ tasks: MonthTask[] }>(monthKey, (previous) => previous
          ? { tasks: previous.tasks.filter((task) => task.id !== context.optimisticId) }
          : previous)
      }
      toast("添加失败", { description: "请重试", duration: 2000 })
    },
    onSuccess: (data, _title, context) => {
      if (context && data.record) {
        queryClient.setQueryData<{ tasks: MonthTask[] }>(monthKey, (previous) => previous
          ? {
              tasks: previous.tasks.map((task) => task.id === context.optimisticId
                ? {
                    ...task,
                    id: data.record.id,
                    owner_user_id: userId ?? "",
                    title: data.record.title,
                    is_done: data.record.is_done,
                    is_pinned: Boolean(data.record.is_pinned),
                  }
                : task),
            }
          : previous)
      }
      void queryClient.invalidateQueries({ queryKey: monthKey })
    },
  })

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <NewTaskSheet
      title="打卡事项"
      description={formatDate(date)}
      placeholder="记录一项打卡内容"
      submitLabel="添加"
      isPending={addTask.isPending}
      isDisabled={!userId}
      onClose={onClose}
      onSubmit={(title) => {
        addTask.mutate(title)
      }}
    >
      {anniversary && (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground underline decoration-stone-300 underline-offset-2"
          onClick={() => { onClose(); onOpenAnniversary(anniversary) }}
        >
          查看纪念日：{anniversary.title}
        </button>
      )}
    </NewTaskSheet>,
    document.body
  )
}
