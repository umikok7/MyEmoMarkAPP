"use client"

import * as React from "react"
import Link from "next/link"
import { CloudSun, Leaf, Wind, Droplets, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/api"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { SwipeableTodoItem } from "@/components/SwipeableTodoItem"
import { MoodSpaceSelector, useMoodSpaceSelector } from "@/components/mood-space-selector"
import { ChevronDown, ListTodo, Plus, Pin, CheckCircle2 } from "lucide-react"

const ModuleCard = ({
	title,
	icon,
	children,
	summary,
	isExpanded,
	onToggle,
	colorScheme = "tasks",
}: ModuleCardProps) => {
	const colorClasses = {
		tasks: {
			bg: "bg-[#fdfcfa]",
			iconBg: "bg-amber-100",
			iconColor: "text-amber-600",
		},
		mood: {
			bg: "bg-[#f8f6f9]",
			iconBg: "bg-rose-100",
			iconColor: "text-rose-600",
		},
	}
	const colors = colorClasses[colorScheme]

	return (
		<div
			className={cn(
				"rounded-3xl overflow-hidden transition-all duration-300 ease-out border border-black/[0.03]",
				colors.bg,
				isExpanded ? "shadow-lg shadow-black/5" : "hover:shadow-md hover:shadow-black/3"
			)}
		>
			<div className="px-4 py-3 flex items-start justify-between">
				<div className="flex items-center gap-2.5">
					<div
						className={cn(
							"w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
							colors.iconBg,
							colors.iconColor
						)}
					>
						{icon}
					</div>
					<div className="text-left pt-0.5">
						<h3 className="text-[14px] font-semibold text-foreground/90">{title}</h3>
					</div>
				</div>
				<button
					onClick={onToggle}
					className={cn(
						"w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 mt-1",
						isExpanded ? "bg-black/[0.06]" : "bg-white/70",
						"cursor-pointer"
					)}
				>
					<ChevronDown
						className={cn(
							"w-4 h-4 text-foreground/50 transition-transform duration-300",
							isExpanded && "rotate-180"
						)}
					/>
				</button>
			</div>

			<div className="px-4 pb-4">
				{summary}
			</div>

			<div
				className={cn(
					"transition-all duration-300 ease-out overflow-hidden",
					isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
				)}
			>
				<div className="px-4 pb-4 pt-2 border-t border-black/[0.04]">{children}</div>
			</div>
		</div>
	)
}

type MoodType = "happy" | "calm" | "anxious" | "sad" | "angry"

type TaskItem = {
	id: string
	title: string
	done: boolean
	is_pinned?: boolean
}

type ServerTaskItem = {
	id: string
	title: string
	is_done: boolean
	is_pinned?: boolean
	created_at: string
}

type ModuleCardProps = {
	title: string
	icon: React.ReactNode
	children: React.ReactNode
	summary: React.ReactNode
	isExpanded: boolean
	onToggle: () => void
	colorScheme?: "tasks" | "mood"
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
	const [pinnedTasks, setPinnedTasks] = React.useState<TaskItem[]>([])
	const [newTaskTitle, setNewTaskTitle] = React.useState("")
	const [isDayLoading, setIsDayLoading] = React.useState(true)
	const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = React.useState(false)
	const [isSavingComplete, setIsSavingComplete] = React.useState(false)
	const [isTasksExpanded, setIsTasksExpanded] = React.useState(false)
	const [isMoodExpanded, setIsMoodExpanded] = React.useState(false)
	const [tasksFilter, setTasksFilter] = React.useState<"all" | "pinned" | "normal" | "done" | null>(null)
	const loginButtonRef = React.useRef<HTMLAnchorElement | null>(null)
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
			is_pinned: item.is_pinned,
		}))
	}, [userId])

	const fetchPinnedTasks = React.useCallback(async () => {
		if (!userId || userId === "guest") return [] as TaskItem[]
		const res = await fetch(
			buildApiUrl("/tasks", {
				include_pinned: "true",
				user_id: userId || undefined,
			}),
			{ credentials: "include" }
		)
		if (!res.ok) {
			throw new Error("Failed to fetch pinned tasks")
		}
		const json = await res.json()
		const items = (json?.data?.items || []) as ServerTaskItem[]
		return items.map((item) => ({
			id: item.id,
			title: item.title,
			done: item.is_done,
			is_pinned: true,
		}))
	}, [userId])

	React.useEffect(() => {
		if (!userId) return
		let cancelled = false
		const loadDay = async () => {
			setIsDayLoading(true)
			try {
				const [dayTasks, pinned] = await Promise.all([
					fetchTasksForDate(selectedDate),
					fetchPinnedTasks(),
				])
				if (cancelled) return
				setSelectedMood(null)
				setNote("")
				setIsNoteOpen(false)
				const pinnedIds = new Set(pinned.map((t) => t.id))
				setTasks(dayTasks.filter((t) => !pinnedIds.has(t.id)))
				setPinnedTasks(pinned)
			} catch (error) {
				console.error("Day load failed", error)
				setTasks([])
				setPinnedTasks([])
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
	}, [fetchTasksForDate, fetchPinnedTasks, selectedDate, userId])

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
		if (!target) {
			const pinnedTarget = pinnedTasks.find((task) => task.id === taskId)
			if (!pinnedTarget) return
			const nextDone = !pinnedTarget.done
			setPinnedTasks((prev) =>
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
				setPinnedTasks((prev) =>
					prev.map((task) => (task.id === taskId ? { ...task, done: !nextDone } : task))
				)
			}
			return
		}
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

	const togglePin = async (taskId: string) => {
		const isPinning = !pinnedTasks.some((t) => t.id === taskId)
		
		if (isPinning) {
			const taskToPin = tasks.find((t) => t.id === taskId)
			if (!taskToPin) return
			setTasks((prev) => prev.filter((t) => t.id !== taskId))
			setPinnedTasks((prev) => [...prev, { ...taskToPin, is_pinned: true }])
		} else {
			const taskToUnpin = pinnedTasks.find((t) => t.id === taskId)
			if (!taskToUnpin) return
			setPinnedTasks((prev) => prev.filter((t) => t.id !== taskId))
			setTasks((prev) => [...prev, { ...taskToUnpin, is_pinned: false }])
		}

		try {
			const response = await fetch(buildApiUrl(`/tasks/${taskId}`), {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ is_pinned: isPinning }),
			})
			if (!response.ok) {
				throw new Error("Failed to update pin status")
			}
			if (isPinning) {
				toast("已固定", {
					description: "任务将持续显示在后续天数",
					duration: 2000,
				})
			} else {
				toast("已取消固定", {
					duration: 2000,
				})
			}
		} catch (error) {
			console.error("Pin update failed", error)
			if (isPinning) {
				const taskToPin = tasks.find((t) => t.id === taskId)
				if (taskToPin) {
					setPinnedTasks((prev) => prev.filter((t) => t.id !== taskId))
					setTasks((prev) => [...prev, { ...taskToPin, is_pinned: false }])
				}
			} else {
				const taskToUnpin = pinnedTasks.find((t) => t.id === taskId)
				if (taskToUnpin) {
					setTasks((prev) => prev.filter((t) => t.id !== taskId))
					setPinnedTasks((prev) => [...prev, { ...taskToUnpin, is_pinned: true }])
				}
			}
			toast("操作失败", {
				description: "请重试",
				duration: 2000,
			})
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
					{ id: record.id, title: record.title, done: record.is_done, is_pinned: record.is_pinned },
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
		const pinnedTaskToDelete = pinnedTasks.find((t) => t.id === taskId)
		
		if (taskToDelete) {
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
		} else if (pinnedTaskToDelete) {
			const previousPinnedTasks = [...pinnedTasks]
			setPinnedTasks((prev) => prev.filter((task) => task.id !== taskId))
			toast("已删除", {
				description: pinnedTaskToDelete.title,
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
				setPinnedTasks(previousPinnedTasks)
				toast("删除失败", {
					description: "请重试",
					duration: 2000,
				})
			}
		}
	}

	const dateStrip = React.useMemo(() => {
		const weekStart = startOfWeek(selectedDate)
		return Array.from({ length: DATE_RANGE_DAYS }, (_, index) => addDays(weekStart, index))
	}, [selectedDate])

	const selectedMoodMeta = getMoodMeta(selectedMood)
	const completedTasks = tasks.filter((task) => task.done).length
	const totalTasks = tasks.length
	const totalWithPinned = totalTasks + pinnedTasks.length
	const completedWithPinned = completedTasks + pinnedTasks.filter((t) => t.done).length
	const taskProgress = totalWithPinned ? Math.round((completedWithPinned / totalWithPinned) * 100) : 0

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
									onClick={handleLogout}
									className="text-xs font-medium tracking-widest text-stone-400 uppercase hover:text-stone-600 transition-colors"
								>
									Logout
								</button>
							) : (
								<Link
									ref={loginButtonRef}
									id="login-register-button"
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

				<div className="px-6 pt-6 space-y-4">
					<ModuleCard
						title="Tasks"
						icon={<ListTodo className="w-5 h-5" />}
						isExpanded={isTasksExpanded}
						onToggle={() => setIsTasksExpanded(!isTasksExpanded)}
						colorScheme="tasks"
						summary={
							<div className="mt-2">
								<div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-100">
									<div className="grid grid-cols-2 gap-3">
										<button 
											onClick={() => setTasksFilter("all")}
											className="col-span-2 bg-stone-50 rounded-xl p-4 text-left hover:bg-stone-100 transition-colors cursor-pointer"
										>
											<div className="flex items-center justify-between">
												<div>
													<p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Total</p>
													<p className="text-5xl font-bold text-stone-800 mt-1">{totalWithPinned}</p>
												</div>
												<div className="w-14 h-14 bg-stone-200 rounded-full flex items-center justify-center">
													<ListTodo className="w-7 h-7 text-stone-600" />
												</div>
											</div>
										</button>
										
										<button 
											onClick={() => setTasksFilter("pinned")}
											className="bg-amber-50 rounded-xl p-3 text-left hover:bg-amber-100 transition-colors cursor-pointer"
										>
											<div className="flex items-center gap-2 mb-2">
												<Pin className="w-4 h-4 text-amber-500" />
												<span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pinned</span>
											</div>
											<p className="text-3xl font-bold text-stone-800">{pinnedTasks.length}</p>
										</button>
										
										<button 
											onClick={() => setTasksFilter("normal")}
											className="bg-stone-50 rounded-xl p-3 text-left hover:bg-stone-100 transition-colors cursor-pointer"
										>
											<div className="flex items-center gap-2 mb-2">
												<span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Normal</span>
											</div>
											<p className="text-3xl font-bold text-stone-800">{totalTasks}</p>
										</button>
										
										<button 
											onClick={() => setTasksFilter("done")}
											className="bg-green-50 rounded-xl p-3 text-left hover:bg-green-100 transition-colors cursor-pointer"
										>
											<div className="flex items-center gap-2 mb-2">
												<CheckCircle2 className="w-4 h-4 text-green-500" />
												<span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Done</span>
											</div>
											<p className="text-3xl font-bold text-stone-800">{completedWithPinned}</p>
										</button>
										
										<div className="col-span-2 bg-stone-100 rounded-xl p-3">
											<div className="flex items-center justify-between mb-2">
												<span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Progress</span>
												<span className="text-sm font-bold text-stone-700">{taskProgress}%</span>
											</div>
											<div className="h-2 bg-stone-200 rounded-full overflow-hidden">
												<div 
													className="h-full bg-stone-700 rounded-full transition-all duration-700" 
													style={{ width: `${taskProgress}%` }}
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
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
						) : pinnedTasks.length === 0 && tasks.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-sm text-muted-foreground/60 font-normal tracking-wide mb-4">No tasks yet</p>
								<Button
									onClick={() => setIsAddTaskSheetOpen(true)}
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
													onDelete={handleDeleteTask}
													onToggle={toggleTask}
													onPin={togglePin}
												/>
											))}
										</div>
									</div>
								)}
								{tasks.map((task) => (
									<SwipeableTodoItem
										key={task.id}
										task={task}
										onDelete={handleDeleteTask}
										onToggle={toggleTask}
										onPin={togglePin}
									/>
								))}
							</div>
						)}
					</ModuleCard>

					<ModuleCard
						title="Mood"
						icon={<CloudSun className="w-5 h-5" />}
						isExpanded={isMoodExpanded}
						onToggle={() => setIsMoodExpanded(!isMoodExpanded)}
						colorScheme="mood"
						summary={
							<div className="mt-2">
								<div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-100">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="flex -space-x-2">
												{MOODS.slice(0, 4).map((mood) => {
													const Icon = mood.icon
													return (
														<div
															key={mood.id}
															className="w-8 h-8 rounded-full bg-stone-50 border-2 border-white flex items-center justify-center"
														>
															<Icon className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
														</div>
													)
												})}
											</div>
											<p className="text-xs font-medium text-stone-400">week</p>
										</div>
										<div className="h-6 w-px bg-stone-200" />
										<div className="text-right">
											{selectedMood ? (
												<>
													{MOODS.filter(m => m.id === selectedMood).map(m => {
														const Icon = m.icon
														return (
															<div key={m.id} className="flex items-center gap-2 justify-end">
																<Icon className="w-5 h-5 text-stone-600" strokeWidth={1.5} />
																<p className="text-lg font-semibold text-stone-700">{m.label}</p>
															</div>
														)
													})}
												</>
											) : (
												<>
													<p className="text-lg font-semibold text-stone-400">—</p>
												</>
											)}
										</div>
									</div>
								</div>
							</div>
						}
					>
						<div className={cn(
							"flex items-center justify-between gap-2 transition-all duration-500 pb-3",
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
											"flex flex-col items-center gap-1.5 flex-1 py-3 rounded-2xl transition-all duration-300 min-h-[70px]",
											isSelected
												? "bg-white text-foreground shadow-md ring-1 ring-black/5"
												: "text-muted-foreground/70 hover:bg-white/50"
										)}
									>
										<Icon className="h-5 w-5" strokeWidth={1.5} />
										<span className="text-[10px] tracking-[0.2em] uppercase font-normal">{mood.label}</span>
									</button>
								)
							})}
						</div>

						{selectedMood && (
							<div className={cn(
								"space-y-3 pt-3 border-t border-black/[0.04]",
								isSavingComplete ? "opacity-40" : "opacity-100"
							)}>
								<div className="flex items-center justify-between">
									<span className="text-sm font-bold tracking-wide text-stone-700">Note</span>
									<button
										onClick={() => setIsNoteOpen((prev) => !prev)}
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
										onChange={(event) => setNote(event.target.value)}
										placeholder="Write here..."
										className={cn(
											"border border-black/[0.04] rounded-xl px-4 py-3 text-sm leading-relaxed bg-white shadow-sm focus-visible:ring-0 focus-visible:border-black/10 transition-all duration-500 resize-none",
											isSavingComplete ? "opacity-40" : "opacity-100"
										)}
									/>
								</div>
							</div>
						)}

						{!loadingSpaces && selectedMood && (
							<div className="pt-3">
								<MoodSpaceSelector
									selectedSpace={selectedSpace}
									coupleSpaces={coupleSpaces}
									selectedCoupleSpaceId={selectedCoupleSpaceId}
									onSpaceChange={handleSpaceChange}
								/>
							</div>
						)}
					</ModuleCard>
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
				{/* Tasks Filter Modal - Center Display Only */}
				{tasksFilter && (
					<div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
						<div
							className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
							onClick={() => setTasksFilter(null)}
						/>
						<div 
							className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
						>
							<div className="px-6 py-5 border-b border-stone-100">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-bold text-stone-800">
										{tasksFilter === "all" && "All Tasks"}
										{tasksFilter === "pinned" && "Pinned"}
										{tasksFilter === "normal" && "Normal"}
										{tasksFilter === "done" && "Done"}
									</h3>
									<button
										onClick={() => setTasksFilter(null)}
										className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition"
									>
										<span className="text-lg font-light leading-none">×</span>
									</button>
								</div>
							</div>
							<div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
								{tasksFilter === "all" && (
									<div className="space-y-3">
										{pinnedTasks.length > 0 && (
											<div className="mb-4">
												<p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2">Pinned</p>
												<div className="space-y-2">
													{pinnedTasks.map((task) => (
														<div key={task.id} className="flex items-center gap-3 py-2">
															<div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0", task.done ? "bg-stone-800 border-stone-800" : "border-stone-300")} />
															<span className={cn("text-sm font-medium", task.done ? "text-stone-400 line-through" : "text-stone-700")}>{task.title}</span>
														</div>
													))}
												</div>
											</div>
										)}
										<div className="space-y-2">
											{tasks.map((task) => (
												<div key={task.id} className="flex items-center gap-3 py-2">
													<div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0", task.done ? "bg-stone-800 border-stone-800" : "border-stone-300")} />
													<span className={cn("text-sm font-medium", task.done ? "text-stone-400 line-through" : "text-stone-700")}>{task.title}</span>
												</div>
											))}
										</div>
										{pinnedTasks.length === 0 && tasks.length === 0 && (
											<p className="text-sm text-stone-400 text-center py-6">No tasks</p>
										)}
									</div>
								)}
								{tasksFilter === "pinned" && (
									<div className="space-y-2">
										{pinnedTasks.map((task) => (
											<div key={task.id} className="flex items-center gap-3 py-2">
												<div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0", task.done ? "bg-stone-800 border-stone-800" : "border-stone-300")} />
												<span className={cn("text-sm font-medium", task.done ? "text-stone-400 line-through" : "text-stone-700")}>{task.title}</span>
											</div>
										))}
										{pinnedTasks.length === 0 && (
											<p className="text-sm text-stone-400 text-center py-6">No pinned tasks</p>
										)}
									</div>
								)}
								{tasksFilter === "normal" && (
									<div className="space-y-2">
										{tasks.map((task) => (
											<div key={task.id} className="flex items-center gap-3 py-2">
												<div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0", task.done ? "bg-stone-800 border-stone-800" : "border-stone-300")} />
												<span className={cn("text-sm font-medium", task.done ? "text-stone-400 line-through" : "text-stone-700")}>{task.title}</span>
											</div>
										))}
										{tasks.length === 0 && (
											<p className="text-sm text-stone-400 text-center py-6">No normal tasks</p>
										)}
									</div>
								)}
								{tasksFilter === "done" && (
									<div className="space-y-2">
										{[...pinnedTasks, ...tasks].filter(t => t.done).map((task) => (
											<div key={task.id} className="flex items-center gap-3 py-2">
												<div className="w-4 h-4 rounded-full bg-stone-800 border-stone-800 flex-shrink-0" />
												<span className="text-sm font-medium text-stone-400 line-through">{task.title}</span>
											</div>
										))}
										{[...pinnedTasks, ...tasks].filter(t => t.done).length === 0 && (
											<p className="text-sm text-stone-400 text-center py-6">No completed tasks</p>
										)}
									</div>
								)}
							</div>
							<div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
								<p className="text-xs text-stone-400 text-center">View only • Use arrow to manage</p>
							</div>
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

			<OnboardingGuide isLoggedIn={isLoggedIn} />
		</div>
	)
}
