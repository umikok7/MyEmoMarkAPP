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

type CoupleMoodPayload = {
  space_id?: string
  mood_type?: string
  intensity?: number
  note?: string
  tags?: string[]
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const spaceId = query.get("space_id")
  const limit = Math.max(0, Number(query.get("limit")) || 50)
  const offset = Math.max(0, Number(query.get("offset")) || 0)

  if (!spaceId) {
    return fail(400, "space_id is required")
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 验证用户是否是该空间的成员
  const space = await prisma.couple_spaces.findFirst({
    where: {
      id: spaceId,
      is_deleted: false,
      status: "accepted", // 只能查看已接受的空间
      OR: [
        { user_id_1: userId },
        { user_id_2: userId },
      ],
    },
  })

  if (!space) {
    return fail(404, "Space not found or not accessible")
  }

  // 查询该空间的情绪记录
  const records = await prisma.couple_mood_records.findMany({
    where: {
      is_deleted: false,
      space_id: spaceId,
    },
    orderBy: { created_at: "desc" },
    take: limit,
    skip: offset,
  })

  const items = records.map((row) => ({
    id: row.id,
    space_id: row.space_id,
    created_by_user_id: row.created_by_user_id,
    mood_type: row.mood_type,
    intensity: row.intensity,
    note: row.note ? decrypt(row.note) : "",
    tags: row.tags ? (Array.isArray(row.tags) ? row.tags : []) : [],
    created_at: row.created_at,
  }))

  return ok({ items })
}

export async function POST(request: NextRequest) {
  const body = await parseJson<CoupleMoodPayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const spaceId = body.space_id?.trim()
  const moodType = body.mood_type?.trim()
  const intensity = Number(body.intensity)

  if (!spaceId) return fail(400, "space_id is required")
  if (!moodType) return fail(400, "mood_type is required")
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    return fail(400, "intensity must be between 1 and 10")
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 验证用户是否是该空间的成员
  const space = await prisma.couple_spaces.findFirst({
    where: {
      id: spaceId,
      is_deleted: false,
      status: "accepted", // 只能在已接受的空间中创建记录
      OR: [
        { user_id_1: userId },
        { user_id_2: userId },
      ],
    },
  })

  if (!space) {
    return fail(404, "Space not found or not accessible")
  }

  const note = body.note?.trim() || null
  const tags = normalizeTags(body.tags)

  const record = await prisma.couple_mood_records.create({
    data: {
      id: uuidv4(),
      space_id: spaceId,
      created_by_user_id: userId,
      mood_type: moodType,
      intensity,
      note: note ? encrypt(note) : null,
      tags: tags as InputJsonValue,
    },
    select: {
      id: true,
      space_id: true,
      created_by_user_id: true,
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
      space_id: record.space_id,
      created_by_user_id: record.created_by_user_id,
      mood_type: record.mood_type,
      intensity: record.intensity,
      note: record.note ? decrypt(record.note) : "",
      tags: record.tags ? (Array.isArray(record.tags) ? record.tags : []) : [],
      created_at: record.created_at,
    },
  })
}
