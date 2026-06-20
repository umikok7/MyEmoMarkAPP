"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Sparkles, BookOpen, AlertTriangle, PinOff, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PinnedCollection = "lesson" | "education" | "alert" | null

interface PinCollectionMenuProps {
  anchorRect: DOMRect
  currentCollection: PinnedCollection
  onSelect: (collection: PinnedCollection) => void
  onClose: () => void
}

interface MenuItem {
  collection: PinnedCollection
  label: string
  icon: React.ElementType
  iconColor: string
  hoverBg: string
  needsCurrentPinned: boolean
}

const ITEMS: MenuItem[] = [
  {
    collection: "lesson",
    label: "加入教训卡片合集",
    icon: Sparkles,
    iconColor: "text-amber-500",
    hoverBg: "hover:bg-amber-50/70",
    needsCurrentPinned: false,
  },
  {
    collection: "education",
    label: "加入教育卡片合集",
    icon: BookOpen,
    iconColor: "text-indigo-500",
    hoverBg: "hover:bg-indigo-50/70",
    needsCurrentPinned: false,
  },
  {
    collection: "alert",
    label: "加入警醒卡片合集",
    icon: AlertTriangle,
    iconColor: "text-rose-500",
    hoverBg: "hover:bg-rose-50/70",
    needsCurrentPinned: false,
  },
]

export function PinCollectionMenu({
  anchorRect,
  currentCollection,
  onSelect,
  onClose,
}: PinCollectionMenuProps) {
  const [mounted, setMounted] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  React.useEffect(() => {
    if (!mounted) return
    const MENU_WIDTH = 240
    const GAP = 8
    const margin = 8

    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    const anchorCenterX = anchorRect.left + anchorRect.width / 2
    let left = anchorCenterX - MENU_WIDTH / 2
    left = Math.max(margin, Math.min(left, viewportW - MENU_WIDTH - margin))

    let top = anchorRect.bottom + GAP
    const estimatedHeight = currentCollection ? 192 : 152
    if (top + estimatedHeight > viewportH - margin) {
      top = anchorRect.top - estimatedHeight - GAP
      if (top < margin) {
        top = Math.max(margin, viewportH - estimatedHeight - margin)
      }
    }

    setPos({ top, left })
  }, [mounted, anchorRect, currentCollection])

  React.useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-start"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bg-white rounded-2xl shadow-xl ring-1 ring-black/5",
          "p-1.5 min-w-[240px]",
          "animate-[fadeScale_0.18s_ease-out]",
        )}
        style={{ top: pos.top, left: pos.left }}
      >
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isCurrent = currentCollection === item.collection
          return (
            <button
              key={item.collection}
              type="button"
              onClick={() => onSelect(item.collection)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                "text-left text-sm font-medium text-foreground/80",
                "transition-colors duration-150 cursor-pointer",
                item.hoverBg,
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", item.iconColor)} strokeWidth={1.8} />
              <span className="flex-1">{item.label}</span>
              {isCurrent && <Check className="w-4 h-4 text-foreground/60 shrink-0" strokeWidth={2} />}
            </button>
          )
        })}

        {currentCollection !== null && (
          <>
            <div className="my-1 mx-2 h-px bg-border" />
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                "text-left text-sm font-medium text-muted-foreground/70",
                "transition-colors duration-150 cursor-pointer",
                "hover:bg-muted/60",
              )}
            >
              <PinOff className="w-4 h-4 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
              <span className="flex-1">取消置顶</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}