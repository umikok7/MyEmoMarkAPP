import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client"
import type { MoodType, ServerMoodRecord } from "@/features/moods"
import type { PinnedCollection } from "./types"

export type HistorySpace = "personal" | "couple"

export type FetchMoodHistoryInput = {
  space: HistorySpace
  coupleSpaceId: string | null
  userId: string | null
  limit: number
  offset: number
}

export const PAGE_LIMIT = 10

export const fetchMoodHistory = async ({
  space,
  coupleSpaceId,
  userId,
  limit,
  offset,
}: FetchMoodHistoryInput): Promise<ServerMoodRecord[]> => {
  if (space === "couple") {
    if (!coupleSpaceId) {return []}
    const data = await apiGet<{ items: ServerMoodRecord[] }>("/couple-moods", {
      limit,
      offset,
      space_id: coupleSpaceId,
    })
    return data.items ?? []
  }

  const data = await apiGet<{ items: ServerMoodRecord[] }>("/moods", {
    limit,
    offset,
    user_id: userId ?? undefined,
    space_id: coupleSpaceId ?? undefined,
  })
  return data.items ?? []
}

export const updateMoodRecord = (
  moodId: string,
  space: HistorySpace,
  patch: { mood_type: MoodType; intensity: number; note: string; tags: string[] }
) =>
  space === "couple"
    ? apiPut<{ record: ServerMoodRecord }>(`/couple-moods/${moodId}`, patch)
    : apiPut<{ record: ServerMoodRecord }>(`/moods/${moodId}`, patch)

export const deleteMoodRecord = (moodId: string, space: HistorySpace) =>
  space === "couple" ? apiDelete(`/couple-moods/${moodId}`) : apiDelete(`/moods/${moodId}`)

export const setMoodLike = (moodId: string, space: HistorySpace, liked: boolean) =>
  space === "couple"
    ? liked
      ? apiPost(`/couple-moods/${moodId}/like`)
      : apiDelete(`/couple-moods/${moodId}/like`)
    : liked
      ? apiPost(`/moods/${moodId}/like`)
      : apiDelete(`/moods/${moodId}/like`)

export const setMoodPinCollection = (
  moodId: string,
  collection: PinnedCollection
) =>
  apiPatch<{ record: { pinned_collection: PinnedCollection } }>(
    `/couple-moods/${moodId}/pin`,
    { collection }
  )
