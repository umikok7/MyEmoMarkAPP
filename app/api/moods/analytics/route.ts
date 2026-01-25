import { NextRequest } from "next/server"
import { pool } from "@/lib/server/db"
import {
  buildAnalytics,
  getSessionUserId,
  ok,
  resolveUserId,
} from "@/lib/server/helpers"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const days = Math.max(1, Number(query.get("days")) || 7)
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(query.get("user_id"), sessionUserId)

  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setDate(now.getDate() + 1)
  end.setHours(0, 0, 0, 0)

  const { rows } = await pool.query(
    `SELECT mood_type, intensity, created_at
     FROM mood_records
     WHERE is_deleted = false AND user_id = $1
       AND created_at >= $2 AND created_at < $3
     ORDER BY created_at ASC`,
    [userId, start, end]
  )

  const analytics = buildAnalytics(rows, days)
  return ok(analytics)
}
