export type DailyBlock = {
  id: string
  user_id: string
  title: string
  note?: string
  task_date: string
  start_minute: number
  end_minute: number
  color_tag?: string | null
  created_at: string
  updated_at: string
}

export type TimeRange = {
  start: number
  end: number
}

export type TimeBlockColorKey = "peach" | "sun" | "lavender" | "sky"

export type TimeBlockColorTheme = {
  key: TimeBlockColorKey
  bg: string
  border: string
  text: string
}
