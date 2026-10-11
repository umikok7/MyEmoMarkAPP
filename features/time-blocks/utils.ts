import type { TimeBlockColorTheme } from "./types"

export const DAY_START_MINUTES = 5 * 60
export const DAY_END_MINUTES = 25 * 60
export const SLOT_MINUTES = 30
export const HOUR_HEIGHT = 64

export const BLOCK_COLOR_THEMES: TimeBlockColorTheme[] = [
  { key: "peach", bg: "bg-[#fde8dd]", border: "border-[#f5c8b6]", text: "text-[#9b4a39]" },
  { key: "sun", bg: "bg-[#f7efd7]", border: "border-[#e5d7aa]", text: "text-[#8a6a2a]" },
  { key: "lavender", bg: "bg-[#ece7f6]", border: "border-[#d6c9ef]", text: "text-[#5a4c83]" },
  { key: "sky", bg: "bg-[#e5f0f6]", border: "border-[#c8dce8]", text: "text-[#3a667d]" },
]

export const getBlockColorTheme = (index: number) =>
  BLOCK_COLOR_THEMES[index % BLOCK_COLOR_THEMES.length]

export const formatMinuteLabel = (minutes: number): string => {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export const clampMinute = (value: number): number =>
  Math.min(Math.max(value, DAY_START_MINUTES), DAY_END_MINUTES)

export const snapMinute = (value: number): number =>
  Math.round(value / SLOT_MINUTES) * SLOT_MINUTES

export const normalizeTimeRange = (start: number, end: number) => {
  const [low, high] = start <= end ? [start, end] : [end, start]
  if (high - low < SLOT_MINUTES) {
    return { start: low, end: Math.min(low + SLOT_MINUTES, DAY_END_MINUTES) }
  }
  return { start: low, end: high }
}

export const hasTimeConflict = (
  blocks: Array<{ start_minute: number; end_minute: number }>,
  range: { start: number; end: number }
): boolean =>
  blocks.some(
    (block) =>
      Math.max(block.start_minute, range.start) < Math.min(block.end_minute, range.end)
  )
