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

type RegisterPayload = {
  email?: string
  username?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await parseJson<RegisterPayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const email = body.email?.trim()
  const username = body.username?.trim()
  const password = body.password

  if (!email || !password) return fail(400, "Email and password required")

  const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [email])
  if (exists.rows.length) {
    return fail(409, "Email already exists")
  }

  const hash = await bcrypt.hash(password, 10)
  const userId = uuidv4()
  const { rows } = await pool.query(
    "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, username, avatar_url",
    [userId, email, username || null, hash]
  )
  const user = rows[0]

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
