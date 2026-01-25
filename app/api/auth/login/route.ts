import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { NextResponse } from "next/server"
import { pool } from "@/lib/server/db"
import {
  buildSessionCookieOptions,
  fail,
  ok,
  parseJson,
  SESSION_COOKIE_MAX_AGE,
} from "@/lib/server/helpers"

type LoginPayload = {
  account?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await parseJson<LoginPayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const account = body.account?.trim()
  const password = body.password

  if (!account || !password) return fail(400, "Account and password required")

  const { rows } = await pool.query(
    "SELECT id, email, username, avatar_url, password_hash FROM users WHERE email = $1 OR username = $1 LIMIT 1",
    [account]
  )

  const user = rows[0]
  if (!user) return fail(401, "User not found")

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return fail(401, "Invalid password")

  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE * 1000)
  await pool.query(
    "INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [sessionId, user.id, expiresAt]
  )

  const response = ok({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
    },
    session_id: sessionId,
    expires_at: expiresAt,
  }) as NextResponse

  response.cookies.set("session_id", sessionId, buildSessionCookieOptions())
  return response
}
