import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { fail, getSessionUserId, ok } from "@/lib/server/helpers"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: moodId } = await params
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)

  if (!sessionUserId) {
    return fail(401, "Authentication required")
  }

  const mood = await prisma.mood_records.findFirst({
    where: {
      id: moodId,
      is_deleted: false,
    },
  })

  if (!mood) {
    return fail(404, "Mood record not found")
  }

  if (mood.user_id === sessionUserId) {
    return fail(400, "Cannot like your own mood")
  }

  const updated = await prisma.mood_records.update({
    where: { id: moodId },
    data: { liked_by_user_id: sessionUserId },
  })

  return ok({
    liked_by_user_id: updated.liked_by_user_id,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: moodId } = await params
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)

  if (!sessionUserId) {
    return fail(401, "Authentication required")
  }

  const mood = await prisma.mood_records.findFirst({
    where: {
      id: moodId,
      is_deleted: false,
      liked_by_user_id: sessionUserId,
    },
  })

  if (!mood) {
    return fail(404, "Like not found or cannot unlike")
  }

  await prisma.mood_records.update({
    where: { id: moodId },
    data: { liked_by_user_id: null },
  })

  return ok({ liked_by_user_id: null })
}
