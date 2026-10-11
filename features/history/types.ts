export type PinnedCollection = "lesson" | "education" | "alert" | null

export type JournalEntry = {
  id: string
  date: string
  time: string
  mood: string
  intensity: number
  note: string
  tags: string[]
  author_id?: string
  is_mine?: boolean
  liked_by_user_id?: string | null
  pinned_collection?: PinnedCollection
}
