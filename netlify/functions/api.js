/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs")
const cookie = require("cookie")
const { Pool } = require("pg")
const { v4: uuidv4 } = require("uuid")

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Netlify function will fail without it.")
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
})

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const BASE_PATH = "/.netlify/functions/api"

const buildHeaders = (origin, extra = {}) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...extra,
  }

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Access-Control-Allow-Credentials"] = "true"
    headers["Access-Control-Allow-Headers"] = "Content-Type"
    headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
  }

  return headers
}

const jsonResponse = (statusCode, payload, origin, extraHeaders) => ({
  statusCode,
  headers: buildHeaders(origin, extraHeaders),
  body: JSON.stringify(payload),
})

const ok = (data, origin, extraHeaders) =>
  jsonResponse(200, { code: 0, msg: "success", errs: "", data }, origin, extraHeaders)

const fail = (statusCode, message, origin, code = 1) =>
  jsonResponse(statusCode, { code, msg: message, errs: message, data: null }, origin)

const parseBody = (event) => {
  if (!event.body) return {}
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const getSessionId = (event) => {
  const header = event.headers?.cookie || event.headers?.Cookie
  if (!header) return null
  const parsed = cookie.parse(header)
  return parsed.session_id || null
}

const getSessionUserId = async (sessionId) => {
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
  return rows[0].user_id
}

const normalizeTags = (tags) => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags.filter(Boolean)
  return []
}

const buildSessionCookie = (sessionId, maxAgeSeconds) => {
  const secure = process.env.NODE_ENV === "production"
  return cookie.serialize("session_id", sessionId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  })
}

const resolveUserId = (queryUserId, sessionUserId, fallback = "guest") => {
  return queryUserId || sessionUserId || fallback
}

