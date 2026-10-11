"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"
import { useAuthStore } from "@/store/use-auth-store"
import {
  useCancelInvitation,
  useCoupleSpaces,
} from "../hooks"
import type { SpaceKind } from "../types"
import { InviteAcceptModal } from "./InviteAcceptModal"
import { InvitePartnerModal } from "./InvitePartnerModal"
import { PendingInvitationStatus } from "./PendingInvitationStatus"
import { SpaceSwitchDisplay } from "./SpaceSwitchDisplay"

interface SpaceSwitchContainerProps {
  currentSpace: SpaceKind
  onSpaceChange: (space: SpaceKind, coupleSpaceId?: string) => void
}

export function SpaceSwitchContainer({ currentSpace, onSpaceChange }: SpaceSwitchContainerProps) {
  const userId = useAuthStore((state) => state.userId)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { data: spaces, isLoading } = useCoupleSpaces({ enabled: isLoggedIn })
  const cancelInvitation = useCancelInvitation()

  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [isAcceptOpen, setIsAcceptOpen] = React.useState(false)

  const acceptedSpaces = (spaces ?? []).filter(
    (item) => item.status === "accepted"
  )
  const pendingSent = (spaces ?? []).filter(
    (item) => item.status === "pending" && item.creator_user_id === userId
  )
  const pendingReceived = (spaces ?? []).filter(
    (item) => item.status === "pending" && item.creator_user_id !== userId
  )

  const hasAccepted = acceptedSpaces.length > 0
  const hasPendingSent = pendingSent.length > 0
  const hasPendingReceived = pendingReceived.length > 0 && !isAcceptOpen

  React.useEffect(() => {
    if (hasPendingReceived) {
      setIsAcceptOpen(true)
    }
  }, [hasPendingReceived])

  if (isLoading) {
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

        {!hasAccepted && hasPendingSent && (
          <PendingInvitationStatus
            spaceName={pendingSent[0]?.space_name}
            onCancel={() => {
              if (pendingSent[0]) {
                cancelInvitation.mutate(pendingSent[0].id)
              }
            }}
          />
        )}

        {!hasAccepted && !hasPendingSent && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => { setIsInviteOpen(true); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-600 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Invite Partner
            </button>
            <p className="mt-3 text-xs text-stone-400 text-center leading-relaxed">
              Share your emotional journey together
              <br />
              Start by inviting your partner
            </p>
          </div>
        )}
      </div>

      <InvitePartnerModal isOpen={isInviteOpen} onClose={() => { setIsInviteOpen(false); }} />

      <InviteAcceptModal isOpen={isAcceptOpen} onSettled={() => { setIsAcceptOpen(false); }} />
    </>
  )
}
