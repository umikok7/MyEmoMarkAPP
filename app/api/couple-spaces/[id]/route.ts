import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  fail,
  getSessionUserId,
  ok,
  parseJson,
  resolveUserId,
} from "@/lib/server/helpers"

type UpdateSpacePayload = {
  status?: "accepted" | "rejected"
  space_name?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const spaceId = resolvedParams.id
  if (!spaceId) return fail(400, "Space ID is required")

  const body = await parseJson<UpdateSpacePayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 查找空间
  const space = await prisma.couple_spaces.findFirst({
    where: {
      id: spaceId,
      is_deleted: false,
    },
  })

  if (!space) {
    return fail(404, "Space not found")
  }

  // 验证用户是否是空间成员
  if (space.user_id_1 !== userId && space.user_id_2 !== userId) {
    return fail(403, "You are not a member of this space")
  }

  // 处理状态更新（接受/拒绝邀请）
  if (body.status) {
    // 只有被邀请者才能接受/拒绝
    if (space.creator_user_id === userId) {
      return fail(403, "Cannot accept/reject your own invitation")
    }

    if (space.status !== "pending") {
      return fail(400, "Space invitation already processed")
    }

    if (body.status !== "accepted" && body.status !== "rejected") {
      return fail(400, "Invalid status value")
    }

    const updatedSpace = await prisma.couple_spaces.update({
      where: { id: spaceId },
      data: {
        status: body.status,
        updated_at: new Date(),
      },
    })

    return ok({
      space: {
        id: updatedSpace.id,
        user_id_1: updatedSpace.user_id_1,
        user_id_2: updatedSpace.user_id_2,
        creator_user_id: updatedSpace.creator_user_id,
        status: updatedSpace.status,
        space_name: updatedSpace.space_name,
        updated_at: updatedSpace.updated_at,
      },
    })
  }

  // 处理空间名称更新
  if (body.space_name) {
    const spaceName = body.space_name.trim()
    if (!spaceName) {
      return fail(400, "space_name cannot be empty")
    }

    const updatedSpace = await prisma.couple_spaces.update({
      where: { id: spaceId },
      data: {
        space_name: spaceName,
        updated_at: new Date(),
      },
    })

    return ok({
      space: {
        id: updatedSpace.id,
        user_id_1: updatedSpace.user_id_1,
        user_id_2: updatedSpace.user_id_2,
        creator_user_id: updatedSpace.creator_user_id,
        status: updatedSpace.status,
        space_name: updatedSpace.space_name,
        updated_at: updatedSpace.updated_at,
      },
    })
  }

  return fail(400, "No valid update fields provided")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params)
  const spaceId = resolvedParams.id
  if (!spaceId) return fail(400, "Space ID is required")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 查找空间
  const space = await prisma.couple_spaces.findFirst({
    where: {
      id: spaceId,
      is_deleted: false,
    },
  })

  if (!space) {
    return fail(404, "Space not found")
  }

  // 验证用户是否是空间成员
  if (space.user_id_1 !== userId && space.user_id_2 !== userId) {
    return fail(403, "You are not a member of this space")
  }

  // 软删除空间
  await prisma.couple_spaces.update({
    where: { id: spaceId },
    data: {
      deleted_at: new Date(),
      is_deleted: true,
      updated_at: new Date(),
    },
  })

  return ok({ deleted_id: spaceId })
}
