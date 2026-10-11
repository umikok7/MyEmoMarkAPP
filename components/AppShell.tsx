"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/BottomNav"
import { Toaster } from "@/components/ui/sonner"

const HIDE_NAV_PATHS = ["/login", "/register"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = HIDE_NAV_PATHS.some((path) => pathname === path)

  return (
    <div
      className={`${hideNav ? "" : "pb-[calc(6.75rem+env(safe-area-inset-bottom))]"} safe-area-root`}
    >
      {children}
      {!hideNav && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[calc(8rem+env(safe-area-inset-bottom))] backdrop-blur-md [mask-image:linear-gradient(to_top,black_15%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_15%,transparent_100%)]"
          />
          <BottomNav />
        </>
      )}
      <Toaster />
    </div>
  )
}
