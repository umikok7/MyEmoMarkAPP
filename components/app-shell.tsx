"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { Toaster } from "@/components/ui/sonner"

const HIDE_NAV_PATHS = ["/login", "/register"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = HIDE_NAV_PATHS.some((path) => pathname === path)

  return (
    <div className={hideNav ? "" : "pb-20"}>
      {children}
      {!hideNav && <BottomNav />}
      <Toaster />
    </div>
  )
}
