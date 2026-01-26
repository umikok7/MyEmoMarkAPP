"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "awesome-onboarding-complete"

type Spotlight = {
  top: number
  left: number
  size: number
}

type OnboardingGuideProps = {
  targetRef: React.RefObject<HTMLElement | null>
  isLoggedIn: boolean
}

export function OnboardingGuide({ targetRef, isLoggedIn }: OnboardingGuideProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [spotlight, setSpotlight] = React.useState<Spotlight | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const completed = window.localStorage.getItem(STORAGE_KEY)
    if (!completed && !isLoggedIn) {
      setIsOpen(true)
      setStep(1)
    }
  }, [isLoggedIn])

  const closeGuide = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true")
    }
    setIsOpen(false)
  }, [])

  const updateSpotlight = React.useCallback(() => {
    if (!targetRef.current) return
    const rect = targetRef.current.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) + 28
    setSpotlight({
      top: rect.top + rect.height / 2 - size / 2,
      left: rect.left + rect.width / 2 - size / 2,
      size,
    })
  }, [targetRef])

  React.useLayoutEffect(() => {
    if (!isOpen || step !== 2) return
    updateSpotlight()
    window.addEventListener("resize", updateSpotlight)
    window.addEventListener("scroll", updateSpotlight, true)
    return () => {
      window.removeEventListener("resize", updateSpotlight)
      window.removeEventListener("scroll", updateSpotlight, true)
    }
  }, [isOpen, step, updateSpotlight])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity duration-500",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={closeGuide}
        aria-hidden
      />

      {step === 2 && spotlight ? (
        <div
          className="absolute rounded-full ring-1 ring-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-all duration-500"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.size,
            height: spotlight.size,
          }}
          aria-hidden
        />
      ) : null}

      {step === 2 && spotlight ? (
        <div
          className="absolute flex items-center gap-2 text-xs text-white/90"
          style={{
            top: Math.max(spotlight.top - 28, 16),
            left: spotlight.left + spotlight.size - 10,
          }}
        >
          <ArrowUpRight className="h-4 w-4 text-white/80" strokeWidth={1.2} />
          <span className="tracking-[0.2em] uppercase">Login / Register</span>
        </div>
      ) : null}

      <div className="relative w-full max-w-md px-6 pb-12">
        <div
          className={cn(
            "relative w-full rounded-[2.5rem] bg-[#fffdfa] border border-black/[0.04] shadow-[0_25px_60px_-40px_rgba(0,0,0,0.25)] px-8 py-10 transition-all duration-500",
            step === 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-95"
          )}
        >
          <button
            onClick={closeGuide}
            className="absolute right-6 top-6 rounded-full p-1 text-muted-foreground/60 transition hover:text-foreground/70"
            aria-label="Dismiss onboarding"
          >
            <X className="h-4 w-4" strokeWidth={1.3} />
          </button>

          {step === 1 ? (
            <div className="space-y-5">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground/60 uppercase">
                Welcome
              </p>
              <h2 className="text-2xl font-light text-foreground">
                A gentle space for mood tracking and healing reflection.
              </h2>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                Capture your feelings, notice patterns, and give yourself a soft place to breathe.
              </p>
              <Button
                className="w-full rounded-full bg-[#1f1f1f]/90 text-white hover:bg-[#1f1f1f]"
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground/60 uppercase">
                Next step
              </p>
              <h2 className="text-2xl font-light text-foreground">
                Tap the top-right button to log in or create your journal.
              </h2>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                Your entries stay with you across devices once you sign in.
              </p>
              <Button
                className="w-full rounded-full bg-[#1f1f1f]/90 text-white hover:bg-[#1f1f1f]"
                onClick={closeGuide}
              >
                Got it
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
