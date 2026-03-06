import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { getSessionUserId, ok } from "@/lib/server/helpers"

export async function GET(request: NextRequest) {
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)

  if (!sessionUserId) {
    return ok({ items: [], hasUnread: false })
  }

  const moodRecords = await prisma.mood_records.findMany({
    where: {
      is_deleted: false,
      liked_by_user_id: { not: null },
      user_id: sessionUserId,
    },
    orderBy: { liked_at: "desc" },
    take: 50,
  })

  const coupleSpaces = await prisma.couple_spaces.findMany({
    where: {
      is_deleted: false,
      status: "accepted",
      OR: [{ user_id_1: sessionUserId }, { user_id_2: sessionUserId }],
    },
    select: { id: true },
  })

  const spaceIds = coupleSpaces.map((s) => s.id)

  let coupleLikerIds: string[] = []
  let coupleMoodRecords: Array<{
    id: string
    mood_type: string
    note: string | null
    liked_by_user_id: string | null
    liked_at: Date | null
  }> = []

  if (spaceIds.length > 0) {
    coupleMoodRecords = await prisma.couple_mood_records.findMany({
      where: {
        is_deleted: false,
        liked_by_user_id: { not: null },
        created_by_user_id: sessionUserId,
        space_id: { in: spaceIds },
      },
      orderBy: { liked_at: "desc" },
      take: 50,
      select: {
        id: true,
        mood_type: true,
        note: true,
        liked_by_user_id: true,
        liked_at: true,
      },
    })

    coupleLikerIds = coupleMoodRecords
      .filter((r) => r.liked_by_user_id)
      .map((r) => r.liked_by_user_id as string)
  }

  const personalLikerIds = moodRecords
    .filter((r) => r.liked_by_user_id)
    .map((r) => r.liked_by_user_id as string)

  const allLikerIds = [...personalLikerIds, ...coupleLikerIds]
  const allLikers = await prisma.users.findMany({
    where: { id: { in: allLikerIds } },
    select: { id: true, username: true },
  })

  const allLikerMap = new Map(allLikers.map((u) => [u.id, u]))

  const personalLikes = moodRecords.map((r) => {
    const liker = r.liked_by_user_id ? allLikerMap.get(r.liked_by_user_id) : null
    return {
      id: r.id,
      type: "personal",
      likerName: liker?.username || "Someone",
      moodNote: r.note ? decrypt(r.note) : "",
      moodType: r.mood_type,
      likedAt: r.liked_at,
    }
  })

  const coupleLikes = coupleMoodRecords.map((r) => {
    const liker = r.liked_by_user_id ? allLikerMap.get(r.liked_by_user_id) : null
    return {
      id: r.id,
      type: "couple",
      likerName: liker?.username || "Someone",
      moodNote: r.note ? decrypt(r.note) : "",
      moodType: r.mood_type,
      likedAt: r.liked_at,
    }
  })

  const allLikes = [...personalLikes, ...coupleLikes].sort((a, b) => {
    if (!a.likedAt) return 1
    if (!b.likedAt) return -1
    return new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime()
  })

  const items = allLikes.map((like) => ({
    id: like.id,
    liker_name: like.likerName,
    mood_note: like.moodNote,
    mood_type: like.moodType,
    liked_at: like.likedAt?.toISOString() || null,
  }))

  return ok({
    items,
    hasUnread: false,
  })
}
