export const toDateKey = (date: Date) => date.toLocaleDateString("en-CA")

export const startOfWeek = (date: Date) => {
  const target = new Date(date)
  const day = target.getDay()
  const diff = (day + 6) % 7
  target.setDate(target.getDate() - diff)
  target.setHours(0, 0, 0, 0)
  return target
}

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })

export const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" })

export const formatWeekday = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" })

export const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b)
