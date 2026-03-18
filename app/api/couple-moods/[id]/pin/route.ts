import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { fail, getSessionUserId, ok } from "@/lib/server/helpers"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: moodId } = await params
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)

  if (!sessionUserId) {
    return fail(401, "Authentication required")
  }

  const mood = await prisma.couple_mood_records.findFirst({
    where: {
      id: moodId,
      is_deleted: false,
    },
  })

  if (!mood) {
    return fail(404, "Mood record not found")
  }

  if (mood.created_by_user_id !== sessionUserId) {
    return fail(403, "Only the creator can pin this mood")
  }

  const newPinnedState = !mood.is_pinned

  const updated = await prisma.couple_mood_records.update({
    where: { id: moodId },
    data: { is_pinned: newPinnedState },
  })

  return ok({
    is_pinned: updated.is_pinned,
  })
}
