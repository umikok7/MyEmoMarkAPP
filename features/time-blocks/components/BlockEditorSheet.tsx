"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center bg-black/20">
      <div className="w-full max-w-md rounded-t-3xl bg-white px-6 py-5 shadow-[0_-10px_30px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-[0.3em]">
              {editingBlockId ? "编辑计划" : "新计划"}
            </p>
            <h3 className="text-lg font-semibold text-stone-800 mt-1">
              {formatMinuteLabel(range.start)} - {formatMinuteLabel(range.end)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-stone-600 transition"
          >
            关闭
          </button>
        </div>

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
      </div>
    </div>
  )
}
