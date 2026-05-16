import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { decrypt, encrypt } from "@/lib/encryption"
import { fail, getSessionUserId, ok, parseJson, resolveUserId } from "@/lib/server/helpers"

type DailyBlockUpdatePayload = {
  title?: string
  note?: string
  start_minute?: number
  end_minute?: number
  color_tag?: string
}

const isValidMinute = (value: number) => Number.isInteger(value) && value >= 0 && value <= 1440

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const blockId = resolvedParams.id
  if (!blockId) return fail(400, "Block ID is required")

  const body = await parseJson<DailyBlockUpdatePayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const hasTimeUpdate =
    typeof body.start_minute === "number" || typeof body.end_minute === "number"

  if (hasTimeUpdate) {
    if (typeof body.start_minute !== "number" || typeof body.end_minute !== "number") {
      return fail(400, "start_minute and end_minute are required")
    }
    if (!isValidMinute(body.start_minute) || !isValidMinute(body.end_minute)) {
      return fail(400, "Invalid time range")
    }
    if (body.end_minute <= body.start_minute) {
      return fail(400, "end_minute must be greater than start_minute")
    }
  }

  const hasUpdates =
    typeof body.title === "string" ||
    typeof body.note === "string" ||
    typeof body.color_tag === "string" ||
    hasTimeUpdate

  if (!hasUpdates) return fail(400, "No updates provided")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  const record = await prisma.daily_time_blocks.update({
    where: {
      id: blockId,
      user_id: userId,
      is_deleted: false,
    },
    data: {
      title: typeof body.title === "string" ? encrypt(body.title.trim()) : undefined,
      note: typeof body.note === "string" ? encrypt(body.note.trim()) : undefined,
      start_minute: hasTimeUpdate ? body.start_minute : undefined,
      end_minute: hasTimeUpdate ? body.end_minute : undefined,
      color_tag: typeof body.color_tag === "string" ? body.color_tag.trim() : undefined,
    },
    select: {
      id: true,
      user_id: true,
      title: true,
      note: true,
      task_date: true,
      start_minute: true,
      end_minute: true,
      color_tag: true,
      created_at: true,
      updated_at: true,
    },
  })

  if (!record) return fail(404, "Block not found")

  return ok({
    record: {
      ...record,
      title: decrypt(record.title),
      note: record.note ? decrypt(record.note) : "",
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const blockId = resolvedParams.id
  if (!blockId) return fail(400, "Block ID is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  const record = await prisma.daily_time_blocks.update({
    where: {
      id: blockId,
      user_id: userId,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
    },
    select: { id: true },
  })

  if (!record) return fail(404, "Block not found")

  return ok({ success: true })
}
