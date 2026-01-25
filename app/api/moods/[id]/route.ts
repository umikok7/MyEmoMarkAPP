import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { pool } from "@/lib/server/db"
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

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const softDelete = await client.query(
      `UPDATE mood_records
       SET deleted_at = NOW(), is_deleted = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [recordId, userId]
    )
    if (!softDelete.rowCount) {
      await client.query("ROLLBACK")
      return fail(404, "Record not found")
    }

    const newId = uuidv4()
    const insert = await client.query(
      `INSERT INTO mood_records (id, user_id, mood_type, intensity, note, tags)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, user_id, mood_type, intensity, note, tags, created_at`,
      [newId, userId, moodType, intensity, note, JSON.stringify(tags)]
    )
    await client.query("COMMIT")

    const record = insert.rows[0]
    return ok({
      record: {
        id: record.id,
        user_id: record.user_id,
        mood_type: record.mood_type,
        intensity: record.intensity,
        note: record.note || "",
        tags: Array.isArray(record.tags) ? record.tags : record.tags ? JSON.parse(record.tags) : [],
        created_at: record.created_at,
      },
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Update mood failed", error)
    return fail(500, "Failed to update mood")
  } finally {
    client.release()
  }
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

  const result = await pool.query(
    `UPDATE mood_records
     SET deleted_at = NOW(), is_deleted = true, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
    [recordId, userId]
  )

  if (!result.rowCount) return fail(404, "Record not found")
  return ok({ deleted_id: recordId })
}
