"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CloudSun, Leaf, Wind, Droplets, Zap, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/api"

const MOODS = [
  { id: "happy", label: "Joy", color: "bg-[#fff0f0]", icon: CloudSun },
  { id: "calm", label: "Calm", color: "bg-[#f0f9f9]", icon: Leaf },
  { id: "anxious", label: "Worry", color: "bg-[#fffaf0]", icon: Wind },
  { id: "sad", label: "Blue", color: "bg-[#f4faff]", icon: Droplets },
  { id: "angry", label: "Heat", color: "bg-[#fff5f5]", icon: Zap },
]

export default function Home() {
  const [selectedMood, setSelectedMood] = React.useState<string | null>(null)
  const [intensity, setIntensity] = React.useState([50])
  const [note, setNote] = React.useState("")
  const [mounted, setMounted] = React.useState(false)
	const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

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
			window.location.href = "/login"
		}
	}

  const handleSave = async () => {
    if (!selectedMood) return
    
    setIsSaving(true)
		const rawUser = localStorage.getItem("awesome-user")
		let userId: string | undefined
		if (rawUser) {
			try {
				const parsed = JSON.parse(rawUser)
				userId = parsed?.id
			} catch (error) {
				console.error("Failed to parse stored user", error)
			}
		}
    
		const payload = {
			user_id: userId,
			mood_type: selectedMood,
			intensity: Math.round(intensity[0] / 10), // Convert 0-100 to 1-10
			note: note,
			tags: [],
		}

    try {
		const response = await fetch(buildApiUrl("/moods"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify(payload),
		})

      if (!response.ok) {
        throw new Error('Failed to save mood')
      }

      // Success Toast
      toast("Recorded successfully", {
        description: "Your mood has been saved to your journal.",
        duration: 2000,
      })
      
      setSelectedMood(null)
      setIntensity([50])
      setNote("")
    } catch (error) {
      console.error("Save error:", error)
      toast("Something went wrong", {
        description: "Please try again later.",
        duration: 2000,
      })
    } finally {
      setIsSaving(false)
    }
  }

	// Soft, breathing illustration container
	const IllustrationBanner = () => (
		<div className="w-full aspect-square sm:aspect-[4/3] rounded-[3rem] bg-gradient-to-b from-white to-secondary/20 mb-12 flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-white/50 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.05)] p-8 transition-transform duration-1000 ease-out hover:scale-[1.01]">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />

			{/* Dynamic Placeholder Content */}
			<div
				className={cn(
					"relative z-10 flex flex-col items-center transition-all duration-700",
					selectedMood ? "scale-90 opacity-90" : "scale-100 opacity-100"
				)}
			>
				{selectedMood ? (
					<div className="w-32 h-32 rounded-full bg-white/60 blur-xl absolute -z-10 animate-pulse" />
				) : null}

				<div className="w-24 h-24 rounded-full bg-white/40 flex items-center justify-center mb-6 shadow-sm backdrop-blur-md">
					{selectedMood ? (
						<Sparkles
							className="w-8 h-8 text-secondary-foreground/40 animate-spin-slow"
							strokeWidth={1}
						/>
					) : (
						<CloudSun
							className="w-8 h-8 text-muted-foreground/30"
							strokeWidth={1}
						/>
					)}
				</div>

				<p className="text-sm text-foreground/40 font-light tracking-[0.2em] uppercase">
					{selectedMood ? "Reflecting..." : "Your Space"}
				</p>
			</div>
		</div>
	)

	return (
		<div className="min-h-screen bg-background selection:bg-primary/30 flex justify-center">
			<main
				className={cn(
					"w-full max-w-md p-8 md:p-12 pb-32 flex flex-col transition-opacity duration-1000",
					mounted ? "opacity-100" : "opacity-0"
				)}
			>
				{/* Top Greeting */}
				<header className="pt-8 pb-10 space-y-4 safe-area-header">
					<div className="flex items-center justify-between px-1">
						<div className="text-xs font-semibold tracking-widest text-primary-foreground/50 uppercase">
							{new Date().toLocaleDateString("en-US", { weekday: "long" })}
						</div>
						<button
							className="text-xs font-semibold tracking-widest text-primary-foreground/50 uppercase hover:text-foreground/70 transition"
							onClick={handleLogout}
							title="Log out"
						>
							Login Out
						</button>
					</div>
					<h1 className="text-4xl font-light text-foreground tracking-tight">
						Have a nice day
					</h1>
				</header>

				{/* Illustration Area */}
				<IllustrationBanner />

				<div className="space-y-12">
					{/* Mood Selection */}
					<section className="space-y-6">
						<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-2">
							How do you feel?
						</h2>
						<div className="flex flex-wrap gap-4 justify-center">
							{MOODS.map((mood) => {
								const Icon = mood.icon
								const isSelected = selectedMood === mood.id
								return (
									<button
										key={mood.id}
										onClick={() => setSelectedMood(mood.id)}
										className={cn(
											"group relative flex flex-col items-center justify-center w-20 h-24 rounded-[2rem] transition-all duration-500 ease-out",
											isSelected
												? "bg-white shadow-lg shadow-primary/10 scale-110 -translate-y-1 ring-1 ring-black/5"
												: "bg-transparent hover:bg-white/50 hover:scale-105"
										)}
									>
										<span
											className={cn(
												"flex items-center justify-center w-10 h-10 rounded-full mb-3 transition-colors duration-300",
												isSelected ? mood.color : "bg-white/60"
											)}
										>
											<Icon
												className={cn(
													"w-5 h-5 transition-colors duration-300",
													isSelected
														? "text-foreground/70"
														: "text-muted-foreground/40 group-hover:text-muted-foreground/60"
												)}
												strokeWidth={1.5}
											/>
										</span>
										<span
											className={cn(
												"text-xs font-medium tracking-wide transition-colors duration-300",
												isSelected
													? "text-foreground/80"
													: "text-muted-foreground/50"
											)}
										>
											{mood.label}
										</span>
									</button>
								)
							})}
						</div>
					</section>

					{/* Expanded Content (Intensity + Note) */}
					<div
						className={cn(
							"space-y-10 transition-all duration-1000 ease-in-out",
							selectedMood
								? "opacity-100 translate-y-0 max-h-[800px]"
								: "opacity-0 translate-y-10 max-h-0 overflow-hidden pointer-events-none"
						)}
					>
						{/* Intensity Slider */}
						<section className="px-2">
							<div className="flex justify-between items-end mb-6 px-2">
								<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
									Intensity
								</h2>
								<div className="text-2xl font-light text-foreground/80 tabular-nums">
									{intensity[0]}
									<span className="text-sm text-muted-foreground/40 ml-1">
										%
									</span>
								</div>
							</div>
							<div className="px-1 py-2">
								<Slider
									defaultValue={[50]}
									max={100}
									step={1}
									value={intensity}
									onValueChange={setIntensity}
									className="cursor-pointer"
								/>
							</div>
							<div className="flex justify-between px-1 mt-3">
								<span className="text-[10px] uppercase tracking-widest text-muted-foreground/30">
									Light
								</span>
								<span className="text-[10px] uppercase tracking-widest text-muted-foreground/30">
									Deep
								</span>
							</div>
						</section>

						{/* Note Input */}
						<section>
							<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-6 ml-2">
								Thoughts
							</h2>
							<Card className="border-none shadow-none bg-white/40 ring-1 ring-white/60 backdrop-blur-sm rounded-3xl overflow-hidden transition-all duration-500 focus-within:bg-white focus-within:shadow-md focus-within:ring-primary/20">
								<Textarea
									placeholder="Pour your mind here..."
									className="border-none resize-none bg-transparent p-8 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/30 min-h-[160px] focus-visible:ring-0 selection:bg-primary/20"
									value={note}
									onChange={(e) => setNote(e.target.value)}
								/>
							</Card>
						</section>
					</div>
				</div>

				{/* Floating Actions */}
				<div
					className={cn(
						"fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 delay-100",
						selectedMood
							? "translate-y-0 opacity-100"
							: "translate-y-20 opacity-0 pointer-events-none"
					)}
				>
					<Button
						onClick={handleSave}
						size="xl"
						variant="floating" // Ensure button.tsx has this or use default with classes
						className="rounded-full h-16 pl-8 pr-10 shadow-xl shadow-secondary/20 bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all duration-500 flex gap-4 items-center"
						disabled={isSaving}
					>
						<div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
						<span className="text-sm font-medium tracking-widest uppercase">
							{isSaving ? "Saving..." : "Save Entry"}
						</span>
					</Button>
				</div>
			</main>
		</div>
	)
}
