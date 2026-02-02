"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CoupleSpace } from "./space-switch"

export function SpaceSwitchDisplay({
  currentSpace,
  onSpaceChange,
}: {
  currentSpace: "personal" | "couple"
  spaces: CoupleSpace[]
  selectedSpaceId?: string | null
  onSpaceChange: (space: "personal" | "couple", coupleSpaceId?: string) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-12">
      <StatusBadge />
      <SpaceToggle currentSpace={currentSpace} onSpaceChange={onSpaceChange} />
    </div>
  )
}

function StatusBadge() {
  return (
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
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-60"
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400"
          )}
        />
      </span>
      <span className="text-[9px] font-medium text-stone-500 tracking-wider">
        CONNECTED
      </span>
    </button>
  )
}

function SpaceToggle({
  currentSpace,
  onSpaceChange,
}: {
  currentSpace: "personal" | "couple"
  onSpaceChange: (space: "personal" | "couple", coupleSpaceId?: string) => void
}) {
  return (
    <div
      className={cn(
        "flex-1 flex items-center gap-0.5 p-0.5 rounded-full",
        "bg-stone-100/50 backdrop-blur-sm",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
        "transition-all duration-300"
      )}
    >
      <button
        onClick={() => onSpaceChange("personal")}
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
        onClick={() => onSpaceChange("couple")}
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
  )
}
