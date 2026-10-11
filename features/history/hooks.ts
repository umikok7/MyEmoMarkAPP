"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
import {
  deleteMoodRecord,
  fetchMoodHistory,
  PAGE_LIMIT,
  setMoodLike,
  setMoodPinCollection,
  updateMoodRecord,
} from "./api"
import type { HistorySpace } from "./api"
import type { JournalEntry, PinnedCollection } from "./types"
import type { MoodType, ServerMoodRecord } from "@/features/moods"

const buildHistoryKey = (
  space: HistorySpace,
  coupleSpaceId: string | null,
  userId: string | null
) => ["mood-history", space, coupleSpaceId, userId] as const

export const mapServerMoodToEntry = (
  record: ServerMoodRecord,
  space: HistorySpace,
  userId: string | null
): JournalEntry => {
  const dateObj = new Date(record.created_at)
  const isCouple = space === "couple"
  const authorId = isCouple
    ? (record as { created_by_user_id?: string }).created_by_user_id
    : record.user_id

  return {
    id: record.id,
    date: record.created_at,
    time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mood: record.mood_type,
    intensity: record.intensity,
    note: record.note ?? "",
    tags: record.tags ?? [],
    author_id: authorId,
    is_mine: authorId ? authorId === userId : undefined,
    liked_by_user_id: record.liked_by_user_id ?? null,
    pinned_collection: record.pinned_collection ?? null,
  }
}

export const groupEntriesByDate = (entries: JournalEntry[]): Array<[string, JournalEntry[]]> => {
  const groups = new Map<string, JournalEntry[]>()
  entries.forEach((entry) => {
    const dateLabel = new Date(entry.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    })
    const bucket = groups.get(dateLabel)
    if (bucket) {
      bucket.push(entry)
    } else {
      groups.set(dateLabel, [entry])
    }
  })
  return Array.from(groups.entries())
}

export const useMoodHistory = (
  space: HistorySpace,
  coupleSpaceId: string | null,
  userId: string | null,
  enabled: boolean
) =>
  useInfiniteQuery({
    queryKey: buildHistoryKey(space, coupleSpaceId, userId),
    queryFn: ({ pageParam }) =>
      fetchMoodHistory({
        space,
        coupleSpaceId,
        userId,
        limit: PAGE_LIMIT,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_LIMIT ? undefined : allPages.length * PAGE_LIMIT,
    enabled,
  })

export const useMoodRecordMutations = (
  space: HistorySpace,
  coupleSpaceId: string | null,
  userId: string | null
) => {
  const queryClient = useQueryClient()
  const historyKey = buildHistoryKey(space, coupleSpaceId, userId)

  const patchHistoryEntry = (entryId: string, patch: Partial<JournalEntry>) => {
    queryClient.setQueryData<InfiniteData<ServerMoodRecord[]>>(historyKey, (prev) => {
      if (!prev) {return prev}
      return {
        ...prev,
        pages: prev.pages.map((page) =>
          page.map((record) =>
            record.id === entryId
              ? ({ ...record, ...patch })
              : record
          )
        ),
      }
    })
  }

  const removeHistoryEntry = (entryId: string) => {
    queryClient.setQueryData<InfiniteData<ServerMoodRecord[]>>(historyKey, (prev) => {
      if (!prev) {return prev}
      return {
        ...prev,
        pages: prev.pages.map((page) => page.filter((record) => record.id !== entryId)),
      }
    })
  }

  const updateMood = useMutation({
    mutationFn: ({
      moodId,
      mood,
      intensity,
      note,
      tags,
    }: {
      moodId: string
      mood: MoodType
      intensity: number
      note: string
      tags: string[]
    }) => updateMoodRecord(moodId, space, { mood_type: mood, intensity, note, tags }),
    onSuccess: (data) => {
      const record = data.record
      if (record) {
        patchHistoryEntry(record.id, {
          note: record.note ?? "",
          intensity: record.intensity,
          tags: record.tags ?? [],
        })
      }
    },
  })

  const deleteMood = useMutation({
    mutationFn: (moodId: string) => deleteMoodRecord(moodId, space),
    onMutate: (moodId) => {
      removeHistoryEntry(moodId)
    },
  })

  const toggleLike = useMutation({
    mutationFn: ({ moodId, liked }: { moodId: string; liked: boolean }) =>
      setMoodLike(moodId, space, liked),
  })

  const pinToCollection = useMutation({
    mutationFn: ({ moodId, collection }: { moodId: string; collection: PinnedCollection }) =>
      setMoodPinCollection(moodId, collection),
    onSuccess: (_data, variables) => {
      patchHistoryEntry(variables.moodId, { pinned_collection: variables.collection })
    },
  })

  return { updateMood, deleteMood, toggleLike, pinToCollection }
}
