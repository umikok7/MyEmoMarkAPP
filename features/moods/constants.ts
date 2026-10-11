import { CloudSun, Leaf, Wind, Droplets, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type MoodType = "happy" | "calm" | "anxious" | "sad" | "angry"

export type MoodMeta = {
  id: MoodType
  label: string
  icon: LucideIcon
  dot: string
  gradient: string
  color: string
  bg: string
}

export const MOODS: MoodMeta[] = [
  { id: "happy", label: "Joy", icon: CloudSun, dot: "bg-rose-300", gradient: "from-[#fdecec]", color: "text-rose-400", bg: "bg-rose-50" },
  { id: "calm", label: "Calm", icon: Leaf, dot: "bg-teal-300", gradient: "from-[#ecf7f3]", color: "text-teal-500", bg: "bg-teal-50" },
  { id: "anxious", label: "Worry", icon: Wind, dot: "bg-amber-300", gradient: "from-[#fff6e8]", color: "text-amber-500", bg: "bg-amber-50" },
  { id: "sad", label: "Blue", icon: Droplets, dot: "bg-sky-300", gradient: "from-[#ecf5ff]", color: "text-blue-400", bg: "bg-blue-50" },
  { id: "angry", label: "Heat", icon: Zap, dot: "bg-red-300", gradient: "from-[#fff0f0]", color: "text-red-400", bg: "bg-red-50" },
]

export const getMoodMeta = (mood?: MoodType | null): MoodMeta | undefined =>
  MOODS.find((item) => item.id === mood)

export const getMoodEmoji = (mood: string): string => {
  const emojis: Record<string, string> = {
    happy: "☀️",
    calm: "🍃",
    anxious: "💨",
    sad: "💧",
    angry: "⚡",
  }
  return emojis[mood] ?? "💭"
}
