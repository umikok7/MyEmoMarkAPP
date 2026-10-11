"use client"

import { cn } from "@/lib/utils"
import type { CoupleSpace, SpaceKind } from "../types"

interface SpaceSwitchDisplayProps {
  currentSpace: SpaceKind
  spaces: CoupleSpace[]
  selectedSpaceId?: string | null
  onSpaceChange: (space: SpaceKind, coupleSpaceId?: string) => void
  className?: string
}

export function SpaceSwitchDisplay({
  currentSpace,
  selectedSpaceId,
  onSpaceChange,
  className,
}: SpaceSwitchDisplayProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        disabled
        className={cn(
          "group flex items-center gap-1.5 px-3 py-2 rounded-full",
          "bg-white/60 backdrop-blur-md border border-white/40",
          "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
          "transition-all duration-300 cursor-default"
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400" />
        </span>
        <span className="text-[9px] font-medium text-stone-500 tracking-wider">CONNECTED</span>
      </button>

      <div
        className={cn(
          "flex-1 flex items-center gap-0.5 p-0.5 rounded-full",
          "bg-stone-100/50 backdrop-blur-sm",
          "shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
          "transition-all duration-300"
        )}
      >
        <button
          onClick={() => { onSpaceChange("personal"); }}
          className={cn(
            "flex-1 flex items-center justify-center py-1.5 px-2 rounded-full",
            "text-[9px] font-medium tracking-wider transition-all duration-300",
            currentSpace === "personal"
              ? "bg-white text-stone-700 shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
              : "text-stone-400 hover:text-stone-500"
          )}
        >
          Personal
        </button>

        <button
          onClick={() => { onSpaceChange("couple", selectedSpaceId ?? undefined); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-full",
            "text-[9px] font-medium tracking-wider transition-all duration-300",
            currentSpace === "couple"
              ? "bg-white text-stone-700 shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
              : "text-stone-400 hover:text-stone-500"
          )}
        >
          <span
            className={cn(
              "w-1 h-1 rounded-full transition-colors duration-300",
              currentSpace === "couple" ? "bg-rose-400" : "bg-stone-300"
            )}
          />
          <span>Our Space</span>
        </button>
      </div>
    </div>
  )
}
