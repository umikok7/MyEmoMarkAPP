import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import {
  fail,
  getSessionUserId,
  ok,
  parseJson,
  resolveUserId,
} from "@/lib/server/helpers"

type TaskPayload = {
  user_id?: string
  title?: string
  task_date?: string
}

const parseTaskDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return value.slice(0, 10)
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

  const tasks = await prisma.daily_tasks.findMany({
    where: {
      is_deleted: false,
      user_id: userId,
      task_date: new Date(dateParam),
    },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      user_id: true,
      title: true,
      task_date: true,
      is_done: true,
      created_at: true,
    },
  })

  const items = tasks.map((task) => ({
    ...task,
    title: decrypt(task.title),
  }))

  return ok({ items })
}

export async function POST(request: NextRequest) {
  const body = await parseJson<TaskPayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const title = body.title?.trim()
  if (!title) return fail(400, "title is required")

  const dateParam = parseTaskDate(body.task_date)
  if (!dateParam) return fail(400, "task_date is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(body.user_id || null, sessionUserId)

  const record = await prisma.daily_tasks.create({
    data: {
      id: uuidv4(),
      user_id: userId,
      title: encrypt(title),
      task_date: new Date(dateParam),
    },
    select: {
      id: true,
      user_id: true,
      title: true,
      task_date: true,
      is_done: true,
      created_at: true,
    },
  })

  return ok({
    record: {
      ...record,
      title: decrypt(record.title),
    },
  })
}
