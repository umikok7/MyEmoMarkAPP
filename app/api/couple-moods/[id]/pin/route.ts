import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { fail, getSessionUserId, ok, parseJson } from "@/lib/server/helpers"

type PinBody = {
  collection?: "lesson" | "education" | "alert" | null
}

const VALID_COLLECTIONS = new Set(["lesson", "education", "alert", null])

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

  const body = await parseJson<PinBody>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const { collection } = body

  if (!VALID_COLLECTIONS.has(collection ?? null)) {
    return fail(400, "collection must be 'lesson', 'education', or null")
  }

  const updated = await prisma.couple_mood_records.update({
    where: { id: moodId },
    data: { pinned_collection: collection ?? null },
  })

  return ok({
    pinned_collection: updated.pinned_collection,
  })
}