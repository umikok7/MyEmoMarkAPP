"use client"

import * as React from "react"
import Link from "next/link"
import { CloudSun, ListTodo, Pin, Plus, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildApiUrl } from "@/lib/api"
import { formatDateLabel } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DayStrip } from "@/components/DayStrip"
import { ModuleCard } from "@/components/ModuleCard"
import { OnboardingGuide } from "@/components/OnboardingGuide"
import { useAuthStore } from "@/store/use-auth-store"
import { MoodSpaceSelector, useCoupleSpaces, useSpaceStore } from "@/features/couple"
import { MOODS, getMoodMeta, useSaveMood, type MoodType } from "@/features/moods"
import {
  SwipeableTodoItem,
  useDayTasks,
  useTaskMutations,
  type TaskFilterKind,
  type TaskItem,
} from "@/features/tasks"
import { useLogout } from "@/features/auth"

const LAST_CLEANUP_KEY = "lastCleanupDate"

const TasksSummaryPanel = ({
  pinnedCount,
  normalCount,
  doneCount,
  totalCount,
  progressPercent,
  onSelectFilter,
}: {
  pinnedCount: number
  normalCount: number
  doneCount: number
  totalCount: number
  progressPercent: number
  onSelectFilter: (filter: TaskFilterKind) => void
}) => (
  <div className="mt-2 rounded-2xl p-4">
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => { onSelectFilter("all"); }}
        className="col-span-2 bg-stone-100 rounded-xl p-4 text-left hover:bg-stone-200 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">全部待办</p>
            <p className="text-5xl font-bold text-stone-800 mt-1">{totalCount}</p>
          </div>
          <div className="w-14 h-14 bg-stone-200 rounded-xl flex items-center justify-center">
            <ListTodo className="w-7 h-7 text-stone-600" />
          </div>
        </div>
      </button>

      <button
        onClick={() => { onSelectFilter("pinned"); }}
        className="bg-amber-50 rounded-xl p-3 text-left hover:bg-amber-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <Pin className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">置顶</span>
        </div>
        <p className="text-3xl font-bold text-stone-800">{pinnedCount}</p>
      </button>

      <button
        onClick={() => { onSelectFilter("normal"); }}
        className="bg-stone-100 rounded-xl p-3 text-left hover:bg-stone-200 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">未置顶</span>
        </div>
        <p className="text-3xl font-bold text-stone-800">{normalCount}</p>
      </button>

      <button
        onClick={() => { onSelectFilter("done"); }}
        className="bg-green-50 rounded-xl p-3 text-left hover:bg-green-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">已完成</span>
        </div>
        <p className="text-3xl font-bold text-stone-800">{doneCount}</p>
      </button>

      <div className="col-span-2  rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">进度条</span>
          <span className="text-sm font-bold text-stone-700">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-700 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  </div>
)

const MoodSummaryPanel = ({ selectedMood }: { selectedMood: MoodType | null }) => (
  <div className="mt-2  rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {MOODS.slice(0, 4).map((mood) => (
            <div
              key={mood.id}
              className="w-8 h-8 rounded-full bg-stone-50 border-2 border-white flex items-center justify-center"
            >
              <mood.icon className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
            </div>
          ))}
        </div>
        <p className="text-xs font-medium text-stone-400">week</p>
      </div>
      <div className="h-6 w-px bg-stone-200" />
      <div className="text-right">
        {selectedMood ? (
          <div className="flex items-center gap-2 justify-end">
            {(() => {
              const meta = getMoodMeta(selectedMood)
              const Icon = meta?.icon
              return Icon ? <Icon className="w-5 h-5 text-stone-600" strokeWidth={1.5} /> : null
            })()}
            <p className="text-lg font-semibold text-stone-700">{getMoodMeta(selectedMood)?.label}</p>
          </div>
        ) : (
          <p className="text-lg font-semibold text-stone-400">—</p>
        )}
      </div>
    </div>
  </div>
)

