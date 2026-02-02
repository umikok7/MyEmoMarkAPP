"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { buildApiUrl } from "@/lib/api"
import { toast } from "sonner"
import { HeartHandshake, Heart, XCircle } from "lucide-react"

interface InviteAcceptModalProps {
  isOpen: boolean
  spaceName?: string | null
  inviterName?: string
  onAccept: () => void
  onDecline: () => void
}

export function InviteAcceptModal({
  isOpen,
  spaceName,
  inviterName,
  onAccept,
  onDecline,
}: InviteAcceptModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  if (!isOpen) return null

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(buildApiUrl("/couple-spaces"), {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch spaces")

      const json = await res.json()
      const pendingSpaces = ((json?.data?.items || []) as Array<{
        id: string
        status: string
        creator_user_id: string
      }>).filter((s) => s.status === "pending")

      const targetSpace = pendingSpaces.find((s) => s.creator_user_id !== "current_user_id")
      if (!targetSpace) throw new Error("No pending invitation found")

      const acceptRes = await fetch(buildApiUrl(`/couple-spaces/${targetSpace.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "accepted" }),
      })

      if (!acceptRes.ok) {
        const error = await acceptRes.json()
        throw new Error(error?.message || "Failed to accept invitation")
      }

      toast("Connected", {
        description: `You and ${inviterName || "your partner"} are now connected.`,
        duration: 3000,
      })
      onAccept()
    } catch (error) {
      console.error("Accept error:", error)
      toast("Could not accept", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    try {
      const res = await fetch(buildApiUrl("/couple-spaces"), {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch spaces")

      const json = await res.json()
      const pendingSpaces = ((json?.data?.items || []) as Array<{
        id: string
        status: string
        creator_user_id: string
      }>).filter((s) => s.status === "pending")

      const targetSpace = pendingSpaces.find((s) => s.creator_user_id !== "current_user_id")
      if (!targetSpace) {
        onDecline()
        return
      }

      const declineRes = await fetch(buildApiUrl(`/couple-spaces/${targetSpace.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected" }),
      })

      if (!declineRes.ok) {
        throw new Error("Failed to decline invitation")
      }

      toast("Invitation declined", {
        description: "The invitation has been declined.",
        duration: 3000,
      })
      onDecline()
    } catch (error) {
      console.error("Decline error:", error)
      toast("Could not decline", {
        description: "Please try again.",
        duration: 3000,
      })
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-stone-200/40 backdrop-blur-sm"
        onClick={onDecline}
      />
      <div
        className={cn(
          "relative w-[92%] max-w-sm rounded-[32px] bg-[#fdfbf7]",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]",
          "ring-1 ring-stone-200/50",
          "p-8 animate-[fadeScale_0.3s_ease-out]",
          "transition-all duration-500"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-5">
            <HeartHandshake className="w-7 h-7 text-rose-400" />
          </div>

          <h2 className="text-lg font-medium text-stone-800 mb-2">
            Share Your Journey
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-6">
            <span className="text-stone-700 font-medium">{inviterName || "Someone"}</span>{" "}
            has invited you to connect in{" "}
            <span className="text-stone-700 font-medium">{spaceName || "Our Space"}</span>
            <br />
            <span className="text-stone-400 text-xs mt-2 block">
              Start sharing moods and emotional moments together
            </span>
          </p>

          <div className="w-full h-px bg-stone-100 mb-6" />

          <div className="w-full space-y-3">
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className={cn(
                "w-full py-3.5 rounded-2xl",
                "bg-stone-800 text-white text-sm font-medium",
                "hover:bg-stone-700 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-300 flex items-center justify-center gap-2"
              )}
            >
              <Heart className="w-4 h-4" />
              {isLoading ? "Connecting..." : "Accept Invitation"}
            </button>

            <button
              onClick={handleDecline}
              disabled={isLoading}
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
      </div>
    </div>,
    document.body
  )
}
