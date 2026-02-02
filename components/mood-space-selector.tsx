"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { User, HeartHandshake } from "lucide-react"
import { buildApiUrl } from "@/lib/api"

interface CoupleSpace {
  id: string
  space_name: string | null
  status: string
}

interface MoodSpaceSelectorProps {
  selectedSpace: "personal" | "couple"
  coupleSpaces: CoupleSpace[]
  selectedCoupleSpaceId: string | null
  onSpaceChange: (space: "personal" | "couple", coupleSpaceId?: string) => void
  disabled?: boolean
}

export function MoodSpaceSelector({
  selectedSpace,
  coupleSpaces,
  onSpaceChange,
  disabled,
}: MoodSpaceSelectorProps) {
  const hasAcceptedCoupleSpace = coupleSpaces.length > 0

  if (!hasAcceptedCoupleSpace) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-stone-50 border border-stone-100">
        <User className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-xs text-stone-500 font-medium tracking-wide">Personal</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-full bg-stone-50/80 backdrop-blur-sm border border-stone-100/50",
        disabled && "opacity-50"
      )}
    >
      <button
        onClick={() => onSpaceChange("personal")}
        disabled={disabled}
        className={cn(
          "relative z-10 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300",
          selectedSpace === "personal"
            ? "text-stone-700"
            : "text-stone-400 hover:text-stone-500",
          disabled && "cursor-not-allowed"
        )}
      >
        <span className="flex items-center gap-1.5">
          <User className="w-3 h-3" />
          Personal
        </span>
        {selectedSpace === "personal" && (
          <span className="absolute inset-0 rounded-full bg-white shadow-sm" />
        )}
      </button>

      <button
        onClick={() => onSpaceChange("couple", coupleSpaces[0]?.id)}
        disabled={disabled}
        className={cn(
          "relative z-10 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300",
          selectedSpace === "couple"
            ? "text-stone-700"
            : "text-stone-400 hover:text-stone-500",
          disabled && "cursor-not-allowed"
        )}
      >
        <span className="flex items-center gap-1.5">
          <HeartHandshake className="w-3 h-3" />
          Our Space
        </span>
        {selectedSpace === "couple" && (
          <span className="absolute inset-0 rounded-full bg-white shadow-sm" />
        )}
      </button>
    </div>
  )
}

export function useMoodSpaceSelector() {
  const [selectedSpace, setSelectedSpace] = React.useState<"personal" | "couple">("personal")
  const [selectedCoupleSpaceId, setSelectedCoupleSpaceId] = React.useState<string | null>(null)
  const [coupleSpaces, setCoupleSpaces] = React.useState<CoupleSpace[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const res = await fetch(buildApiUrl("/couple-spaces"), { credentials: "include" })
        if (!res.ok) return
        const json = await res.json()
        const acceptedSpaces = ((json?.data?.items || []) as CoupleSpace[]).filter(
          (s) => s.status === "accepted"
        )
        setCoupleSpaces(acceptedSpaces)
        if (acceptedSpaces.length > 0) {
          setSelectedCoupleSpaceId(acceptedSpaces[0].id)
        }
      } catch (error) {
        console.error("Failed to fetch couple spaces:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSpaces()
  }, [])

  const handleSpaceChange = React.useCallback((space: "personal" | "couple", coupleSpaceId?: string) => {
    setSelectedSpace(space)
    if (space === "couple" && coupleSpaceId) {
      setSelectedCoupleSpaceId(coupleSpaceId)
    }
  }, [])

  const resetToPersonal = React.useCallback(() => {
    setSelectedSpace("personal")
  }, [])

  return {
    selectedSpace,
    selectedCoupleSpaceId,
    coupleSpaces,
    loading,
    handleSpaceChange,
    resetToPersonal,
  }
}