const listMoods = async ({ userId, limit, offset }) => {
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

const buildAnalytics = (records, days) => {
  const pieMap = {}
  const daySum = {}
  const dayCount = {}

  const formatDay = (date) =>
    new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)

  records.forEach((record) => {
    pieMap[record.mood_type] = (pieMap[record.mood_type] || 0) + 1
    const dayKey = formatDay(new Date(record.created_at))
    daySum[dayKey] = (daySum[dayKey] || 0) + record.intensity
    dayCount[dayKey] = (dayCount[dayKey] || 0) + 1
  })

  const colorMap = {
    happy: "#d4b5b0",
    calm: "#a8c3b4",
    anxious: "#fcd34d",
    sad: "#93c5fd",
    angry: "#fca5a5",
  }
  const nameMap = {
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

  const dates = []
  const values = []
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

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || ""

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: buildHeaders(origin),
      body: "",
    }
  }

  const rawPath = event.path || "/"
  const normalizedPath = rawPath.startsWith(BASE_PATH)
    ? rawPath.slice(BASE_PATH.length) || "/"
    : rawPath

  try {
    if (normalizedPath === "/auth/login" && event.httpMethod === "POST") {
      const body = parseBody(event)
      if (!body) return fail(400, "Invalid JSON payload", origin)
      const account = body.account?.trim()
      const password = body.password
      if (!account || !password) return fail(400, "Account and password required", origin)

      const { rows } = await pool.query(
        "SELECT id, email, username, avatar_url, password_hash FROM users WHERE email = $1 OR username = $1 LIMIT 1",
        [account]
      )

      const user = rows[0]
      if (!user) return fail(401, "User not found", origin)

      const match = await bcrypt.compare(password, user.password_hash)
      if (!match) return fail(401, "Invalid password", origin)

      const sessionId = uuidv4()
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
      await pool.query(
        "INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
        [sessionId, user.id, expiresAt]
      )

      const setCookie = buildSessionCookie(sessionId, SESSION_MAX_AGE_SECONDS)

      return ok(
        {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
          },
          session_id: sessionId,
          expires_at: expiresAt,
        },
        origin,
        { "Set-Cookie": setCookie }
      )
    }

    if (normalizedPath === "/auth/register" && event.httpMethod === "POST") {
      const body = parseBody(event)
      if (!body) return fail(400, "Invalid JSON payload", origin)
      const email = body.email?.trim()
      const username = body.username?.trim()
      const password = body.password
      if (!email || !password) return fail(400, "Email and password required", origin)

      const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [email])
      if (exists.rows.length) {
        return fail(409, "Email already exists", origin)
      }

      const hash = await bcrypt.hash(password, 10)
      const userId = uuidv4()
      const { rows } = await pool.query(
        "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, username, avatar_url",
        [userId, email, username || null, hash]
      )
      const user = rows[0]

      const sessionId = uuidv4()
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
      await pool.query(
        "INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
        [sessionId, user.id, expiresAt]
      )

      const setCookie = buildSessionCookie(sessionId, SESSION_MAX_AGE_SECONDS)

      return ok(
        {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
          },
          session_id: sessionId,
          expires_at: expiresAt,
        },
        origin,
        { "Set-Cookie": setCookie }
      )
    }

    if (normalizedPath === "/auth/logout" && event.httpMethod === "POST") {
      const sessionId = getSessionId(event)
      if (sessionId) {
        await pool.query("DELETE FROM user_sessions WHERE id = $1", [sessionId])
      }
      const setCookie = buildSessionCookie("", 0)
      return ok(null, origin, { "Set-Cookie": setCookie })
    }

    if (normalizedPath === "/moods" && event.httpMethod === "GET") {
      const query = event.queryStringParameters || {}
      const limit = Math.max(0, Number(query.limit) || 50)
      const offset = Math.max(0, Number(query.offset) || 0)
      const sessionId = getSessionId(event)
      const sessionUserId = await getSessionUserId(sessionId)
      const userId = resolveUserId(query.user_id, sessionUserId)

      const items = await listMoods({ userId, limit, offset })
      return ok({ items }, origin)
    }

    if (normalizedPath === "/moods/analytics" && event.httpMethod === "GET") {
      const query = event.queryStringParameters || {}
      const days = Math.max(1, Number(query.days) || 7)
      const sessionId = getSessionId(event)
      const sessionUserId = await getSessionUserId(sessionId)
      const userId = resolveUserId(query.user_id, sessionUserId)

      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - (days - 1))
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setDate(now.getDate() + 1)
      end.setHours(0, 0, 0, 0)

      const { rows } = await pool.query(
        `SELECT mood_type, intensity, created_at
         FROM mood_records
         WHERE is_deleted = false AND user_id = $1
           AND created_at >= $2 AND created_at < $3
         ORDER BY created_at ASC`,
        [userId, start, end]
      )

      const analytics = buildAnalytics(rows, days)
      return ok(analytics, origin)
    }

    if (normalizedPath === "/moods" && event.httpMethod === "POST") {
      const body = parseBody(event)
      if (!body) return fail(400, "Invalid JSON payload", origin)

      const moodType = body.mood_type?.trim()
      const intensity = Number(body.intensity)
      if (!moodType) return fail(400, "mood_type is required", origin)
      if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
        return fail(400, "intensity must be between 1 and 10", origin)
      }

      const sessionId = getSessionId(event)
      const sessionUserId = await getSessionUserId(sessionId)
      const userId = resolveUserId(body.user_id, sessionUserId)
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
      return ok(
        {
          record: {
            id: record.id,
            user_id: record.user_id,
            mood_type: record.mood_type,
            intensity: record.intensity,
            note: record.note || "",
            tags: Array.isArray(record.tags) ? record.tags : record.tags ? JSON.parse(record.tags) : [],
            created_at: record.created_at,
          },
        },
        origin
      )
    }

    if (normalizedPath.startsWith("/moods/") && event.httpMethod === "PUT") {
      const recordId = normalizedPath.replace("/moods/", "")
      if (!recordId) return fail(400, "Record ID is required", origin)
      const body = parseBody(event)
      if (!body) return fail(400, "Invalid JSON payload", origin)

      const moodType = body.mood_type?.trim()
      const intensity = Number(body.intensity)
      if (!moodType) return fail(400, "mood_type is required", origin)
      if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
        return fail(400, "intensity must be between 1 and 10", origin)
      }

      const sessionId = getSessionId(event)
      const sessionUserId = await getSessionUserId(sessionId)
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
          return fail(404, "Record not found", origin)
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
        return ok(
          {
            record: {
              id: record.id,
              user_id: record.user_id,
              mood_type: record.mood_type,
              intensity: record.intensity,
              note: record.note || "",
              tags: Array.isArray(record.tags) ? record.tags : record.tags ? JSON.parse(record.tags) : [],
              created_at: record.created_at,
            },
          },
          origin
        )
      } catch (error) {
        await client.query("ROLLBACK")
        console.error("Update mood failed", error)
        return fail(500, "Failed to update mood", origin)
      } finally {
        client.release()
      }
    }

    if (normalizedPath.startsWith("/moods/") && event.httpMethod === "DELETE") {
      const recordId = normalizedPath.replace("/moods/", "")
      if (!recordId) return fail(400, "Record ID is required", origin)

      const sessionId = getSessionId(event)
      const sessionUserId = await getSessionUserId(sessionId)
      const userId = resolveUserId(null, sessionUserId)

      const result = await pool.query(
        `UPDATE mood_records
         SET deleted_at = NOW(), is_deleted = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
        [recordId, userId]
      )

      if (!result.rowCount) return fail(404, "Record not found", origin)
      return ok({ deleted_id: recordId }, origin)
    }

    return fail(404, "Route not found", origin)
  } catch (error) {
    console.error("API error", error)
    return fail(500, "Internal server error", origin)
  }
}
