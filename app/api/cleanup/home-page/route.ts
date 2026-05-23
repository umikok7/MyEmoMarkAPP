import { prisma } from "@/lib/prisma"
import { addDays } from "@/lib/date"
import { ok, fail } from "@/lib/server/helpers"

const CUTOFF_DAYS = 5

export async function GET() {
  try {
    const cutoffDate = addDays(new Date(), -CUTOFF_DAYS)
    cutoffDate.setHours(0, 0, 0, 0)

    const result = await prisma.daily_tasks.deleteMany({
      where: { OR: [{ completed_at: { not: null } }, { is_deleted: true }, { is_pinned: false, task_date: { lt: cutoffDate } }] },
    })

    console.log(`[cleanup] Deleted ${result.count} blocks`)
    return ok({ deletedBlocks: result.count })
  } catch (error) {
    console.error("[cleanup] Error:", error)
    return fail(500, "Cleanup failed")
  }
}