import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { fail, getSessionUserId, ok, parseJson, resolveUserId } from "@/lib/server/helpers"

type TaskUpdatePayload = {
  is_done?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const taskId = resolvedParams.id
  if (!taskId) return fail(400, "Task ID is required")

  const body = await parseJson<TaskUpdatePayload>(request)
  if (!body || typeof body.is_done !== "boolean") return fail(400, "is_done is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  const record = await prisma.daily_tasks.update({
    where: {
      id: taskId,
      user_id: userId,
      is_deleted: false,
    },
    data: {
      is_done: body.is_done,
    },
    select: {
      id: true,
      user_id: true,
      title: true,
      task_date: true,
      is_done: true,
      created_at: true,
    },
  })

  if (!record) return fail(404, "Task not found")

  return ok({
    record: {
      ...record,
      title: decrypt(record.title),
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const taskId = resolvedParams.id
  if (!taskId) return fail(400, "Task ID is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  const record = await prisma.daily_tasks.update({
    where: {
      id: taskId,
      user_id: userId,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
    },
    select: {
      id: true,
    },
  })

  if (!record) return fail(404, "Task not found")

  return ok({ success: true })
}
