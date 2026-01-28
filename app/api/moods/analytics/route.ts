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
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(query.get("user_id"), sessionUserId)

  // Get year and month from query params, or use current date
  const now = new Date()
  const year = Number(query.get("year")) || now.getFullYear()
  const month = Number(query.get("month")) || (now.getMonth() + 1) // 1-12
  
  // Calculate date range for the specified month
  const start = new Date(year, month - 1, 1) // First day of month
  start.setHours(0, 0, 0, 0)
  const end = new Date(year, month, 1) // First day of next month
  end.setHours(0, 0, 0, 0)

  const { rows } = await pool.query(
    `SELECT mood_type, intensity, created_at
     FROM mood_records
     WHERE is_deleted = false AND user_id = $1
       AND created_at >= $2 AND created_at < $3
     ORDER BY created_at ASC`,
    [userId, start, end]
  )

  const analytics = buildAnalytics(rows, year, month)
  return ok(analytics)
}
