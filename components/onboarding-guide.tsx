"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { CloudSun, Leaf, Wind, Droplets, Pin, Trash2, Heart, Sparkles, ChevronRight } from "lucide-react"

const STORAGE_KEY = "onboarding-complete"

type FeatureItem = {
  icon: typeof CloudSun
  label: string
}

type Slide = {
  headline: string
  features?: FeatureItem[]
  svg?: string
}

const slides: Slide[] = [
  {
    headline: "随心记",
    features: [
      { icon: CloudSun, label: "记录心情" },
      { icon: Sparkles, label: "觉察当下" },
      { icon: Heart, label: "拥抱感受" },
    ],
    svg: "/undraw_dev-environment_n5by.svg",
  },
  {
    headline: "记录想法与代办",
    features: [
      { icon: Pin, label: "置顶任务" },
      { icon: Trash2, label: "删除待办" },
      { icon: CloudSun, label: "情绪追踪" },
    ],
    svg: "/undraw_idea_hz8b.svg",
  },
  {
    headline: "随时发布",
    features: [
      { icon: Leaf, label: "Calm 平静" },
      { icon: Wind, label: "Worry 忧虑" },
      { icon: Droplets, label: "Blue 忧郁" },
    ],
    svg: "/undraw_publish-post_7g2z.svg",
  },
  {
    headline: "即刻开启",
    svg: "/undraw_launch-event_aur1.svg",
  },
]

export function OnboardingGuide({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [animKey, setAnimKey] = React.useState(0)
  const touchStartX = React.useRef<number | null>(null)
  const touchEndX = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed && !isLoggedIn) {
      setIsOpen(true)
    }
  }, [isLoggedIn])

  const closeOnboarding = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true")
    }
    setIsOpen(false)
  }, [])

  const goToSlide = React.useCallback((index: number) => {
    if (index < 0 || index >= slides.length) return
    setIsExpanded(false)
    setCurrentIndex(index)
    setAnimKey((prev) => prev + 1)
  }, [])

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const half = rect.width / 2

    if (currentIndex === slides.length - 1) {
      return
    }

    if (x > half) {
      if (!isExpanded && slides[currentIndex].features) {
        setIsExpanded(true)
      } else {
        goToSlide(currentIndex + 1)
      }
    } else {
      if (isExpanded) {
        setIsExpanded(false)
      } else if (currentIndex > 0) {
        goToSlide(currentIndex - 1)
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        if (!isExpanded && slides[currentIndex].features) {
          setIsExpanded(true)
        } else {
          goToSlide(currentIndex + 1)
        }
      } else {
        if (isExpanded) {
          setIsExpanded(false)
        } else {
          goToSlide(currentIndex - 1)
        }
      }
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  if (!isOpen) return null

  const currentSlide = slides[currentIndex]
  const showFeatures = currentSlide.features && currentSlide.features.length > 0

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center px-6 py-8",
        "bg-[#faf9f7]/60 backdrop-blur-md"
      )}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style jsx>{`
        @keyframes pop-in {
          0% {
            transform: scale(0.8) translateY(10px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes pop-out {
          0% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          100% {
            transform: scale(0.9) translateY(5px);
            opacity: 0;
          }
        }
        .feature-pop {
          animation: pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .feature-pop-out {
          animation: pop-out 0.2s ease-out forwards;
        }
      `}</style>

      <div
        className={cn(
          "relative w-full max-w-[360px] h-[340px]",
          "bg-gradient-to-br from-white/70 via-white/50 to-white/60",
          "rounded-[1.5rem]",
          "border border-white/40",
          "shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15),0_0_1px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.8)]",
          "backdrop-blur-xl",
          "px-8 py-8",
          "select-none",
          "cursor-pointer",
          "before:absolute before:inset-0 before:rounded-[1.5rem] before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none"
        )}
      >
        <div className="text-center" key={animKey}>
          <h2
            className={cn(
              "mt-5 text-[24px] leading-[1.45] font-medium text-[#111111]",
              "font-serif"
            )}
            style={{ fontFamily: "Georgia, serif" }}
          >
            {currentSlide.headline}
          </h2>

          {currentIndex === slides.length - 1 ? (
            <div className="mt-6 flex justify-center">
              <div className="w-30 h-30 relative bg-white rounded-2xl">
                <Image
                  src={currentSlide.svg || ""}
                  alt="illustration"
                  fill
                  className="object-contain p-2"
                />
              </div>
            </div>
          ) : showFeatures && !isExpanded && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full animate-pulse">
                <div className="w-20 h-20 relative -ml-1">
                  <Image
                    src={currentSlide.svg || ""}
                    alt="tap"
                    fill
                    className="object-contain"
                  />
                </div>
                <ChevronRight className="w-5 h-5 text-[#555555] -mr-1" />
              </div>
            </div>
          )}

          {showFeatures && isExpanded && (
            <div
              className={cn(
                "flex flex-wrap justify-center gap-3 mt-6"
              )}
            >
              {currentSlide.features?.map((feature, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2",
                    "px-3 py-2",
                    "bg-white/60 backdrop-blur-sm",
                    "rounded-full",
                    "border border-white/50",
                    "shadow-sm",
                    isExpanded ? "feature-pop" : "feature-pop-out"
                  )}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <feature.icon className="w-4 h-4 text-[#555555]" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-[#555555]">
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-[2.5px] rounded-full transition-all duration-500",
                  index === currentIndex
                    ? "w-5 bg-[#000000]"
                    : "w-2.5 bg-[#bbbbbb]"
                )}
              />
            ))}
          </div>

          {currentIndex === slides.length - 1 ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeOnboarding()
              }}
              className={cn(
                "px-8 py-2.5",
                "bg-[#000000] text-white",
                "text-[12px] font-bold tracking-[0.1em]",
                "rounded-full",
                "transition-all duration-300",
                "hover:bg-[#000000]"
              )}
            >
              进入
            </button>
          ) : (
            <p className="text-[10px] font-medium tracking-[0.2em] text-[#888888]">
              {isExpanded ? "点击右侧继续" : "点击探索更多"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
