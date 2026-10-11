"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Sparkles, BookOpen, AlertTriangle, PinOff, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/surface-card"
import type { PinnedCollection } from "../types"

interface PinCollectionMenuProps {
  anchorRect: DOMRect
  currentCollection: PinnedCollection
  onSelect: (collection: PinnedCollection) => void
  onClose: () => void
}

interface MenuItem {
  collection: Exclude<PinnedCollection, null>
  label: string
  icon: React.ElementType
  iconColor: string
  hoverBg: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    collection: "lesson",
    label: "加入教训卡片合集",
    icon: Sparkles,
    iconColor: "text-amber-500",
    hoverBg: "hover:bg-amber-50/70",
  },
  {
    collection: "education",
    label: "加入教育卡片合集",
    icon: BookOpen,
    iconColor: "text-indigo-500",
    hoverBg: "hover:bg-indigo-50/70",
  },
  {
    collection: "alert",
    label: "加入警醒卡片合集",
    icon: AlertTriangle,
    iconColor: "text-rose-500",
    hoverBg: "hover:bg-rose-50/70",
  },
]

const MENU_WIDTH = 240
const MENU_GAP = 8
const VIEWPORT_MARGIN = 8

export function PinCollectionMenu({
  anchorRect,
  currentCollection,
  onSelect,
  onClose,
}: PinCollectionMenuProps) {
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {onClose()}
    }
    document.addEventListener("keydown", onKeyDown)
    return () => { document.removeEventListener("keydown", onKeyDown); }
  }, [onClose])

  React.useEffect(() => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const anchorCenterX = anchorRect.left + anchorRect.width / 2
    let left = anchorCenterX - MENU_WIDTH / 2
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - MENU_WIDTH - VIEWPORT_MARGIN))

    let top = anchorRect.bottom + MENU_GAP
    const estimatedHeight = currentCollection ? 192 : 152
    if (top + estimatedHeight > viewportHeight - VIEWPORT_MARGIN) {
      top = anchorRect.top - estimatedHeight - MENU_GAP
      if (top < VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, viewportHeight - estimatedHeight - VIEWPORT_MARGIN)
      }
    }
    setPosition({ top, left })
  }, [anchorRect, currentCollection])

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <SurfaceCard
        variant="solid"
        onClick={(event) => { event.stopPropagation(); }}
        className="absolute p-1.5 min-w-[160px] animate-[fade-scale_0.18s_ease-out]"
        style={{ top: position.top, left: position.left }}
      >
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const isCurrent = currentCollection === item.collection
          return (
            <button
              key={item.collection}
              type="button"
              onClick={() => { onSelect(item.collection); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                "text-left text-sm font-medium text-foreground/80",
                "transition-colors duration-150 cursor-pointer",
                item.hoverBg
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
            <div className="my-1 mx-2 h-px bg-stone-200" />
            <button
              type="button"
              onClick={() => { onSelect(null); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-muted-foreground/70 transition-colors duration-150 cursor-pointer hover:bg-stone-100/60"
            >
              <PinOff className="w-4 h-4 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
              <span className="flex-1">取消置顶</span>
            </button>
          </>
        )}
      </SurfaceCard>
    </div>,
    document.body
  )
}
