"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useQueryClient } from "@tanstack/react-query"
import { NewTaskSheet, useTaskMutations } from "@/features/tasks"
import { useAuthStore } from "@/store/use-auth-store"
import type { AnniversaryItem } from "./AnniversaryModal"

interface DayCheckinModalProps {
  date: Date
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

export function DayCheckinModal({ date, anniversary, onClose, onOpenAnniversary }: DayCheckinModalProps) {
  const userId = useAuthStore((state) => state.userId)
  const queryClient = useQueryClient()
  const { addTask } = useTaskMutations(date, userId, "insights")
  const monthKey = ["tasks", "month", "insights", userId, date.getFullYear(), date.getMonth() + 1]

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <NewTaskSheet
      title="New Check-in"
      description={formatDate(date)}
      placeholder="记录一项打卡内容"
      submitLabel="添加"
      isPending={addTask.isPending}
      isDisabled={!userId}
      onClose={onClose}
      onSubmit={(title) => {
        addTask.mutate(title, {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: monthKey })
          },
        })
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
