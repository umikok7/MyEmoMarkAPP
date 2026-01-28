import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { pool } from "@/lib/server/db"
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

  const { rows } = await pool.query(
    `SELECT id, user_id, title, task_date, is_done, created_at
     FROM daily_tasks
     WHERE is_deleted = false AND user_id = $1 AND task_date = $2
     ORDER BY created_at ASC`,
    [userId, dateParam]
  )

  const items = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    task_date: row.task_date,
    is_done: row.is_done,
    created_at: row.created_at,
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

  const recordId = uuidv4()
  const { rows } = await pool.query(
    `INSERT INTO daily_tasks (id, user_id, title, task_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, title, task_date, is_done, created_at`,
    [recordId, userId, title, dateParam]
  )

  return ok({
    record: {
      id: rows[0].id,
      user_id: rows[0].user_id,
      title: rows[0].title,
      task_date: rows[0].task_date,
      is_done: rows[0].is_done,
      created_at: rows[0].created_at,
    },
  })
}
