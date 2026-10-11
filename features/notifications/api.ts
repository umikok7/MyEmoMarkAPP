import { apiGet } from "@/lib/api-client"

export type LikeNotification = {
  id: string
  likerName: string
  moodNote: string
  moodType: string
  likedAt: string
}

type ServerLikeItem = {
  id: string
  liker_name: string
  mood_note: string
  mood_type: string
  liked_at: string
}

const UNREAD_STORAGE_KEY = "lastOpenedNotificationsAt"

export const fetchLikeNotifications = async (): Promise<{
  notifications: LikeNotification[]
  hasUnread: boolean
}> => {
  const data = await apiGet<{ items: ServerLikeItem[] }>("/notifications/likes")
  const items = data.items ?? []

  const notifications: LikeNotification[] = items.map((item) => ({
    id: item.id,
    likerName: item.liker_name,
    moodNote: item.mood_note || "",
    moodType: item.mood_type,
    likedAt: item.liked_at,
  }))

  const lastOpenedAt = typeof window === "undefined"
    ? 0
    : window.localStorage.getItem(UNREAD_STORAGE_KEY)
  const lastOpenedTime = lastOpenedAt ? new Date(lastOpenedAt).getTime() : 0
  const hasUnread = items.some(
    (item) => item.liked_at && new Date(item.liked_at).getTime() > lastOpenedTime
  )

  return { notifications, hasUnread }
}

export const markNotificationsOpened = () => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UNREAD_STORAGE_KEY, new Date().toISOString())
  }
}
