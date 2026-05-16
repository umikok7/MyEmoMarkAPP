import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import { fail, getSessionUserId, ok, parseJson, resolveUserId } from "@/lib/server/helpers"

type DailyBlockPayload = {
  user_id?: string
  title?: string
  note?: string
  task_date?: string
  start_minute?: number
  end_minute?: number
  color_tag?: string
}

type DailyBlockSelect = {
  id: true
  user_id: true
  title: true
  note: true
  task_date: true
  start_minute: true
  end_minute: true
  color_tag: true
  created_at: true
  updated_at: true
}

const parseTaskDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return value.slice(0, 10)
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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(query.get("user_id"), sessionUserId)
  const dateParam = parseTaskDate(query.get("date"))

  if (!dateParam) return fail(400, "date is required")

  if (userId === "guest") {
    return ok({ items: [] })
  }

  const hasAccess = await validateCoupleAccess(
    sessionUserId && sessionUserId !== "guest" ? sessionUserId : userId,
    userId
  )
  if (!hasAccess) {
    return fail(403, "Access denied: not in couple relationship")
  }

  const blocks = await prisma.daily_time_blocks.findMany({
    where: {
      is_deleted: false,
      user_id: userId,
      task_date: new Date(dateParam),
    },
    orderBy: { start_minute: "asc" },
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

  const items = blocks.map((block) => ({
    ...block,
    title: decrypt(block.title),
    note: block.note ? decrypt(block.note) : "",
  }))

  return ok({ items })
}

export async function POST(request: NextRequest) {
  const body = await parseJson<DailyBlockPayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const title = body.title?.trim()
  if (!title) return fail(400, "title is required")

  const dateParam = parseTaskDate(body.task_date)
  if (!dateParam) return fail(400, "task_date is required")

  if (typeof body.start_minute !== "number" || typeof body.end_minute !== "number") {
    return fail(400, "start_minute and end_minute are required")
  }

  if (!isValidMinute(body.start_minute) || !isValidMinute(body.end_minute)) {
    return fail(400, "Invalid time range")
  }

  if (body.end_minute <= body.start_minute) {
    return fail(400, "end_minute must be greater than start_minute")
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(body.user_id || null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 验证情侣关系（POST 不允许代持，只能创建自己的或情侣的 blocks）
  if (sessionUserId && sessionUserId !== "guest" && sessionUserId !== userId) {
    const hasAccess = await validateCoupleAccess(sessionUserId, userId)
    if (!hasAccess) {
      return fail(403, "Access denied: not in couple relationship")
    }
  } else if (!sessionUserId || sessionUserId === "guest") {
    return fail(401, "Authentication required")
  }

  const record = await prisma.daily_time_blocks.create({
    data: {
      id: uuidv4(),
      user_id: userId,
      title: encrypt(title),
      note: body.note?.trim() ? encrypt(body.note.trim()) : null,
      task_date: new Date(dateParam),
      start_minute: body.start_minute,
      end_minute: body.end_minute,
      color_tag: body.color_tag?.trim() || null,
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
