import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  buildAnalytics,
  getSessionUserId,
  ok,
  resolveUserId,
} from "@/lib/server/helpers"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(query.get("user_id"), sessionUserId)

  const now = new Date()
  const year = Number(query.get("year")) || now.getFullYear()
  const month = Number(query.get("month")) || now.getMonth() + 1

  const start = new Date(year, month - 1, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(year, month, 1)
  end.setHours(0, 0, 0, 0)

  let records: Array<{ mood_type: string; intensity: number; created_at: Date }> = []

  if (userId !== "guest") {
    records = await prisma.mood_records.findMany({
      where: {
        is_deleted: false,
        user_id: userId,
        created_at: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { created_at: "asc" },
      select: {
        mood_type: true,
        intensity: true,
        created_at: true,
      },
    })
  }

  const analytics = buildAnalytics(records, year, month)
  return ok(analytics)
}
