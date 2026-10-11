"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type ModuleCardColorScheme = "tasks" | "mood"

interface ModuleCardProps {
  title: string
  icon: React.ReactNode
  summary: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  colorScheme?: ModuleCardColorScheme
  children: React.ReactNode
}

const COLOR_SCHEMES: Record<ModuleCardColorScheme, { bg: string; iconBg: string; iconColor: string }> = {
  tasks: { bg: "bg-[#fdfcfa]", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  mood: { bg: "bg-[#f8f6f9]", iconBg: "bg-rose-100", iconColor: "text-rose-600" },
}

export function ModuleCard({
  title,
  icon,
  summary,
  isExpanded,
  onToggle,
  colorScheme = "tasks",
  children,
}: ModuleCardProps) {
  const colors = COLOR_SCHEMES[colorScheme]

  return (
    <div
      className={cn(
        "rounded-3xl overflow-hidden transition-all duration-300 ease-out border border-black/[0.03]",
        colors.bg,
        isExpanded ? "shadow-lg shadow-black/5" : "hover:shadow-md hover:shadow-black/[0.03]"
      )}
    >
      <div className="px-4 py-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              colors.iconBg,
              colors.iconColor
            )}
          >
            {icon}
          </div>
          <div className="text-left pt-0.5">
            <h3 className="text-[14px] font-semibold text-foreground/90">{title}</h3>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 mt-1 cursor-pointer",
            isExpanded ? "bg-black/[0.06]" : "bg-white/70"
          )}
          aria-expanded={isExpanded}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 text-foreground/50 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>

      <div className="px-4 pb-4">{summary}</div>

      <div
        className={cn(
          "transition-all duration-300 ease-out overflow-hidden",
          isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 pt-2 border-t border-black/[0.04]">{children}</div>
      </div>
    </div>
  )
}
