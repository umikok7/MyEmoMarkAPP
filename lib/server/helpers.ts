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
  if (!sessionId) return null

  const session = await prisma.user_sessions.findUnique({
    where: { id: sessionId },
    select: { user_id: true, expires_at: true },
  })

  if (!session) return null

  const expiresAt = new Date(session.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return null
  }

  return session.user_id
}

export const normalizeTags = (tags?: string[] | null | unknown) => {
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

export const buildAnalytics = (
  records: Array<{ mood_type: string; intensity: number; created_at: Date }>,
  year: number,
  month: number
) => {
  const pieMap: Record<string, number> = {}
  const dayMap: Record<string, { mood: string; intensity: number }> = {}

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

  records.forEach((record) => {
    pieMap[record.mood_type] = (pieMap[record.mood_type] || 0) + 1

    const date = new Date(record.created_at)
    const dateKey = date.toISOString().split("T")[0]

    if (!dayMap[dateKey] || new Date(record.created_at) > new Date(dayMap[dateKey].intensity as unknown as string)) {
      dayMap[dateKey] = {
        mood: record.mood_type,
        intensity: record.intensity,
      }
    }
  })

  const donut = Object.entries(pieMap)
    .map(([mood, count]) => ({
      name: nameMap[mood] || mood,
      value: count,
      color: colorMap[mood] || "#e5e7eb",
    }))
    .sort((a, b) => b.value - a.value)

  const currentYear = year
  const currentMonth = month - 1

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const totalDays = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const calendar: Array<{
    date: number | null
    dateString: string | null
    mood: string | null
    color: string | null
    intensity: number | null
  }> = []

  for (let i = 0; i < startDayOfWeek; i++) {
    calendar.push({ date: null, dateString: null, mood: null, color: null, intensity: null })
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dayData = dayMap[dateString]

    calendar.push({
      date: day,
      dateString,
      mood: dayData?.mood || null,
      color: dayData ? colorMap[dayData.mood] || null : null,
      intensity: dayData?.intensity || null,
    })
  }

  let suggestionText = "Take time to breathe. Your feelings are valid."
  if (records.length > 0) {
    let topMood = ""
    let topCount = 0
    Object.entries(pieMap).forEach(([mood, count]) => {
      if (count > topCount) {
        topMood = mood
        topCount = count
      }
    })

    const suggestions: Record<string, string> = {
      happy: "Your joy is beautiful. Share it with someone today.",
      calm: "You've found peace. Notice the quiet moments.",
      anxious: "Breathe slowly. This feeling will pass.",
      sad: "Be gentle with yourself. Rest is healing.",
      angry: "Your feelings matter. Take a mindful pause.",
    }

    suggestionText = suggestions[topMood] || suggestionText
  }

  const monthDate = new Date(currentYear, currentMonth, 1)

  return {
    calendar,
    donut_chart: donut,
    suggestion: suggestionText,
    month: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthDate),
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS
