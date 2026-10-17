"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface NewTaskSheetProps {
  onClose: () => void
  onSubmit: (title: string) => void
  title?: string
  placeholder?: string
  submitLabel?: string
  isPending?: boolean
  isDisabled?: boolean
  description?: string
  children?: React.ReactNode
}

export function NewTaskSheet({
  onClose,
  onSubmit,
  title = "New Task",
  placeholder = "What needs to be done?",
  submitLabel = "Add",
  isPending = false,
  isDisabled = false,
  description,
  children,
}: NewTaskSheetProps) {
  const [value, setValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const submit = () => {
    const taskTitle = value.trim()
    if (!taskTitle || isPending || isDisabled) return
    onSubmit(taskTitle)
    onClose()
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) { onClose() } }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-[2rem] border-0 bg-[#fffdfa] px-6 pt-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <SheetHeader className="p-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm tracking-[0.3em] uppercase font-normal text-muted-foreground/70">{title}</SheetTitle>
            <button type="button" onClick={onClose} className="text-muted-foreground/60 transition hover:text-foreground/80" aria-label="Close">
              <span className="text-2xl font-normal leading-none">×</span>
            </button>
          </div>
          {description && (
            <SheetDescription className="-mt-2 text-xs text-muted-foreground/70">{description}</SheetDescription>
          )}
        </SheetHeader>
        <div className="space-y-4 pb-8 pt-4">
          {children}
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={value}
            onChange={(event) => { setValue(event.target.value) }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder}
            disabled={isPending || isDisabled}
            className="w-full rounded-2xl border border-black/[0.06] bg-white/60 px-5 py-4 text-[15px] font-light text-foreground/90 shadow-sm transition-all placeholder:text-muted-foreground/40 focus:border-black/10 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black/10"
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} className="flex-1 rounded-full border border-black/[0.06] bg-white/80 text-foreground/70 shadow-sm hover:bg-white">
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!value.trim() || isPending || isDisabled}
              className="flex-1 rounded-full bg-foreground/90 text-white shadow-md hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
