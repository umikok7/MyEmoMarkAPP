import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/prisma"
import {
  fail,
  getSessionUserId,
  ok,
  parseJson,
  resolveUserId,
} from "@/lib/server/helpers"

type CreateSpacePayload = {
  partner_email?: string
  partner_username?: string
  space_name?: string
}

export async function GET(request: NextRequest) {
  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return ok({ items: [] })
  }

  // 查询当前用户作为成员的所有空间（包括 pending/accepted 状态）
  const spaces = await prisma.couple_spaces.findMany({
    where: {
      is_deleted: false,
      OR: [
        { user_id_1: userId },
        { user_id_2: userId },
      ],
    },
    orderBy: { created_at: "desc" },
  })

  const items = spaces.map((space) => ({
    id: space.id,
    user_id_1: space.user_id_1,
    user_id_2: space.user_id_2,
    creator_user_id: space.creator_user_id,
    status: space.status,
    space_name: space.space_name,
    created_at: space.created_at,
    updated_at: space.updated_at,
  }))

  return ok({ items })
}

export async function POST(request: NextRequest) {
  const body = await parseJson<CreateSpacePayload>(request)
  if (!body) return fail(400, "Invalid JSON payload")

  const sessionUserId = await getSessionUserId(request.cookies.get("session_id")?.value)
  const userId = resolveUserId(null, sessionUserId)

  if (userId === "guest") {
    return fail(401, "Authentication required")
  }

  // 验证参数
  const partnerEmail = body.partner_email?.trim()
  const partnerUsername = body.partner_username?.trim()
  if (!partnerEmail && !partnerUsername) {
    return fail(400, "partner_email or partner_username is required")
  }

  // 查找伴侣用户
  const partner = await prisma.users.findFirst({
    where: {
      OR: [
        { email: partnerEmail || "" },
        { username: partnerUsername || "" },
      ],
    },
    select: { id: true, email: true, username: true },
  })

  if (!partner) {
    return fail(404, "Partner user not found")
  }

  if (partner.id === userId) {
    return fail(400, "Cannot create space with yourself")
  }

  // 检查是否已存在空间（包括 pending 状态）
  const [smallerId, largerId] = [userId, partner.id].sort()
  const existingSpace = await prisma.couple_spaces.findFirst({
    where: {
      is_deleted: false,
      user_id_1: smallerId,
      user_id_2: largerId,
    },
  })

  if (existingSpace) {
    return fail(409, "A space already exists with this user")
  }

  // 创建空间
  const spaceName = body.space_name?.trim() || "Our Space"
  const space = await prisma.couple_spaces.create({
    data: {
      id: uuidv4(),
      user_id_1: smallerId,
      user_id_2: largerId,
      creator_user_id: userId,
      status: "pending",
      space_name: spaceName,
    },
  })

  return ok({
    space: {
      id: space.id,
      user_id_1: space.user_id_1,
      user_id_2: space.user_id_2,
      creator_user_id: space.creator_user_id,
      status: space.status,
      space_name: space.space_name,
      created_at: space.created_at,
      partner_email: partner.email,
      partner_username: partner.username,
    },
  })
}
