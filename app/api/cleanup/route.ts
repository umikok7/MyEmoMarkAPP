import { prisma } from "@/lib/prisma"
import { addDays } from "@/lib/date"
import { ok, fail } from "@/lib/server/helpers"

const CUTOFF_DAYS = 5
const SESSION_CUTOFF_DAYS = 7

export async function POST() {
  try {
    const cutoffDate = addDays(new Date(), -CUTOFF_DAYS)
    cutoffDate.setHours(0, 0, 0, 0)

    const sessionDeleteData = addDays(new Date(), -SESSION_CUTOFF_DAYS)
    sessionDeleteData.setHours(0, 0, 0, 0)

    const dailyTaskresult = await prisma.daily_tasks.deleteMany({
      where: { OR: [{ completed_at: { not: null } }, { is_deleted: true }, { is_pinned: false, task_date: { lt: cutoffDate } }] },
    })

    const dailyTimeBlocksResult = await prisma.daily_time_blocks.deleteMany({
      where: { task_date: { lt: cutoffDate } },
    })

    const userSessionsResult = await prisma.user_sessions.deleteMany({
      where: {expires_at: { lt: sessionDeleteData }}
    })

    console.log(`[cleanup] Deleted ${dailyTaskresult.count} blocks`)
    console.log(`[cleanup] Deleted ${dailyTimeBlocksResult.count} time blocks`)
    console.log(`[cleanup] Deleted ${userSessionsResult.count} user sessions`)
    return ok({
      deletedBlocks: dailyTaskresult.count,
      deletedTimeBlocks: dailyTimeBlocksResult.count,
      deletedUserSessions: userSessionsResult.count,
      })
  } catch (error) {
    console.error("[cleanup] Error:", error)
    return fail(500, "Cleanup failed")
  }
}