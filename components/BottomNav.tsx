"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sparkles, Calendar, BarChart2, Clock } from "lucide-react"

const tabs = [
  {
    href: "/",
    label: "Journal",
    icon: Sparkles,
  },
  {
    href: "/daily",
    label: "Daily",
    icon: Clock,
  },
  {
    href: "/history",
    label: "History",
    icon: Calendar,
  },
  {
    href: "/insights",
    label: "Insights",
    icon: BarChart2,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[25.5rem] -translate-x-1/2">
      {/* 液态玻璃胶囊：磨砂模糊 + 半透明白 + 高光描边 + 多层柔和投影 */}
      <nav
        className={cn(
          "relative overflow-hidden rounded-full",
          "border border-white/50 bg-white/55",
          "backdrop-blur-2xl backdrop-saturate-150",
          "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(0,0,0,0.08)]"
        )}
      >
        {/* 顶部高光，模拟玻璃表面反光 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/70 to-transparent"
        />

        <div className="relative flex items-stretch px-2 py-1.5">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2",
                  "transition-all duration-500 ease-out",
                  isActive
                    ? "-translate-y-0.5 bg-white/80 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
                    : "opacity-40 hover:opacity-70"
                )}
              >
                <Icon
                  className="w-5 h-5 text-foreground transition-transform duration-500 group-active:scale-90"
                  strokeWidth={1.2}
                />
                <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-foreground">
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
