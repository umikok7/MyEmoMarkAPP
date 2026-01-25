import { NextResponse } from "next/server"
import { pool } from "@/lib/server/db"

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
  if (!sessionId) return null
  const { rows } = await pool.query(
    "SELECT user_id, expires_at FROM user_sessions WHERE id = $1",
    [sessionId]
  )
  if (!rows[0]) return null
  const expiresAt = new Date(rows[0].expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return null
  }
  return rows[0].user_id as string
}

export const normalizeTags = (tags?: string[] | null) => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags.filter(Boolean)
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
  const { rows } = await pool.query(
    `SELECT id, user_id, mood_type, intensity, note, tags, created_at
     FROM mood_records
     WHERE is_deleted = false AND user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mood_type: row.mood_type,
    intensity: row.intensity,
    note: row.note || "",
    tags: Array.isArray(row.tags) ? row.tags : row.tags ? JSON.parse(row.tags) : [],
    created_at: row.created_at,
  }))
}

export const buildAnalytics = (records: Array<{ mood_type: string; intensity: number; created_at: string }>, days: number) => {
  const pieMap: Record<string, number> = {}
  const daySum: Record<string, number> = {}
  const dayCount: Record<string, number> = {}

  const formatDay = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)

  records.forEach((record) => {
    pieMap[record.mood_type] = (pieMap[record.mood_type] || 0) + 1
    const dayKey = formatDay(new Date(record.created_at))
    daySum[dayKey] = (daySum[dayKey] || 0) + record.intensity
    dayCount[dayKey] = (dayCount[dayKey] || 0) + 1
  })

  const colorMap: Record<string, string> = {
    happy: "#d4b5b0",
    calm: "#a8c3b4",
    anxious: "#fcd34d",
    sad: "#93c5fd",
    angry: "#fca5a5",
  }
  const nameMap: Record<string, string> = {
    happy: "Joy",
    calm: "Calm",
    anxious: "Worry",
    sad: "Blue",
    angry: "Heat",
  }

  const pie = Object.entries(pieMap)
    .map(([mood, count]) => ({
      name: nameMap[mood] || mood,
      value: count,
      color: colorMap[mood] || "#e5e7eb",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  const dates: string[] = []
  const values: number[] = []
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start)
    current.setDate(start.getDate() + i)
    const key = formatDay(current)
    const avg = dayCount[key] ? Math.floor(daySum[key] / dayCount[key]) : 0
    dates.push(key)
    values.push(avg)
  }

  let overviewHtml = ""
  let insightText = ""
  if (records.length) {
    let topMood = ""
    let topCount = 0
    Object.entries(pieMap).forEach(([mood, count]) => {
      if (count > topCount) {
        topMood = mood
        topCount = count
      }
    })
    const label = nameMap[topMood] || "Balanced"
    overviewHtml = `Your recent days lean toward <span class=\"font-normal\">${label}</span>. Take a quiet moment to notice your rhythm.`

    let maxAvg = 0
    let maxDay = ""
    values.forEach((value, index) => {
      if (value > maxAvg) {
        maxAvg = value
        maxDay = dates[index]
      }
    })
    if (maxDay) {
      insightText = `Intensity peaks around ${maxDay}. Consider a short breathing pause on that day.`
    }
  }

  return {
    pie_chart: pie,
    line_chart: { dates, values },
    insight_text: insightText,
    overview_html: overviewHtml,
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS
