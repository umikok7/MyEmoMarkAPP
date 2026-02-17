"use client"

import * as React from "react"
import { Trash2, Pin } from "lucide-react"
import { cn } from "@/lib/utils"

type TaskItem = {
  id: string
  title: string
  done: boolean
  is_pinned?: boolean
}

interface SwipeableTodoItemProps {
  task: TaskItem
  onDelete: (taskId: string) => void
  onToggle: (taskId: string) => void
  onPin?: (taskId: string) => void
}

export function SwipeableTodoItem({ task, onDelete, onToggle, onPin }: SwipeableTodoItemProps) {
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
    <div className="relative h-9 rounded-lg group">
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 flex items-center pr-3 z-0 transition-opacity duration-200",
          translateX < -10 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: "36px" }}
      >
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-red-50 text-red-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div
        className={cn(
          "absolute inset-0 rounded-lg transition-transform duration-200 ease-out touch-none cursor-pointer z-10",
          task.is_pinned && "bg-amber-50/50",
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
        <div className="flex items-center h-full pl-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPin?.(task.id)
            }}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mr-3",
              task.is_pinned 
                ? "border-amber-400 bg-amber-100 text-amber-500" 
                : task.done
                  ? "border-black/[0.1] bg-black/[0.04]"
                  : "border-black/[0.15] bg-white hover:border-amber-300"
            )}
          >
            {task.is_pinned && <Pin className="h-2.5 w-2.5" strokeWidth={2.5} />}
            {!task.is_pinned && task.done && <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />}
          </button>
          <span className={cn(
            "text-[13px] font-light truncate flex-1",
            task.is_pinned && "text-amber-800/70",
            task.done ? "text-muted-foreground/50 line-through decoration-muted-foreground/30" : "text-foreground/90"
          )}>
            {task.title}
          </span>
        </div>
      </div>
    </div>
  )
}
