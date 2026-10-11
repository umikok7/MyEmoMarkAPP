"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchLikeNotifications } from "./api"
import { useAuthStore } from "@/store/use-auth-store"

export const useLikeNotifications = () => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)

  const query = useQuery({
    queryKey: ["notifications", "likes"],
    queryFn: fetchLikeNotifications,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  return {
    notifications: query.data?.notifications ?? [],
    hasUnread: query.data?.hasUnread ?? false,
    isLoading: query.isLoading,
  }
}
