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

type MoodUpdatePayload = {
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

  const body = await parseJson<MoodUpdatePayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const moodType = body.mood_type?.trim()
  const intensity = Number(body.intensity)
  if (!moodType) return fail(400, "mood_type is required")
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    return fail(400, "intensity must be between 1 and 10")
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)
  const note = body.note?.trim() || null
  const tags = normalizeTags(body.tags)

  const softDelete = await prisma.mood_records.updateMany({
    where: {
      id: recordId,
      user_id: userId,
      is_deleted: false,
    },
    data: {
      deleted_at: new Date(),
      is_deleted: true,
      updated_at: new Date(),
    },
  })

  if (!softDelete.count) {
    return fail(404, "Record not found")
  }

  const newId = uuidv4()
  const record = await prisma.mood_records.create({
    data: {
      id: newId,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const recordId = resolvedParams.id
  if (!recordId) return fail(400, "Record ID is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  const result = await prisma.mood_records.updateMany({
    where: {
      id: recordId,
      user_id: userId,
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
