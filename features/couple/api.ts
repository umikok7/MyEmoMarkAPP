import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client"
import type { CoupleSpace } from "./types"

export const fetchCoupleSpaces = () =>
  apiGet<{ items: CoupleSpace[] }>("/couple-spaces").then((data) => data.items ?? [])

export const searchUserByEmail = (email: string) =>
  apiGet<{ exists: boolean; userId?: string }>("/users/search", { q: email })

export const getProfile = () =>
  apiGet<{ user: { id: string; email?: string; name?: string } | null }>("/auth/profile")

export const createCoupleSpace = (partnerEmail: string, spaceName?: string) =>
  apiPost<{ record: CoupleSpace }>("/couple-spaces", {
    partner_email: partnerEmail,
    space_name: spaceName || undefined,
  })

export const cancelCoupleSpace = (spaceId: string) => apiDelete(`/couple-spaces/${spaceId}`)

export const respondCoupleSpace = (spaceId: string, status: "accepted" | "rejected") =>
  apiPatch<{ record: CoupleSpace }>(`/couple-spaces/${spaceId}`, { status })
