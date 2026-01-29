import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildSessionCookieOptions, ok } from "@/lib/server/helpers"

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value
  if (sessionId) {
    await prisma.user_sessions.delete({
      where: { id: sessionId },
    })
  }

  const response = ok(null) as NextResponse
  response.cookies.set("session_id", "", buildSessionCookieOptions(0))
  return response
}
