import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { pool } from "@/lib/server/db"
import {
  fail,
  getSessionUserId,
  listMoods,
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

  const items = await listMoods({ userId, limit, offset })
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

  const recordId = uuidv4()
  const { rows } = await pool.query(
    `INSERT INTO mood_records (id, user_id, mood_type, intensity, note, tags)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, user_id, mood_type, intensity, note, tags, created_at`,
    [recordId, userId, moodType, intensity, note, JSON.stringify(tags)]
  )

  const record = rows[0]
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
}
