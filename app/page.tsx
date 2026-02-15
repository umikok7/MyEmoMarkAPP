"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { CloudSun, Leaf, Wind, Droplets, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/api"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { SwipeableTodoItem } from "@/components/SwipeableTodoItem"
import { MoodSpaceSelector, useMoodSpaceSelector } from "@/components/mood-space-selector"

type MoodType = "happy" | "calm" | "anxious" | "sad" | "angry"

type TaskItem = {
	id: string
	title: string
	done: boolean
}

type ServerTaskItem = {
	id: string
	title: string
	is_done: boolean
	created_at: string
}

const MOODS: Array<{
	id: MoodType
	label: string
	icon: typeof CloudSun
	dot: string
	gradient: string
}> = [
	{
		id: "happy",
		label: "Joy",
		icon: CloudSun,
		dot: "bg-rose-300",
		gradient: "from-[#fdecec]",
	},
	{
		id: "calm",
		label: "Calm",
		icon: Leaf,
		dot: "bg-teal-300",
		gradient: "from-[#ecf7f3]",
	},
	{
		id: "anxious",
		label: "Worry",
		icon: Wind,
		dot: "bg-amber-300",
		gradient: "from-[#fff6e8]",
	},
	{
		id: "sad",
		label: "Blue",
		icon: Droplets,
		dot: "bg-sky-300",
		gradient: "from-[#ecf5ff]",
	},
	{
		id: "angry",
		label: "Heat",
		icon: Zap,
		dot: "bg-red-300",
		gradient: "from-[#fff0f0]",
	},
]

const DATE_RANGE_DAYS = 21

const toDateKey = (date: Date) => date.toLocaleDateString("en-CA")

const startOfWeek = (date: Date) => {
	const target = new Date(date)
	const day = target.getDay()
	const diff = (day + 6) % 7
	target.setDate(target.getDate() - diff)
	target.setHours(0, 0, 0, 0)
	return target
}

const addDays = (date: Date, amount: number) => {
	const next = new Date(date)
	next.setDate(next.getDate() + amount)
	return next
}

const formatDateLabel = (date: Date) =>
	date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })

const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b)

const getMoodMeta = (mood?: MoodType | null) => MOODS.find((item) => item.id === mood)

