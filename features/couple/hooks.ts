"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"
import { createCoupleSpace, cancelCoupleSpace, fetchCoupleSpaces, respondCoupleSpace } from "./api"
import { useSpaceStore } from "./store"
import type { CoupleSpace } from "./types"

export const COUPLE_SPACES_QUERY_KEY = ["couple-spaces"] as const

export const useCoupleSpaces = (options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: COUPLE_SPACES_QUERY_KEY,
    queryFn: fetchCoupleSpaces,
    staleTime: 60_000,
    ...options,
  })

  const acceptedSpaces = (query.data ?? []).filter((item) => item.status === "accepted")

  // 首个可用空间自动选中，保证 mood 记录与历史浏览的默认上下文
  useEffect(() => {
    if (acceptedSpaces.length === 0) {return}
    const { coupleSpaceId, setDefaultCoupleSpace } = useSpaceStore.getState()
    if (!coupleSpaceId) {
      setDefaultCoupleSpace(acceptedSpaces[0].id)
    }
  }, [acceptedSpaces])

  return { ...query, acceptedSpaces }
}

export const useCreateInvitation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, spaceName }: { email: string; spaceName?: string }) =>
      createCoupleSpace(email, spaceName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COUPLE_SPACES_QUERY_KEY })
    },
  })
}

export const useCancelInvitation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (spaceId: string) => cancelCoupleSpace(spaceId),
    onSuccess: () => {
      toast("已取消邀请", { duration: 2000 })
      void queryClient.invalidateQueries({ queryKey: COUPLE_SPACES_QUERY_KEY })
    },
    onError: () => {
      toast("取消失败", { description: "请重试", duration: 2000 })
    },
  })
}

export const useRespondInvitation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ spaceId, action }: { spaceId: string; action: "accepted" | "rejected" }) =>
      respondCoupleSpace(spaceId, action),
    onSuccess: (_data, variables) => {
      toast(variables.action === "accepted" ? "已连接" : "已拒绝", { duration: 2000 })
      void queryClient.invalidateQueries({ queryKey: COUPLE_SPACES_QUERY_KEY })
    },
    onError: () => {
      toast("操作失败", { description: "请重试", duration: 2000 })
    },
  })
}

export type { CoupleSpace }
