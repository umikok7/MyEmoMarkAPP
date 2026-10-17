"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatMinuteLabel } from "../utils"
import type { TimeRange } from "../types"

interface BlockEditorSheetProps {
  range: TimeRange
  title: string
  note: string
  editingBlockId: string | null
  isSaving: boolean
  onTitleChange: (title: string) => void
  onNoteChange: (note: string) => void
  onClose: () => void
  onDelete: () => void
  onSubmit: () => void
}

export function BlockEditorSheet({
  range,
  title,
  note,
  editingBlockId,
  isSaving,
  onTitleChange,
  onNoteChange,
  onClose,
  onDelete,
  onSubmit,
}: BlockEditorSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => { if (!open) { onClose() } }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-3xl border-0 bg-white px-6 py-5 shadow-[0_-10px_30px_rgba(0,0,0,0.15)]"
      >
        <SheetHeader className="p-0">
          <SheetTitle>
            <span className="block text-xs text-stone-400 uppercase tracking-[0.3em]">
              {editingBlockId ? "编辑计划" : "新计划"}
            </span>
            <span className="mt-1 block text-lg font-semibold text-stone-800">
              {formatMinuteLabel(range.start)} - {formatMinuteLabel(range.end)}
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            {editingBlockId ? "编辑这个时间计划" : "创建一个新的时间计划"}
          </SheetDescription>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-6 text-xs text-stone-400 hover:text-stone-600 transition"
          >
            关闭
          </button>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <Input
            value={title}
            onChange={(event) => { onTitleChange(event.target.value); }}
            placeholder="写下你的计划..."
          />
          <Textarea
            value={note}
            onChange={(event) => { onNoteChange(event.target.value); }}
            placeholder="备注"
            className="min-h-[90px]"
          />
          <div className="flex gap-2">
            {editingBlockId ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1 rounded-full"
                onClick={onDelete}
                disabled={isSaving}
              >
                {isSaving ? "删除中..." : "删除"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-full"
                onClick={onClose}
                disabled={isSaving}
              >
                取消
              </Button>
            )}
            <Button
              type="button"
              className="flex-1 rounded-full bg-foreground text-white hover:bg-foreground/90"
              onClick={onSubmit}
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : editingBlockId ? "修改" : "保存"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
