"use client"

import * as React from "react"
import { Heart, HeartHandshake } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  space: "personal" | "couple"
  className?: string
}

export function EmptyState({ space, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 px-6", className)}>
      <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-6">
        {space === "personal" ? (
          <Heart className="w-8 h-8 text-stone-300" />
        ) : (
          <HeartHandshake className="w-8 h-8 text-rose-200" />
        )}
      </div>
      <h3 className="text-lg font-medium text-stone-600 mb-2">
        {space === "personal" ? "记录你的第一份心情" : "共同的旅程即将开始"}
      </h3>
      <p className="text-sm text-stone-400 text-center leading-relaxed whitespace-pre-line">
        {space === "personal"
          ? "在这里记录每天的情绪变化\n关注自己的内心世界"
          : "当你们都分享了情绪后\n这里将绽放你们的共同记忆"}
      </p>
    </div>
  )
}
