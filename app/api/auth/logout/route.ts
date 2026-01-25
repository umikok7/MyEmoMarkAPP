import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/server/db"
import { buildSessionCookieOptions, ok } from "@/lib/server/helpers"

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value
  if (sessionId) {
    await pool.query("DELETE FROM user_sessions WHERE id = $1", [sessionId])
  }

  const response = ok(null) as NextResponse
  response.cookies.set("session_id", "", buildSessionCookieOptions(0))
  return response
}