export default function Home() {
	const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		return today
	})
	const [selectedMood, setSelectedMood] = React.useState<MoodType | null>(null)
	const [note, setNote] = React.useState("")
	const [isNoteOpen, setIsNoteOpen] = React.useState(false)
	const [isSaving, setIsSaving] = React.useState(false)
	const [isLoggedIn, setIsLoggedIn] = React.useState(false)
	const [userId, setUserId] = React.useState<string | null>(null)
	const [tasks, setTasks] = React.useState<TaskItem[]>([])
	const [newTaskTitle, setNewTaskTitle] = React.useState("")
	const [isDayLoading, setIsDayLoading] = React.useState(true)
	const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = React.useState(false)
	const [isSavingComplete, setIsSavingComplete] = React.useState(false)
	const loginButtonRef = React.useRef<HTMLAnchorElement | null>(null)
	const tasksSectionRef = React.useRef<HTMLElement | null>(null)
	const dateScrollRef = React.useRef<HTMLDivElement | null>(null)
	const noteOpenBeforeMoodRef = React.useRef(false)
	const addTaskInputRef = React.useRef<HTMLInputElement | null>(null)

	const {
		selectedSpace,
		selectedCoupleSpaceId,
		coupleSpaces,
		loading: loadingSpaces,
		handleSpaceChange,
		resetToPersonal,
	} = useMoodSpaceSelector()

	React.useEffect(() => {
		if (typeof window === "undefined") return
		const rawUser = window.localStorage.getItem("awesome-user")
		if (rawUser) {
			try {
				const parsed = JSON.parse(rawUser)
				setUserId(parsed?.id || "guest")
				setIsLoggedIn(true)
				return
			} catch (error) {
				console.error("Failed to parse stored user", error)
			}
		}
		setUserId("guest")
		setIsLoggedIn(false)
	}, [])

	const fetchTasksForDate = React.useCallback(async (date: Date) => {
		if (!userId) return [] as TaskItem[]
		const res = await fetch(
			buildApiUrl("/tasks", {
				date: toDateKey(date),
				user_id: userId || undefined,
			}),
			{ credentials: "include" }
		)
		if (!res.ok) {
			throw new Error("Failed to fetch tasks")
		}
		const json = await res.json()
		const items = (json?.data?.items || []) as ServerTaskItem[]
		return items.map((item) => ({
			id: item.id,
			title: item.title,
			done: item.is_done,
		}))
	}, [userId])

	React.useEffect(() => {
		if (!userId) return
		let cancelled = false
		const loadDay = async () => {
			setIsDayLoading(true)
			try {
				const dayTasks = await fetchTasksForDate(selectedDate)
				if (cancelled) return
				setSelectedMood(null)
				setNote("")
				setIsNoteOpen(false)
				setTasks(dayTasks)
			} catch (error) {
				console.error("Day load failed", error)
				setTasks([])
			} finally {
				if (!cancelled) {
					setIsDayLoading(false)
				}
			}
		}
		loadDay()
		return () => {
			cancelled = true
		}
	}, [fetchTasksForDate, selectedDate, userId])

	const handleLogout = async () => {
		try {
			await fetch(buildApiUrl("/auth/logout"), {
				method: "POST",
				credentials: "include",
			})
		} catch (error) {
			console.error("Logout failed", error)
		} finally {
			localStorage.removeItem("awesome-user")
			setIsLoggedIn(false)
			window.location.href = "/login"
		}
	}

	const handleSave = async () => {
		if (!selectedMood) return
		setIsSaving(true)

		let endpoint = "/moods"
		let body: Record<string, unknown>

		if (selectedSpace === "couple" && selectedCoupleSpaceId) {
			endpoint = "/couple-moods"
			body = {
				space_id: selectedCoupleSpaceId,
				mood_type: selectedMood,
				intensity: 5,
				note: note,
				tags: [],
			}
		} else {
			body = {
				user_id: userId ?? undefined,
				mood_type: selectedMood,
				intensity: 5,
				note: note,
				tags: [],
			}
		}

		try {

			if (selectedSpace === "couple" && selectedCoupleSpaceId) {
				endpoint = "/couple-moods"
				body = {
					space_id: selectedCoupleSpaceId,
					mood_type: selectedMood,
					intensity: 5,
					note: note,
					tags: [],
				}
			}

			const response = await fetch(buildApiUrl(endpoint), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(body),
			})

			if (!response.ok) {
				throw new Error("Failed to save mood")
			}

			await response.json()

			toast(selectedSpace === "couple" ? "Saved to Our Space" : "Saved", {
				description: "Mood recorded.",
				duration: 2000,
			})

			setIsSavingComplete(true)

			setTimeout(() => {
				setSelectedMood(null)
				setNote("")
				setIsNoteOpen(false)
				setIsSavingComplete(false)
				resetToPersonal()
			}, 600)

		} catch (error) {
			console.error("Save error:", error)
			toast("Save failed", {
				description: "Please try again.",
				duration: 2000,
			})
		} finally {
			setIsSaving(false)
		}
	}

	const toggleTask = async (taskId: string) => {
		const target = tasks.find((task) => task.id === taskId)
		if (!target) return
		const nextDone = !target.done
		setTasks((prev) =>
			prev.map((task) => (task.id === taskId ? { ...task, done: nextDone } : task))
		)
		try {
			const response = await fetch(buildApiUrl(`/tasks/${taskId}`), {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ is_done: nextDone }),
			})
			if (!response.ok) {
				throw new Error("Failed to update task")
			}
		} catch (error) {
			console.error("Task update failed", error)
			setTasks((prev) =>
				prev.map((task) => (task.id === taskId ? { ...task, done: !nextDone } : task))
			)
		}
	}

	const handleAddTask = async () => {
		const title = newTaskTitle.trim()
		if (!title || !userId) return
		setNewTaskTitle("")
		setIsAddTaskSheetOpen(false)
		try {
			const response = await fetch(buildApiUrl("/tasks"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					user_id: userId,
					title,
					task_date: toDateKey(selectedDate),
				}),
			})
			if (!response.ok) {
				throw new Error("Failed to add task")
			}
			const json = await response.json()
			const record = json?.data?.record as ServerTaskItem | undefined
			if (record) {
				setTasks((prev) => [
					...prev,
					{ id: record.id, title: record.title, done: record.is_done },
				])
			}
		} catch (error) {
			console.error("Task create failed", error)
			setNewTaskTitle(title)
		}
	}

	React.useEffect(() => {
		if (isAddTaskSheetOpen && addTaskInputRef.current) {
			setTimeout(() => {
				addTaskInputRef.current?.focus()
			}, 100)
		}
	}, [isAddTaskSheetOpen])

	const handleDeleteTask = async (taskId: string) => {
		const taskToDelete = tasks.find((t) => t.id === taskId)
		if (!taskToDelete) return

		const previousTasks = [...tasks]

		setTasks((prev) => prev.filter((task) => task.id !== taskId))

		toast("已删除", {
			description: taskToDelete.title,
			duration: 2000,
		})

		try {
			const response = await fetch(buildApiUrl(`/tasks/${taskId}`), {
				method: "DELETE",
				credentials: "include",
			})
			if (!response.ok) {
				throw new Error("Failed to delete task")
			}
		} catch (error) {
			console.error("Task delete failed", error)
			setTasks(previousTasks)
			toast("删除失败", {
				description: "请重试",
				duration: 2000,
			})
		}
	}

	const dateStrip = React.useMemo(() => {
		const weekStart = startOfWeek(selectedDate)
		return Array.from({ length: DATE_RANGE_DAYS }, (_, index) => addDays(weekStart, index))
	}, [selectedDate])

	const selectedMoodMeta = getMoodMeta(selectedMood)
	const completedTasks = tasks.filter((task) => task.done).length
	const totalTasks = tasks.length
	const taskProgress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0

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
						<div className="flex items-center justify-between text-[11px] tracking-[0.25em] uppercase text-muted-foreground/60">
							<span>{formatDateLabel(selectedDate)}</span>
							{isLoggedIn ? (
								<button
									onClick={handleLogout}
									className="hover:text-foreground/70 transition"
								>
									Logout
								</button>
							) : (
								<Link
									ref={loginButtonRef}
									id="login-register-button"
									href="/login"
									className="hover:text-foreground/70 transition"
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
								if (hour < 12) return "Good Morning"
								if (hour < 18) return "Good Afternoon"
								return "Good Evening"
							})()}
						</h1>
					</div>

					<div className="px-6 pb-3">
						<div
							ref={dateScrollRef}
							className="flex gap-4 overflow-x-auto scroll-smooth py-3 no-scrollbar"
						>
							{dateStrip.map((date) => {
								const isActive = isSameDay(date, selectedDate)
								const dayKey = toDateKey(date)
								return (
									<button
										key={dayKey}
										onClick={() => {
											setSelectedDate(date)
											requestAnimationFrame(() => {
												const container = dateScrollRef.current
												if (!container) return
												const target = container.querySelector<HTMLButtonElement>(
													`button[data-date='${dayKey}']`
												)
												target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
											})
										}}
										data-date={dayKey}
										className="flex flex-col items-center min-w-[52px]"
									>
										<div
											className={cn(
												"w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold transition",
												isActive
													? "bg-black/[0.06] text-foreground"
													: "text-muted-foreground/60"
											)}
										>
											{date.getDate()}
										</div>
										<span
											className={cn(
												"text-xs tracking-[0.2em] uppercase mt-1",
												isActive ? "text-foreground/80" : "text-muted-foreground/50"
											)}
										>
											{date.toLocaleDateString("en-US", { weekday: "short" })}
										</span>
									</button>
								)
							})}
						</div>
					</div>
				</header>

				{/* Healing Atmosphere Banner */}
				<div className="relative overflow-hidden bg-gradient-to-br from-[#f9f6f3] via-[#fdfcfb] to-white border-b border-black/[0.02]">
					<div className="px-6 py-8 relative flex items-center justify-between">
						{/* Text Content */}
						<div className="relative z-10 max-w-[55%]">
							<p className="text-xs tracking-[0.3em] uppercase text-muted-foreground/70 font-medium mb-2">
								Today
							</p>
							<h2 className="text-xl font-normal text-foreground/90 leading-relaxed tracking-wide">
								Take a moment to breathe
							</h2>
						</div>

						{/* Coffee Bean Illustration */}
						<div className="relative w-20 h-20 opacity-30">
							<Image 
								src="/coffee bean-pana.svg" 
								alt="" 
								width={80}
								height={80}
								className="w-full h-full object-contain"
							/>
						</div>
					</div>
				</div>

				<div className="px-6 pt-6 space-y-6">
					<section ref={tasksSectionRef} className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="text-sm tracking-[0.3em] uppercase text-muted-foreground/80 font-medium">Tasks</p>
							<div className="flex items-center gap-2">
								<p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50">
									{completedTasks} / {totalTasks} done
								</p>
								<div className="h-1.5 w-20 bg-black/[0.04] rounded-full overflow-hidden">
									<div
										className="h-full bg-foreground/15 rounded-full transition-[width] duration-700 ease-out"
										style={{ width: `${taskProgress}%` }}
									/>
								</div>
							</div>
						</div>
						<div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.012)]">
							<div className="space-y-2">
								{isDayLoading ? (
									Array.from({ length: 3 }).map((_, index) => (
										<div
											key={`task-skeleton-${index}`}
											className="h-10 w-full rounded-xl bg-white/40 animate-pulse border border-white/50"
										/>
									))
								) : tasks.length === 0 ? (
									<p className="text-sm text-muted-foreground/60 text-center py-6 font-normal tracking-wide">No tasks yet</p>
								) : (
									tasks.map((task) => (
										<div key={task.id} className="-ml-[40px]">
											<SwipeableTodoItem
												task={task}
												onDelete={handleDeleteTask}
												onToggle={toggleTask}
											/>
										</div>
									))
								)}
							</div>
						</div>
					</section>

					<section className="space-y-4">
						<div className="flex items-center justify-between">
							<p className="text-sm tracking-[0.3em] uppercase text-muted-foreground/80 font-medium">Mood</p>
							{!loadingSpaces && selectedMood && (
								<MoodSpaceSelector
									selectedSpace={selectedSpace}
									coupleSpaces={coupleSpaces}
									selectedCoupleSpaceId={selectedCoupleSpaceId}
									onSpaceChange={handleSpaceChange}
								/>
							)}
						</div>
						<div className={cn(
							"flex items-center justify-between gap-2 transition-all duration-500",
							isSavingComplete ? "opacity-40 grayscale" : "opacity-100"
						)}>
							{MOODS.map((mood) => {
								const Icon = mood.icon
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
											"flex flex-col items-center gap-1.5 px-4 py-3 rounded-full transition-all duration-300",
											isSelected
												? "bg-black/[0.06] text-foreground scale-105 ring-1 ring-black/10 shadow-[0_0_0_6px_rgba(0,0,0,0.03)] font-medium"
												: "text-muted-foreground/70"
										)}
									>
										<Icon className="h-5 w-5" strokeWidth={1.5} />
										<span className="text-[11px] tracking-[0.2em] uppercase font-normal">{mood.label}</span>
									</button>
								)
							})}
						</div>
					</section>

					<section className="space-y-3">
						<button
							onClick={() => setIsNoteOpen((prev) => !prev)}
							className={cn(
								"flex w-full items-center justify-between text-sm tracking-[0.3em] uppercase transition-all duration-500 font-medium",
								isSavingComplete ? "text-muted-foreground/40" : "text-muted-foreground/80"
							)}
						>
							<span>Note</span>
							<span>{isNoteOpen ? "Close" : "Open"}</span>
						</button>
						<div
							className={cn(
								"transition-all duration-500 overflow-hidden",
								isNoteOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
							)}
						>
							<Textarea
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder="Write here"
								className={cn(
									"border border-black/[0.04] rounded-2xl px-4 py-4 text-sm leading-relaxed bg-[#fbfbfb] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-0 focus-visible:border-black/10 transition-all duration-500",
									isSavingComplete ? "opacity-40" : "opacity-100"
								)}
							/>
						</div>
					</section>
				</div>

				{/* Floating Add Task Button */}
				<button
					onClick={() => setIsAddTaskSheetOpen(true)}
					className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6 z-[60] w-9 h-9 rounded-full bg-[#f6f6f6] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95"
					aria-label="Add task"
				>
					<span className="text-foreground/50 text-lg font-normal leading-none">+</span>
				</button>

				{/* Save Button - Only visible when mood is selected */}
				{selectedMood && !isSavingComplete && (
					<div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300">
						<Button
							onClick={handleSave}
							className="rounded-full px-7 py-3.5 text-xs tracking-[0.3em] uppercase bg-foreground text-white shadow-[0_16px_35px_-22px_rgba(0,0,0,0.35)] transition-transform active:scale-95 hover:bg-foreground/90"
							disabled={isSaving}
						>
							{isSaving ? "Saving" : "Save"}
						</Button>
					</div>
				)}

				{/* Save Complete Animation */}
				{isSavingComplete && (
					<div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[60] animate-in fade-in scale-95 duration-500">
						<div className="rounded-full px-7 py-3.5 text-xs tracking-[0.3em] uppercase bg-muted-foreground/10 text-muted-foreground/60">
							Saved
						</div>
					</div>
				)}
			</main>

			{/* Add Task Bottom Sheet */}
			{isAddTaskSheetOpen && (
				<div className="fixed inset-0 z-[70] flex items-end justify-center">
					<div
						className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
						onClick={() => {
							setIsAddTaskSheetOpen(false)
							setNewTaskTitle("")
						}}
					/>
					<div 
						className="relative w-full max-w-md bg-[#fffdfa] rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out"
						style={{
							paddingBottom: 'env(safe-area-inset-bottom)',
						}}
					>
						<div className="px-6 pt-6 pb-8 space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm tracking-[0.3em] uppercase text-muted-foreground/70">New Task</h3>
								<button
									onClick={() => {
										setIsAddTaskSheetOpen(false)
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
								onChange={(event) => setNewTaskTitle(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault()
										handleAddTask()
									}
									if (event.key === "Escape") {
										setIsAddTaskSheetOpen(false)
										setNewTaskTitle("")
									}
								}}
								placeholder="What needs to be done?"
								className="w-full bg-white/60 border border-black/[0.06] rounded-2xl px-5 py-4 text-[15px] font-light text-foreground/90 placeholder:text-muted-foreground/40 shadow-sm focus:ring-1 focus:ring-black/10 focus:outline-none focus:border-black/10 transition-all focus:bg-white"
							/>
							<div className="flex gap-3 pt-2">
								<Button
									onClick={() => {
										setIsAddTaskSheetOpen(false)
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

			<OnboardingGuide targetRef={loginButtonRef} tasksRef={tasksSectionRef} isLoggedIn={isLoggedIn} />
		</div>
	)
}
