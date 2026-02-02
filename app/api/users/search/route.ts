import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId, ok, resolveUserId } from "@/lib/server/helpers"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const q = query.get("q")?.trim()

  if (!q) {
    return ok({ exists: false, userId: null })
  }

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return ok({ exists: false, userId: null })
  }

  const user = await prisma.users.findFirst({
    where: {
      OR: [{ email: q }, { username: q }],
      id: { not: userId },
    },
    select: { id: true, email: true, username: true },
  })

  if (!user) {
    return ok({ exists: false, userId: null })
  }

  return ok({ exists: true, userId: user.id, email: user.email, username: user.username })
}
