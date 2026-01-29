import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

  const exists = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  })

  if (exists) {
    return fail(409, "Email already exists")
  }

  const hash = await bcrypt.hash(password, 10)
  const userId = uuidv4()

  const user = await prisma.users.create({
    data: {
      id: userId,
      email,
      username: username || null,
      password_hash: hash,
    },
    select: { id: true, email: true, username: true, avatar_url: true },
  })

  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE * 1000)

  await prisma.user_sessions.create({
    data: {
      id: sessionId,
      user_id: user.id,
      expires_at: expiresAt,
    },
  })

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
