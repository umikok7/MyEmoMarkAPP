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

/**
 * 验证请求用户是否有权访问目标用户的 daily_blocks
 * 只有互为情侣的账号才能访问对方的 blocks
 */
async function validateCoupleAccess(
  requestUserId: string,
  targetUserId: string
): Promise<boolean> {
  if (requestUserId === targetUserId) return true

  const coupleSpace = await prisma.couple_spaces.findFirst({
    where: {
      is_deleted: false,
      status: "accepted",
      OR: [
        { user_id_1: requestUserId, user_id_2: targetUserId },
        { user_id_1: targetUserId, user_id_2: requestUserId },
      ],
    },
  })

  return coupleSpace !== null
}

export async function POST(
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

  // 获取当前 block 的拥有者
  const existingBlock = await prisma.daily_time_blocks.findFirst({
    where: { id: blockId, is_deleted: false },
    select: { user_id: true },
  })

  if (!existingBlock) return fail(404, "Block not found")

  // 验证情侣关系
  if (sessionUserId && sessionUserId !== "guest" && sessionUserId !== existingBlock.user_id) {
    const hasAccess = await validateCoupleAccess(sessionUserId, existingBlock.user_id)
    if (!hasAccess) {
      return fail(403, "Access denied: not in couple relationship")
    }
  } else if (!sessionUserId || sessionUserId === "guest") {
    return fail(401, "Authentication required")
  }

  const record = await prisma.daily_time_blocks.update({
    where: {
      id: blockId,
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

  // 获取当前 block 的拥有者
  const existingBlock = await prisma.daily_time_blocks.findFirst({
    where: { id: blockId, is_deleted: false },
    select: { user_id: true },
  })

  if (!existingBlock) return fail(404, "Block not found")

  // 验证情侣关系
  if (sessionUserId && sessionUserId !== "guest" && sessionUserId !== existingBlock.user_id) {
    const hasAccess = await validateCoupleAccess(sessionUserId, existingBlock.user_id)
    if (!hasAccess) {
      return fail(403, "Access denied: not in couple relationship")
    }
  } else if (!sessionUserId || sessionUserId === "guest") {
    return fail(401, "Authentication required")
  }

  const record = await prisma.daily_time_blocks.update({
    where: {
      id: blockId,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
    },
    select: { id: true },
  })

  return ok({ success: true })
}
