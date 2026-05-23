import { prisma } from "@/lib/prisma"
import { addDays } from "@/lib/date"
import { ok, fail } from "@/lib/server/helpers"

const CUTOFF_DAYS = 5

export async function GET() {
  try {
    const cutoffDate = addDays(new Date(), -CUTOFF_DAYS)
    cutoffDate.setHours(0, 0, 0, 0)

    const result = await prisma.daily_time_blocks.deleteMany({
      where: { task_date: { lt: cutoffDate } },
    })

    console.log(`[cleanup] Deleted ${result.count} blocks older than ${CUTOFF_DAYS} days`)
    return ok({ deletedBlocks: result.count })
  } catch (error) {
    console.error("[cleanup] Error:", error)
    return fail(500, "Cleanup failed")
  }
}