export type TaskItem = {
  id: string
  title: string
  done: boolean
  is_pinned?: boolean
}

export type ServerTaskItem = {
  id: string
  title: string
  is_done: boolean
  is_pinned?: boolean
  completed_at: string | null
  created_at: string
}

export type TaskFilterKind = "all" | "pinned" | "normal" | "done"