export default function HomePage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [selectedMood, setSelectedMood] = React.useState<MoodType | null>(null)
  const [note, setNote] = React.useState("")
  const [isNoteOpen, setIsNoteOpen] = React.useState(false)
  const [isSavingComplete, setIsSavingComplete] = React.useState(false)
  const [isTasksExpanded, setIsTasksExpanded] = React.useState(false)
  const [isMoodExpanded, setIsMoodExpanded] = React.useState(false)
  const [tasksFilter, setTasksFilter] = React.useState<TaskFilterKind | null>(null)
  const [isAddTaskOpen, setIsAddTaskOpen] = React.useState(false)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const noteOpenBeforeMoodRef = React.useRef(false)
  const addTaskInputRef = React.useRef<HTMLInputElement | null>(null)

  const { userId, isLoggedIn } = useAuthStore()
  const { space, coupleSpaceId, setSpace } = useSpaceStore()
  const logout = useLogout()

  const { tasks, pinnedTasks, isLoading: isDayLoading } = useDayTasks(selectedDate, userId)
  const { addTask, toggleTask, togglePin, removeTask } = useTaskMutations(selectedDate, userId)
  const saveMood = useSaveMood()
  const isSaving = saveMood.isPending

  const { acceptedSpaces } = useCoupleSpaces({ enabled: isLoggedIn })

  // 每天一次的过期数据清理
  React.useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem(LAST_CLEANUP_KEY) === today) {return}

    fetch(buildApiUrl("/cleanup"), { method: "POST", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => undefined)
      .finally(() => { localStorage.setItem(LAST_CLEANUP_KEY, today); })
  }, [])

  React.useEffect(() => {
    if (isAddTaskOpen && addTaskInputRef.current) {
      window.setTimeout(() => { addTaskInputRef.current?.focus(); }, 100)
    }
  }, [isAddTaskOpen])

  const handleSaveMood = () => {
    if (!selectedMood || isSaving) {return}
    saveMood.mutate(
      { moodType: selectedMood, note },
      {
        onSuccess: () => {
          setIsSavingComplete(true)
          window.setTimeout(() => {
            setSelectedMood(null)
            setNote("")
            setIsNoteOpen(false)
            setIsSavingComplete(false)
          }, 600)
        },
      }
    )
  }

  const handleAddTask = () => {
    const title = newTaskTitle.trim()
    if (!title || !userId) {return}
    setNewTaskTitle("")
    setIsAddTaskOpen(false)
    addTask.mutate(title)
  }

  const completedWithPinned =
    tasks.filter((task) => task.done).length + pinnedTasks.filter((task) => task.done).length
  const totalWithPinned = tasks.length + pinnedTasks.length
  const taskProgress = totalWithPinned
    ? Math.round((completedWithPinned / totalWithPinned) * 100)
    : 0
  const selectedMoodMeta = getMoodMeta(selectedMood)

  const filterLabels: Record<TaskFilterKind, string> = {
    all: "All Tasks",
    pinned: "Pinned",
    normal: "Normal",
    done: "Done",
  }

  const filterEntries: TaskItem[] =
    tasksFilter === "pinned"
      ? pinnedTasks
      : tasksFilter === "normal"
        ? tasks.filter((task) => !task.done)
        : tasksFilter === "done"
          ? [...pinnedTasks, ...tasks].filter((task) => task.done)
          : [...pinnedTasks, ...tasks]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_45%,#ffffff_100%)] text-foreground flex justify-center">
      <main className="w-full max-w-md pb-32">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-black/[0.03] shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div
            className={cn(
              "px-6 pt-[env(safe-area-inset-top)] pb-3 transition-all duration-500",
              selectedMoodMeta ? `bg-gradient-to-b ${selectedMoodMeta.gradient} to-white` : "bg-white",
              isSavingComplete && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between text-xs font-medium tracking-widest text-stone-500 uppercase">
              <span>{formatDateLabel(selectedDate)}</span>
              {isLoggedIn ? (
                <button
                  onClick={() => { logout.mutate(); }}
                  className="text-xs font-medium tracking-widest text-stone-400 uppercase hover:text-stone-600 transition-colors"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-xs font-medium tracking-widest text-stone-400 uppercase hover:text-stone-600 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
            <h1
              suppressHydrationWarning
              className="text-4xl font-serif font-semibold tracking-tight text-foreground/90 mt-6 mb-2 text-center"
            >
              {(() => {
                const hour = new Date().getHours()
                if (hour < 12) {return "Good Morning"}
                if (hour < 18) {return "Good Afternoon"}
                return "Good Evening"
              })()}
            </h1>
          </div>

          <div className="px-6 pb-3">
            <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        </header>

        <div className="px-6 pt-6 space-y-4">
          <ModuleCard
            title="Tasks"
            icon={<ListTodo className="w-5 h-5" />}
            isExpanded={isTasksExpanded}
            onToggle={() => { setIsTasksExpanded(!isTasksExpanded); }}
            colorScheme="tasks"
            summary={
              <TasksSummaryPanel
                pinnedCount={pinnedTasks.length}
                normalCount={tasks.filter((task) => !task.done).length}
                doneCount={completedWithPinned}
                totalCount={totalWithPinned}
                progressPercent={taskProgress}
                onSelectFilter={setTasksFilter}
              />
            }
          >
            {isDayLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`task-skeleton-${index}`}
                    className="h-12 w-full rounded-xl bg-black/[0.03] animate-pulse"
                  />
                ))}
              </div>
            ) : tasks.length === 0 && pinnedTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground/60 font-normal tracking-wide mb-4">No tasks yet</p>
                <Button
                  onClick={() => { setIsAddTaskOpen(true); }}
                  className="rounded-full px-5 py-2.5 text-xs tracking-[0.2em] uppercase bg-foreground/90 text-white hover:bg-foreground shadow-md"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {pinnedTasks.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-amber-600/70 mb-2 pl-1">Pinned</p>
                    <div className="space-y-1">
                      {pinnedTasks.map((task) => (
                        <SwipeableTodoItem
                          key={task.id}
                          task={task}
                          onToggle={(taskId) => {
                            const target = pinnedTasks.find((item) => item.id === taskId)
                            if (target) {toggleTask.mutate(target);}
                          }}
                          onPin={(taskId) => {
                            const target = pinnedTasks.find((item) => item.id === taskId)
                            if (target) {togglePin.mutate(target);}
                          }}
                          onDelete={(taskId) => {
                            const target = [...pinnedTasks, ...tasks].find((item) => item.id === taskId)
                            if (target) {removeTask.mutate(target);}
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {tasks.map((task) => (
                  <SwipeableTodoItem
                    key={task.id}
                    task={task}
                    onToggle={(taskId) => {
                      const target = tasks.find((item) => item.id === taskId)
                      if (target) {toggleTask.mutate(target);}
                    }}
                    onPin={(taskId) => {
                      const target = tasks.find((item) => item.id === taskId)
                      if (target) {togglePin.mutate(target);}
                    }}
                    onDelete={(taskId) => {
                      const target = tasks.find((item) => item.id === taskId)
                      if (target) {removeTask.mutate(target);}
                    }}
                  />
                ))}
              </div>
            )}
          </ModuleCard>

          <ModuleCard
            title="Mood"
            icon={<CloudSun className="w-5 h-5" />}
            isExpanded={isMoodExpanded}
            onToggle={() => { setIsMoodExpanded(!isMoodExpanded); }}
            colorScheme="mood"
            summary={<MoodSummaryPanel selectedMood={selectedMood} />}
          >
            <div
              className={cn(
                "flex items-center justify-between gap-2 transition-all duration-500 pb-3",
                isSavingComplete ? "opacity-40 grayscale" : "opacity-100"
              )}
            >
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood.id
                return (
                  <button
                    key={mood.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMood(null)
                        setIsNoteOpen(noteOpenBeforeMoodRef.current)
                        return
                      }
                      noteOpenBeforeMoodRef.current = isNoteOpen
                      setSelectedMood(mood.id)
                      setIsNoteOpen(true)
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl transition-all duration-300 min-h-[70px]",
                      isSelected
                        ? "bg-white text-foreground shadow-md ring-1 ring-black/5"
                        : "text-muted-foreground/70 hover:bg-white/50"
                    )}
                  >
                    <mood.icon className="h-5 w-5" strokeWidth={1.5} />
                    <span className="text-[10px] tracking-[0.2em] uppercase font-normal">{mood.label}</span>
                  </button>
                )
              })}
            </div>

            {selectedMood && (
              <div className={cn("space-y-3 pt-3 border-t border-black/[0.04]", isSavingComplete ? "opacity-40" : "opacity-100")}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-wide text-stone-700">Note</span>
                  <button
                    onClick={() => { setIsNoteOpen((prev) => !prev); }}
                    className="text-xs tracking-widest text-stone-400 uppercase transition-all duration-300 hover:text-stone-600"
                  >
                    {isNoteOpen ? "Hide" : "Show"}
                  </button>
                </div>
                <div
                  className={cn(
                    "transition-all duration-500 overflow-hidden",
                    isNoteOpen ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <Textarea
                    value={note}
                    onChange={(event) => { setNote(event.target.value); }}
                    placeholder="Write here..."
                    className="border border-black/[0.04] rounded-xl px-4 py-3 text-sm leading-relaxed bg-white shadow-sm focus-visible:ring-0 focus-visible:border-black/10 transition-all duration-500 resize-none"
                  />
                </div>
              </div>
            )}

            {selectedMood && (
              <div className="pt-3">
                <MoodSpaceSelector
                  selectedSpace={space}
                  coupleSpaces={acceptedSpaces}
                  selectedCoupleSpaceId={coupleSpaceId}
                  onSpaceChange={setSpace}
                  disabled={isSaving}
                />
              </div>
            )}
          </ModuleCard>
        </div>

        <button
          onClick={() => { setIsAddTaskOpen(true); }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6 z-[60] w-9 h-9 rounded-full bg-[#f6f6f6] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95"
          aria-label="Add task"
        >
          <span className="text-foreground/50 text-lg font-normal leading-none">+</span>
        </button>

        {selectedMood && !isSavingComplete && (
          <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button
              onClick={handleSaveMood}
              className="rounded-full px-7 py-3.5 text-xs tracking-[0.3em] uppercase bg-foreground text-white shadow-[0_16px_35px_-22px_rgba(0,0,0,0.35)] transition-transform active:scale-95 hover:bg-foreground/90"
              disabled={isSaving}
            >
              {isSaving ? "Saving" : "Save"}
            </Button>
          </div>
        )}

        {isSavingComplete && (
          <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[60] animate-in fade-in scale-95 duration-500">
            <div className="rounded-full px-7 py-3.5 text-xs tracking-[0.3em] uppercase bg-muted-foreground/10 text-muted-foreground/60">
              Saved
            </div>
          </div>
        )}

        {tasksFilter && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => { setTasksFilter(null); }}
            />
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-stone-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-800">{filterLabels[tasksFilter]}</h3>
                  <button
                    onClick={() => { setTasksFilter(null); }}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition"
                  >
                    <span className="text-lg font-light leading-none">×</span>
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
                {filterEntries.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-6">No tasks</p>
                ) : (
                  <div className="space-y-2">
                    {filterEntries.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 py-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex-shrink-0",
                            task.done ? "bg-stone-800 border-stone-800" : "border-stone-300"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            task.done ? "text-stone-400 line-through" : "text-stone-700"
                          )}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
                <p className="text-xs text-stone-400 text-center">只读，点击右上角箭头进行修改。</p>
              </div>
            </div>
          </div>
        )}

        {isAddTaskOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => {
                setIsAddTaskOpen(false)
                setNewTaskTitle("")
              }}
            />
            <div
              className="relative w-full max-w-md bg-[#fffdfa] rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="px-6 pt-6 pb-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm tracking-[0.3em] uppercase text-muted-foreground/70">New Task</h3>
                  <button
                    onClick={() => {
                      setIsAddTaskOpen(false)
                      setNewTaskTitle("")
                    }}
                    className="text-muted-foreground/60 hover:text-foreground/80 transition"
                  >
                    <span className="text-2xl font-normal leading-none">×</span>
                  </button>
                </div>
                <input
                  ref={addTaskInputRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(event) => { setNewTaskTitle(event.target.value); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleAddTask()
                    }
                    if (event.key === "Escape") {
                      setIsAddTaskOpen(false)
                      setNewTaskTitle("")
                    }
                  }}
                  placeholder="What needs to be done?"
                  className="w-full bg-white/60 border border-black/[0.06] rounded-2xl px-5 py-4 text-[15px] font-light text-foreground/90 placeholder:text-muted-foreground/40 shadow-sm focus:ring-1 focus:ring-black/10 focus:outline-none focus:border-black/10 transition-all focus:bg-white"
                />
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setIsAddTaskOpen(false)
                      setNewTaskTitle("")
                    }}
                    className="flex-1 rounded-full bg-white/80 text-foreground/70 hover:bg-white border border-black/[0.06] shadow-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                    className="flex-1 rounded-full bg-foreground/90 text-white hover:bg-foreground shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <OnboardingGuide isLoggedIn={isLoggedIn} />
      </main>
    </div>
  )
}
