"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { HeartHandshake, Heart, XCircle } from "lucide-react"
import { useAuthStore } from "@/store/use-auth-store"
import { SurfaceCard } from "@/components/ui/surface-card"
import { useCoupleSpaces, useRespondInvitation } from "../hooks"

interface InviteAcceptModalProps {
  isOpen: boolean
  onSettled: () => void
}

export function InviteAcceptModal({ isOpen, onSettled }: InviteAcceptModalProps) {
  const userId = useAuthStore((state) => state.userId)
  const { data: spaces, isLoading: isLoadingSpaces } = useCoupleSpaces({ enabled: isOpen })
  const respondInvitation = useRespondInvitation()

  const pendingReceived = (spaces ?? []).find(
    (item) => item.status === "pending" && item.creator_user_id !== userId
  )

  const handleRespond = async (action: "accepted" | "rejected") => {
    if (!pendingReceived) {
      onSettled()
      return
    }
    try {
      await respondInvitation.mutateAsync({ spaceId: pendingReceived.id, action })
    } catch {
      toast("操作失败", { description: "请重试", duration: 2000 })
    } finally {
      onSettled()
    }
  }

  if (!isOpen) {return null}

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-stone-200/40 backdrop-blur-sm"
        onClick={() => { void handleRespond("rejected"); }}
      />
      <SurfaceCard
        variant="solid"
        className="relative w-[92%] max-w-sm p-8 animate-[fade-scale_0.3s_ease-out] transition-all duration-500"
        onClick={(event) => { event.stopPropagation(); }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-5">
            <HeartHandshake className="w-7 h-7 text-rose-400" />
          </div>

          <h2 className="text-lg font-medium text-stone-800 mb-2">Share Your Journey</h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-6">
            <span className="text-stone-700 font-medium">Someone</span> has invited you to connect in{" "}
            <span className="text-stone-700 font-medium">
              {pendingReceived?.space_name || "Our Space"}
            </span>
            <br />
            <span className="text-stone-400 text-xs mt-2 block">
              Start sharing moods and emotional moments together
            </span>
          </p>

          <div className="w-full h-px bg-stone-100 mb-6" />

          <div className="w-full space-y-3">
            <button
              onClick={() => { void handleRespond("accepted"); }}
              disabled={respondInvitation.isPending || isLoadingSpaces}
              className={cn(
                "w-full py-3.5 rounded-2xl",
                "bg-stone-800 text-white text-sm font-medium",
                "hover:bg-stone-700 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-300 flex items-center justify-center gap-2"
              )}
            >
              <Heart className="w-4 h-4" />
              {respondInvitation.isPending ? "Connecting..." : "Accept Invitation"}
            </button>

            <button
              onClick={() => { void handleRespond("rejected"); }}
              disabled={respondInvitation.isPending}
              className={cn(
                "w-full py-3.5 rounded-2xl",
                "bg-white border border-stone-200",
                "text-stone-600 text-sm font-medium",
                "hover:bg-stone-50 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-300 flex items-center justify-center gap-2"
              )}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
      </SurfaceCard>
    </div>,
    document.body
  )
}
