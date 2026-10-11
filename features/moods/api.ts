import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client"
import type { MoodType } from "./constants"

export type SaveMoodInput = {
  moodType: MoodType
  note: string
  space: "personal" | "couple"
  coupleSpaceId?: string | null
  userId?: string | null
}

export type ServerMoodRecord = {
  id: string
  user_id?: string
  created_by_user_id?: string
  mood_type: MoodType
  intensity: number
  note?: string
  tags?: string[]
  created_at: string
  liked_by_user_id?: string | null
  pinned_collection?: "lesson" | "education" | "alert" | null
}

export const saveMood = ({ moodType, note, space, coupleSpaceId, userId }: SaveMoodInput) => {
  if (space === "couple" && coupleSpaceId) {
    return apiPost("/couple-moods", {
      space_id: coupleSpaceId,
      mood_type: moodType,
      intensity: 5,
      note,
      tags: [],
    })
  }
  return apiPost("/moods", {
    user_id: userId ?? undefined,
    mood_type: moodType,
    intensity: 5,
    note,
    tags: [],
  })
}

export const fetchMoodAnalytics = (year: number, month: number) =>
  apiGet<{
    donut_chart: Array<{ name: string; value: number; color: string }>
    suggestion: string
    month: string
  }>("/moods/analytics", { year, month })

export const likeMood = (moodId: string, space: "personal" | "couple") =>
  space === "couple"
    ? apiPost(`/couple-moods/${moodId}/like`)
    : apiPost(`/moods/${moodId}/like`)

export const unlikeMood = (moodId: string, space: "personal" | "couple") =>
  space === "couple"
    ? apiDelete(`/couple-moods/${moodId}/like`)
    : apiDelete(`/moods/${moodId}/like`)

export const updateMood = (
  moodId: string,
  space: "personal" | "couple",
  patch: { mood_type: MoodType; intensity: number; note: string; tags: string[] }
) =>
  space === "couple"
    ? apiPatch<{ record: ServerMoodRecord }>(`/couple-moods/${moodId}`, patch)
    : apiPatch<{ record: ServerMoodRecord }>(`/moods/${moodId}`, patch)

export const deleteMood = (moodId: string, space: "personal" | "couple") =>
  space === "couple"
    ? apiDelete(`/couple-moods/${moodId}`)
    : apiDelete(`/moods/${moodId}`)

export const pinMoodToCollection = (
  moodId: string,
  collection: "lesson" | "education" | "alert" | null
) =>
  apiPatch<{ record: { pinned_collection: "lesson" | "education" | "alert" | null } }>(
    `/couple-moods/${moodId}/pin`,
    { collection }
  )
