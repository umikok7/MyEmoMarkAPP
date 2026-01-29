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

  const user = await prisma.users.findFirst({
    where: {
      OR: [{ email: account }, { username: account }],
    },
    select: { id: true, email: true, username: true, avatar_url: true, password_hash: true },
  })

  console.log("Login attempt for:", account)
  console.log("User found:", user ? "yes" : "no")
  console.log("Password input:", password)
  console.log("Hash from DB:", user?.password_hash ? "exists" : "missing")

  if (!user) return fail(401, "User not found")

  const match = await bcrypt.compare(password, user.password_hash)
  console.log("Bcrypt match:", match)

  if (!match) return fail(401, "Invalid password")

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
