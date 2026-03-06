"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Mail, Heart, X } from "lucide-react"

type LikeNotification = {
  id: string
  likerName: string
  likerAvatar?: string
  moodNote: string
  moodType: string
  likedAt: string
}

interface LikeNotificationsProps {
  notifications: LikeNotification[]
  hasUnread: boolean
  onOpen?: () => void
  onClose?: () => void
}

export function LikeNotifications({
  notifications,
  hasUnread,
  onOpen,
  onClose,
}: LikeNotificationsProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleOpen = () => {
    setIsOpen(true)
    onOpen?.()
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
  }

  const getMoodEmoji = (moodType: string) => {
    const moods: Record<string, string> = {
      happy: "☀️",
      calm: "🍃",
      anxious: "💨",
      sad: "💧",
      angry: "⚡",
    }
    return moods[moodType] || "💭"
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-black/5 transition-colors duration-200 cursor-pointer"
      >
        <Mail className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={handleClose}
            />
            <div className="absolute bottom-24 left-4 right-4 max-w-sm mx-auto animate-[fadeUp_0.3s_ease-out]">
              <div className="bg-[#fdfbf7] rounded-3xl shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400" strokeWidth={2} />
                    <span className="text-sm font-semibold text-foreground/85">
                      点赞通知
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground/60">
                        还没有人点赞
                      </p>
                      <p className="text-xs text-muted-foreground/40 mt-1">
                        当有人点赞你的情绪卡片时会显示在这里
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/[0.04]">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="px-5 py-4 hover:bg-black/[0.02] transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                              <span className="text-sm">{getMoodEmoji(notification.moodType)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                <span className="font-semibold">{notification.likerName}</span> 赞了你的情绪
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-1 truncate">
                                &ldquo;{notification.moodNote}&rdquo;
                              </p>
                              <p className="text-[11px] text-muted-foreground/40 mt-1.5">
                                {formatTime(notification.likedAt)}
                              </p>
                            </div>
                            <Heart className="w-3.5 h-3.5 text-rose-400/50 shrink-0 mt-1" fill="currentColor" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
