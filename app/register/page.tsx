"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Sparkles, Flower } from "lucide-react"
import { buildApiUrl } from "@/lib/api"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const email = (document.getElementById("email") as HTMLInputElement).value
      const username = (document.getElementById("username") as HTMLInputElement).value
      const password = (document.getElementById("password") as HTMLInputElement).value

  const res = await fetch(buildApiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, username, password }),
      })

      if (!res.ok) throw new Error("Register failed")
      const payload = await res.json()
      const user = payload?.data?.user
      if (user) {
        localStorage.setItem("awesome-user", JSON.stringify(user))
      }
      window.location.href = "/"
    } catch (error) {
      console.error("Register failed", error)
      setIsLoading(false)
      alert("Register failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#fffdfa] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-secondary/10 to-transparent -z-10" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute top-40 -left-20 w-48 h-48 bg-blue-100/40 rounded-full blur-2xl opacity-50" />

      <main className="w-full max-w-sm flex flex-col items-center z-10 space-y-8 animate-fade-in-up">
        {/* Header / Illustration Area */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-white shadow-sm ring-1 ring-white/60 flex items-center justify-center mb-2 relative group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <Flower className="w-10 h-10 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-700" strokeWidth={1} />
            <Sparkles className="absolute top-0 right-0 w-4 h-4 text-primary/40 animate-pulse delay-700" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-wide text-foreground/90">Regist Center</h1>
            <p className="text-sm text-muted-foreground/60 tracking-wider font-light">
              Your quiet space awaits.
            </p>
          </div>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 ml-1" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="bg-white/80 border-transparent ring-1 ring-black/5 focus-visible:ring-primary/30 h-14 rounded-2xl transition-all duration-300 hover:bg-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 ml-1" htmlFor="username">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Your name"
                className="bg-white/80 border-transparent ring-1 ring-black/5 focus-visible:ring-primary/30 h-14 rounded-2xl transition-all duration-300 hover:bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 ml-1" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                className="bg-white/80 border-transparent ring-1 ring-black/5 focus-visible:ring-primary/30 h-14 rounded-2xl transition-all duration-300 hover:bg-white tracking-widest"
                required
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Button
              type="submit"
              className="w-full h-14 rounded-full bg-foreground text-background font-medium tracking-widest hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-xl shadow-foreground/5 disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-background rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-background rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-background rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
              ) : (
                <span className="flex items-center gap-2 group">
                  Register
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs text-muted-foreground/40 hover:text-foreground/60 transition-colors tracking-wide underline underline-offset-4 decoration-transparent hover:decoration-muted-foreground/30"
              >
                Already have an account? Log in
              </Link>
            </div>
          </div>
        </form>
      </main>

      <footer className="absolute bottom-6 w-full text-center">
        <p className="text-[10px] text-muted-foreground/20 font-mono">
          © {new Date().getFullYear()} AwesomeMark
        </p>
      </footer>
    </div>
  )
}
