"use client"

import { cn } from "@/lib/utils"

interface AuthorBadgeProps {
  isMine: boolean
  className?: string
}

export function AuthorBadge({ isMine, className }: AuthorBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide",
        isMine
          ? "bg-stone-100 text-stone-600"
          : "bg-rose-50 text-rose-500",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isMine ? "bg-stone-400" : "bg-rose-400"
        )}
      />
      {isMine ? "我" : "TA"}
    </span>
  )
}
