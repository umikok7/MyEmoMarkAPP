"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createDayBlock, deleteDayBlock, fetchDayBlocks, updateDayBlock } from "./api"
import { hasTimeConflict } from "./utils"
import type { DailyBlock, TimeRange } from "./types"

const sortByStart = (blocks: DailyBlock[]) =>
  [...blocks].sort((a, b) => a.start_minute - b.start_minute)

export const useDayBlocks = (date: Date, userId: string | null, partnerId: string | null) => {
  const myQuery = useQuery({
    queryKey: ["daily-blocks", userId, date.toDateString()],
    queryFn: () => {
      if (!userId) {
        throw new Error("userId is required to fetch day blocks")
      }
      return fetchDayBlocks(date, userId)
    },
    enabled: Boolean(userId),
  })

  const partnerQuery = useQuery({
    queryKey: ["daily-blocks", partnerId, date.toDateString()],
    queryFn: () => {
      if (!partnerId) {
        throw new Error("partnerId is required to fetch partner day blocks")
      }
      return fetchDayBlocks(date, partnerId)
    },
    enabled: Boolean(partnerId),
  })

  return {
    blocks: myQuery.data ?? [],
    partnerBlocks: partnerQuery.data ?? [],
    isLoading: myQuery.isLoading || partnerQuery.isLoading,
  }
}

export const useDayBlockMutations = (
  date: Date,
  userId: string | null,
  currentBlocks: DailyBlock[]
) => {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["daily-blocks", userId] })
  }

  const saveBlock = useMutation({
    mutationFn: (draft: { range: TimeRange; title: string; note: string }) => {
      if (!userId) {throw new Error("Not signed in")}
      if (hasTimeConflict(currentBlocks, draft.range)) {
        throw new Error("TIME_CONFLICT")
      }
      return createDayBlock({
        userId,
        date,
        title: draft.title,
        note: draft.note,
        startMinute: draft.range.start,
        endMinute: draft.range.end,
      })
    },
    onSuccess: (data) => {
      toast("已保存", { description: data.record?.title, duration: 1800 })
      invalidate()
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "TIME_CONFLICT") {
        toast("时间冲突", { description: "请选择空闲时间段", duration: 2200 })
        return
      }
      toast("保存失败", { description: "请重试", duration: 2000 })
    },
  })

  const editBlock = useMutation({
    mutationFn: ({ blockId, draft }: { blockId: string; draft: { range: TimeRange; title: string; note: string } }) =>
      updateDayBlock(blockId, {
        title: draft.title,
        note: draft.note,
        startMinute: draft.range.start,
        endMinute: draft.range.end,
      }),
    onSuccess: (data) => {
      toast("已更新", { description: data.record?.title, duration: 1800 })
      invalidate()
    },
    onError: () => {
      toast("更新失败", { description: "请重试", duration: 2000 })
    },
  })

  const removeBlock = useMutation({
    mutationFn: (blockId: string) => deleteDayBlock(blockId),
    onSuccess: () => {
      toast("已删除", { duration: 1800 })
      invalidate()
    },
    onError: () => {
      toast("删除失败", { description: "请重试", duration: 2000 })
    },
  })

  return { saveBlock, editBlock, removeBlock, sortByStart }
}
