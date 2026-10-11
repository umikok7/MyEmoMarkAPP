"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Heart, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type AnniversaryItem = {
  date: string
  title: string
  subtitle: string
  description: string
}

const formatAnniversaryDate = (dateString: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateString}T00:00:00`))

interface AnniversaryModalProps {
  anniversary: AnniversaryItem | null
  onClose: () => void
}

export function AnniversaryModal({ anniversary, onClose }: AnniversaryModalProps) {
  React.useEffect(() => {
    if (!anniversary) {return}

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {onClose()}
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [anniversary, onClose])

  if (!anniversary) {return null}

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5 py-10"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#6f5158]/15 backdrop-blur-md" />

      <div
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-[32px]",
          "bg-gradient-to-br from-[#fffdfa] via-[#fff7f2] to-[#fbe8e3]",
          "border border-white/70 shadow-[0_28px_80px_-28px_rgba(98,56,63,0.5)]",
          "px-6 pb-6 pt-7 animate-[fade-scale_0.24s_ease-out]"
        )}
        onClick={(event) => { event.stopPropagation(); }}
      >
        <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[#ffd9d2]/35 blur-2xl" />
        <div className="absolute right-5 top-5 z-20">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onClose()
            }}
            aria-label="关闭纪念日详情"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/75 text-[#9d6d75] shadow-sm transition-colors hover:bg-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#b57984] shadow-sm">
            <Heart className="h-3.5 w-3.5 fill-current" />
            纪念日
          </div>

          <div className="mt-5 rounded-[28px] bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white/70">
            <p className="text-xs tracking-[0.2em] text-[#c1979d]">
              {formatAnniversaryDate(anniversary.date)}
            </p>
            <h3 className="mt-3 text-[28px] leading-[1.15] text-[#7d4a53]" style={{ fontFamily: "Georgia, serif" }}>
              {anniversary.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#9f737a]">{anniversary.subtitle}</p>
            <div className="mt-5 h-px bg-gradient-to-r from-transparent via-[#e9cfc9] to-transparent" />
            <p className="mt-5 text-sm leading-7 text-[#6b5a5e]">{anniversary.description}</p>
          </div>

          <div className="mt-4 flex items-center justify-between px-1 text-[11px] tracking-[0.18em] text-[#b79097]">
            <span>have a nice day!</span>
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
