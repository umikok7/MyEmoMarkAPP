import { apiDelete, apiGet, apiPost } from "@/lib/api-client"
import { toDateKey } from "@/lib/date"
import type { DailyBlock } from "./types"

export const fetchDayBlocks = async (date: Date, userId: string): Promise<DailyBlock[]> => {
  const data = await apiGet<{ items: DailyBlock[] }>("/daily-blocks", {
    date: toDateKey(date),
    user_id: userId,
  })
  return data.items ?? []
}

export const createDayBlock = (input: {
  userId: string
  date: Date
  title: string
  note: string
  startMinute: number
  endMinute: number
}) =>
  apiPost<{ record: DailyBlock }>("/daily-blocks", {
    user_id: input.userId,
    title: input.title,
    note: input.note || null,
    task_date: toDateKey(input.date),
    start_minute: input.startMinute,
    end_minute: input.endMinute,
  })

export const updateDayBlock = (blockId: string, input: {
  title: string
  note: string
  startMinute: number
  endMinute: number
}) =>
  apiPost<{ record: DailyBlock }>(`/daily-blocks/${blockId}`, {
    title: input.title,
    note: input.note || null,
    start_minute: input.startMinute,
    end_minute: input.endMinute,
  })

export const deleteDayBlock = (blockId: string) => apiDelete(`/daily-blocks/${blockId}`)
