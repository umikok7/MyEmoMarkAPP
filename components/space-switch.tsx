"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { buildApiUrl } from "@/lib/api"
import { UserPlus } from "lucide-react"
import { SpaceSwitchDisplay } from "@/components/space-switch-display"
import { InvitePartnerModal } from "@/components/invite-partner-modal"
import { PendingInvitationStatus } from "@/components/pending-invitation-status"
import { InviteAcceptModal } from "@/components/invite-accept-modal"

export interface CoupleSpace {
  id: string
  space_name: string | null
  status: string
  user_id_1: string
  user_id_2: string
  creator_user_id: string
}

interface SpaceSwitchContainerProps {
  currentSpace: "personal" | "couple"
  onSpaceChange: (space: "personal" | "couple", coupleSpaceId?: string) => void
}

export function SpaceSwitchContainer({ currentSpace, onSpaceChange }: SpaceSwitchContainerProps) {
  const [allSpaces, setAllSpaces] = React.useState<CoupleSpace[]>([])
  const [userId, setUserId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [showAcceptModal, setShowAcceptModal] = React.useState(false)
  const [invitation, setInvitation] = React.useState<CoupleSpace | null>(null)

  React.useEffect(() => {
    const rawUser = localStorage.getItem("awesome-user")
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser)
        setUserId(parsed?.id || null)
      } catch {
        setUserId(null)
      }
    }
  }, [])

  const fetchSpaces = React.useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("/couple-spaces"), { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      setAllSpaces((json?.data?.items || []) as CoupleSpace[])
    } catch (error) {
      console.error("Failed to fetch spaces:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSpaces()
  }, [fetchSpaces])

  const acceptedSpaces = allSpaces.filter((s) => s.status === "accepted")
  const pendingSentSpaces = allSpaces.filter(
    (s) => s.status === "pending" && s.creator_user_id === userId
  )
  const pendingReceivedSpaces = allSpaces.filter(
    (s) => s.status === "pending" && s.creator_user_id !== userId
  )

  const hasAccepted = acceptedSpaces.length > 0
  const hasPendingSent = pendingSentSpaces.length > 0
  const hasPendingReceived = pendingReceivedSpaces.length > 0
  const pendingReceived = pendingReceivedSpaces[0] || null

  React.useEffect(() => {
    if (hasPendingReceived && pendingReceived && !showAcceptModal) {
      setShowAcceptModal(true)
      setInvitation(pendingReceived)
    }
  }, [hasPendingReceived, pendingReceived, showAcceptModal])

  const handleInviteSent = React.useCallback(() => {
    fetchSpaces()
  }, [fetchSpaces])

  const handleAccept = React.useCallback(() => {
    setShowAcceptModal(false)
    setInvitation(null)
    fetchSpaces()
  }, [fetchSpaces])

  const handleDecline = React.useCallback(() => {
    setShowAcceptModal(false)
    setInvitation(null)
    fetchSpaces()
  }, [fetchSpaces])

  const handleCancelInvite = React.useCallback(async (spaceId: string) => {
    try {
      await fetch(buildApiUrl(`/couple-spaces/${spaceId}`), {
        method: "DELETE",
        credentials: "include",
      })
      fetchSpaces()
    } catch (error) {
      console.error("Failed to cancel invitation:", error)
    }
  }, [fetchSpaces])

  if (loading) {
    return (
      <div className="mb-8 flex justify-center">
        <div className="h-10 w-48 rounded-full bg-stone-100 animate-pulse" />
      </div>
    )
  }

  return (
    <>
      <div className="relative mb-8">
        {hasAccepted && (
          <SpaceSwitchDisplay
            currentSpace={currentSpace}
            spaces={acceptedSpaces}
            selectedSpaceId={currentSpace === "couple" ? acceptedSpaces[0]?.id : null}
            onSpaceChange={onSpaceChange}
          />
        )}

        {hasPendingSent && (
          <PendingInvitationStatus
            spaceName={pendingSentSpaces[0]?.space_name}
            onCancel={() => handleCancelInvite(pendingSentSpaces[0].id)}
          />
        )}

        {!hasAccepted && !hasPendingSent && (
          <div className="flex flex-col items-center">
            <div
              onClick={() => setShowInviteModal(true)}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-full",
                "bg-stone-100 hover:bg-stone-200",
                "text-sm font-medium text-stone-600",
                "transition-all duration-300 cursor-pointer",
                "shadow-sm hover:shadow-md"
              )}
            >
              <UserPlus className="w-4 h-4" />
              Invite Partner
            </div>
            <p className="mt-3 text-xs text-stone-400 text-center leading-relaxed">
              Share your emotional journey together<br />
              Start by inviting your partner
            </p>
          </div>
        )}
      </div>

      <InvitePartnerModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={handleInviteSent}
      />

      <InviteAcceptModal
        isOpen={showAcceptModal}
        spaceName={invitation?.space_name}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </>
  )
}

export function useSpaceSwitch() {
  const [currentSpace, setCurrentSpace] = React.useState<"personal" | "couple">("personal")

  const handleSpaceChange = React.useCallback((space: "personal" | "couple") => {
    setCurrentSpace(space)
  }, [])

  return {
    currentSpace,
    handleSpaceChange,
  }
}
