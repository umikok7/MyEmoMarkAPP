import { NextRequest } from "next/server"
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

type CoupleMoodUpdatePayload = {
  mood_type?: string
  intensity?: number
  note?: string
  tags?: string[]
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const recordId = resolvedParams.id
  if (!recordId) return fail(400, "Record ID is required")

  const body = await parseJson<CoupleMoodUpdatePayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const moodType = body.mood_type?.trim()
  const intensity = Number(body.intensity)
  if (!moodType) return fail(400, "mood_type is required")
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    return fail(400, "intensity must be between 1 and 10")
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 查找原记录并验证权限
  const existingRecord = await prisma.couple_mood_records.findFirst({
    where: {
      id: recordId,
      is_deleted: false,
    },
    include: {
      couple_spaces: true,
    },
  })

  if (!existingRecord) {
    return fail(404, "Record not found")
  }

  // 验证用户是否是该空间的成员（双方都可以编辑任何记录）
  const space = existingRecord.couple_spaces
  if (!space || space.is_deleted || space.status !== "accepted") {
    return fail(404, "Space not found or not accessible")
  }

  if (space.user_id_1 !== userId && space.user_id_2 !== userId) {
    return fail(403, "You are not a member of this space")
  }

  const note = body.note?.trim() || null
  const tags = normalizeTags(body.tags)

  // 直接更新记录
  const record = await prisma.couple_mood_records.update({
    where: { id: recordId },
    data: {
      mood_type: moodType,
      intensity,
      note: note ? encrypt(note) : null,
      tags: tags as InputJsonValue,
      updated_at: new Date(),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const recordId = resolvedParams.id
  if (!recordId) return fail(400, "Record ID is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 查找记录并验证权限
  const existingRecord = await prisma.couple_mood_records.findFirst({
    where: {
      id: recordId,
      is_deleted: false,
    },
    include: {
      couple_spaces: true,
    },
  })

  if (!existingRecord) {
    return fail(404, "Record not found")
  }

  // 验证用户是否是该空间的成员（双方都可以删除任何记录）
  const space = existingRecord.couple_spaces
  if (!space || space.is_deleted || space.status !== "accepted") {
    return fail(404, "Space not found or not accessible")
  }

  if (space.user_id_1 !== userId && space.user_id_2 !== userId) {
    return fail(403, "You are not a member of this space")
  }

  // 软删除记录
  const result = await prisma.couple_mood_records.updateMany({
    where: {
      id: recordId,
      is_deleted: false,
    },
    data: {
      deleted_at: new Date(),
      is_deleted: true,
      updated_at: new Date(),
    },
  })

  if (!result.count) return fail(404, "Record not found")
  return ok({ deleted_id: recordId })
}
