import { NextRequest } from "next/server"
import { pool } from "@/lib/server/db"
import { fail, getSessionUserId, ok, parseJson, resolveUserId } from "@/lib/server/helpers"

type TaskUpdatePayload = {
  is_done?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const taskId = resolvedParams.id
  if (!taskId) return fail(400, "Task ID is required")

  const body = await parseJson<TaskUpdatePayload>(request)
  if (!body || typeof body.is_done !== "boolean") return fail(400, "is_done is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  const { rows } = await pool.query(
    `UPDATE daily_tasks
     SET is_done = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 AND is_deleted = false
     RETURNING id, user_id, title, task_date, is_done, created_at`,
    [body.is_done, taskId, userId]
  )

  if (!rows[0]) return fail(404, "Task not found")

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
