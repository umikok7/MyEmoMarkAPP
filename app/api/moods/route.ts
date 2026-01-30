import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/prisma"
import type { InputJsonValue } from "@/lib/generated/prisma/internal/prismaNamespace"
import { encrypt, decrypt } from "@/lib/encryption"
import {
  fail,
  getSessionUserId,
  normalizeTags,
  ok,
  parseJson,
  resolveUserId,
} from "@/lib/server/helpers"

type MoodPayload = {
  user_id?: string
  mood_type?: string
  intensity?: number
  note?: string
  tags?: string[]
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const limit = Math.max(0, Number(query.get("limit")) || 50)
  const offset = Math.max(0, Number(query.get("offset")) || 0)
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(query.get("user_id"), sessionUserId)

  if (userId === "guest") {
    return ok({ items: [] })
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

  const items = records.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mood_type: row.mood_type,
    intensity: row.intensity,
    note: row.note ? decrypt(row.note) : "",
    tags: row.tags ? (Array.isArray(row.tags) ? row.tags : []) : [],
    created_at: row.created_at,
  }))

  return ok({ items })
}

export async function POST(request: NextRequest) {
  const body = await parseJson<MoodPayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const moodType = body.mood_type?.trim()
  const intensity = Number(body.intensity)
  if (!moodType) return fail(400, "mood_type is required")
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    return fail(400, "intensity must be between 1 and 10")
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(body.user_id || null, sessionUserId)
  const note = body.note?.trim() || null
  const tags = normalizeTags(body.tags)

  const record = await prisma.mood_records.create({
    data: {
      id: uuidv4(),
      user_id: userId,
      mood_type: moodType,
      intensity,
      note: note ? encrypt(note) : null,
      tags: tags as InputJsonValue,
    },
    select: {
      id: true,
      user_id: true,
      mood_type: true,
      intensity: true,
      note: true,
      tags: true,
      created_at: true,
    },
  })

  return ok({
    record: {
      id: record.id,
      user_id: record.user_id,
      mood_type: record.mood_type,
      intensity: record.intensity,
      note: record.note ? decrypt(record.note) : "",
      tags: record.tags ? (Array.isArray(record.tags) ? record.tags : []) : [],
      created_at: record.created_at,
    },
  })
}
