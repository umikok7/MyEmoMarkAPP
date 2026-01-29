import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  fail,
  getSessionUserId,
  ok,
  resolveUserId,
} from "@/lib/server/helpers"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(query.get("user_id"), sessionUserId)

  const year = Number(query.get("year"))
  const month = Number(query.get("month"))

  if (!year || !month) {
    return fail(400, "year and month are required")
  }

  if (userId === "guest") {
    return ok({ tasks: [] })
  }

  const startDate = new Date(year, month - 1, 1)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(year, month, 1)
  endDate.setHours(0, 0, 0, 0)

  const tasks = await prisma.daily_tasks.findMany({
    where: {
      is_deleted: false,
      user_id: userId,
      task_date: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: { task_date: "asc" },
    select: {
      id: true,
      user_id: true,
      title: true,
      task_date: true,
      is_done: true,
      created_at: true,
    },
  })

  return ok({ tasks })
}
