"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sparkles, Calendar, BarChart2 } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    {
      href: "/",
      label: "Journal",
      icon: Sparkles,
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#fffdfa]/95 backdrop-blur-md border-t border-black/[0.03]">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around safe-area-bottom">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-500 ease-out",
                isActive ? "-translate-y-1" : "translate-y-0 opacity-40 hover:opacity-60"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors duration-500",
                  isActive ? "text-foreground" : "text-foreground"
                )}
                strokeWidth={1.2}
              />
              <span
                className={cn(
                  "text-[9px] font-medium tracking-[0.15em] uppercase transition-colors duration-500",
                  isActive ? "text-foreground" : "text-foreground"
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
