"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type TaskItem = {
  id: string
  title: string
  done: boolean
}

interface SwipeableTodoItemProps {
  task: TaskItem
  onDelete: (taskId: string) => void
  onToggle: (taskId: string) => void
}

export function SwipeableTodoItem({ task, onDelete, onToggle }: SwipeableTodoItemProps) {
  const [translateX, setTranslateX] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [startX, setStartX] = React.useState(0)
  const maxTranslate = -48

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentX = e.touches[0].clientX
    const diffX = currentX - startX
    if (diffX > 0) {
      setTranslateX(0)
      return
    }
    const translate = Math.max(diffX, maxTranslate)
    setTranslateX(translate)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (translateX > maxTranslate / 2) {
      setTranslateX(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const currentX = e.clientX
    const diffX = currentX - startX
    if (diffX > 0) {
      setTranslateX(0)
      return
    }
    const translate = Math.max(diffX, maxTranslate)
    setTranslateX(translate)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (translateX > maxTranslate / 2) {
      setTranslateX(0)
    }
  }

  return (
    <div className="relative h-10 rounded-xl">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center pr-4 z-0"
        style={{ width: "48px" }}
      >
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 text-[#dc2626] transition-colors"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div
        className={cn(
          "absolute inset-0 bg-white rounded-xl transition-transform duration-200 ease-out touch-none cursor-pointer z-10",
          isDragging ? "duration-0" : ""
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => onToggle(task.id)}
      >
        <div className="flex items-center h-full pl-4 gap-3">
          <span
            className={cn(
              "h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-300",
              task.done ? "bg-black/[0.04] border-transparent" : "bg-white border-black/[0.08] shadow-sm"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full bg-foreground/60 transition-all duration-300",
              task.done ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )} />
          </span>
          <span className={cn(
            "text-[13px] font-light truncate",
            task.done ? "text-muted-foreground/50 line-through decoration-muted-foreground/30" : "text-foreground/90"
          )}>
            {task.title}
          </span>
        </div>
      </div>
    </div>
  )
}
