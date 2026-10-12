import { decrypt } from "@/lib/encryption"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const jsonResponse = (status: number, payload: unknown) =>
  NextResponse.json(payload, { status })

export const ok = (data: unknown) =>
  jsonResponse(200, { code: 0, msg: "success", errs: "", data })

export const fail = (status: number, message: string, code = 1) =>
  jsonResponse(status, { code, msg: message, errs: message, data: null })

export const parseJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export const getSessionUserId = async (sessionId: string | null | undefined) => {
  if (!sessionId) {return null}

  const session = await prisma.user_sessions.findUnique({
    where: { id: sessionId },
    select: { user_id: true, expires_at: true },
  })

  if (!session) {return null}

  const expiresAt = new Date(session.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return null
  }

  return session.user_id
}

export const normalizeTags = (tags?: string[] | null | unknown) => {
  if (!tags) {return []}
  if (Array.isArray(tags)) {return tags.filter(Boolean)}
  return []
}

export const resolveUserId = (
  queryUserId: string | null | undefined,
  sessionUserId: string | null | undefined,
  fallback = "guest"
) => queryUserId || sessionUserId || fallback

export const buildSessionCookieOptions = (maxAgeSeconds = SESSION_MAX_AGE_SECONDS) => {
  const secure = process.env.NODE_ENV === "production"
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

export const listMoods = async ({
  userId,
  limit,
  offset,
}: {
  userId: string
  limit: number
  offset: number
}) => {
  if (userId === "guest") {
    return []
  }

  const records = await prisma.mood_records.findMany({
    where: {
      is_deleted: false,
      user_id: userId,
    },
    orderBy: { created_at: "desc" },
    take: limit,
    skip: offset,
  })

  return records.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mood_type: row.mood_type,
    intensity: row.intensity,
    note: row.note ? decrypt(row.note) : "",
    tags: row.tags ? (Array.isArray(row.tags) ? row.tags : []) : [],
    created_at: row.created_at,
  }))
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS
