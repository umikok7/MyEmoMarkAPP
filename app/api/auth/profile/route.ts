import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId, ok, resolveUserId } from "@/lib/server/helpers"

export async function GET(request: NextRequest) {
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return ok({ user: null })
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, avatar_url: true },
  })

  if (!user) {
    return ok({ user: null })
  }

  return ok({ user })
}
