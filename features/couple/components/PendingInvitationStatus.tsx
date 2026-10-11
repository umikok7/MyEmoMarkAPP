"use client"

import { Clock, Heart } from "lucide-react"
import { SurfaceCard } from "@/components/ui/surface-card"

interface PendingInvitationStatusProps {
  spaceName?: string | null
  partnerName?: string
  onCancel?: () => void
}

export function PendingInvitationStatus({
  spaceName,
  partnerName,
  onCancel,
}: PendingInvitationStatusProps) {
  return (
    <SurfaceCard variant="muted" className="p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
          <Clock className="w-5 h-5 text-stone-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-stone-700">
            Waiting for {partnerName || "partner"}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {spaceName || "Our Space"} invitation sent
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-medium text-amber-600">Pending</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-stone-100">
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <Heart className="w-3.5 h-3.5" />
          <span>They&apos;ll need to accept to share moods together</span>
        </div>
      </div>

      {onCancel && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onCancel}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          >
            Cancel invitation
          </button>
        </div>
      )}
    </SurfaceCard>
  )
}
