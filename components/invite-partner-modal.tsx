"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buildApiUrl } from "@/lib/api"
import { toast } from "sonner"
import { UserPlus, X, Mail, AlertCircle, CheckCircle2 } from "lucide-react"

type ValidationStatus = "idle" | "validating" | "valid" | "invalid" | "self"

interface InvitePartnerModalProps {
  isOpen: boolean
  onClose: () => void
  onInvited: () => void
}

export function InvitePartnerModal({ isOpen, onClose, onInvited }: InvitePartnerModalProps) {
  const [email, setEmail] = React.useState("")
  const [spaceName, setSpaceName] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [validationStatus, setValidationStatus] = React.useState<ValidationStatus>("idle")
  const [validationMessage, setValidationMessage] = React.useState("")

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setValidationStatus("validating")

    try {
      const [spacesRes, currentUserRes, partnerRes] = await Promise.all([
        fetch(buildApiUrl("/couple-spaces"), { credentials: "include" }),
        fetch(buildApiUrl("/auth/profile"), { credentials: "include" }),
        fetch(buildApiUrl("/users/search", { q: email.trim() }), { credentials: "include" }),
      ])

      if (!spacesRes.ok || !currentUserRes.ok || !partnerRes.ok) {
        throw new Error("Validation failed")
      }

      const [spacesJson, currentUserJson, partnerJson] = await Promise.all([
        spacesRes.json(),
        currentUserRes.json(),
        partnerRes.json(),
      ])

      const currentUserEmail = currentUserJson?.data?.user?.email || ""

      if (email.trim().toLowerCase() === currentUserEmail.toLowerCase()) {
        setValidationStatus("self")
        setValidationMessage("This is your own email address")
        setIsLoading(false)
        return
      }

      if (!partnerJson?.data?.exists) {
        setValidationStatus("invalid")
        setValidationMessage("No user found with this email")
        setIsLoading(false)
        return
      }

      const partnerUserId = partnerJson?.data?.userId
      const spaces = (spacesJson?.data?.items || []) as Array<{
        user_id_1: string
        user_id_2: string
      }>
      const existingSpace = spaces.find(
        (s) => s.user_id_1 === partnerUserId || s.user_id_2 === partnerUserId
      )
      if (existingSpace) {
        setValidationStatus("invalid")
        setValidationMessage("A space already exists with this user")
        setIsLoading(false)
        return
      }

      const createRes = await fetch(buildApiUrl("/couple-spaces"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner_email: email.trim(),
          space_name: spaceName.trim() || undefined,
        }),
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(error?.message || "Failed to send invitation")
      }

      toast("Invitation sent", {
        description: "Your partner will receive an email shortly.",
        duration: 3000,
      })
      onInvited()
      handleClose()
    } catch (error) {
      console.error("Invite error:", error)
      setValidationStatus("invalid")
      setValidationMessage(error instanceof Error ? error.message : "Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setSpaceName("")
    setValidationStatus("idle")
    setValidationMessage("")
    onClose()
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (validationStatus !== "idle") {
      setValidationStatus("idle")
      setValidationMessage("")
    }
  }

  const getValidationIcon = () => {
    switch (validationStatus) {
      case "validating":
        return <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      case "valid":
        return <CheckCircle2 className="w-4 h-4 text-teal-500" />
      case "invalid":
      case "self":
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      default:
        return null
    }
  }

  const getValidationColor = () => {
    switch (validationStatus) {
      case "valid":
        return "border-teal-200 bg-teal-50/50"
      case "invalid":
      case "self":
        return "border-amber-200 bg-amber-50/50"
      default:
        return "border-transparent"
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-stone-200/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div
        className={cn(
          "relative w-[92%] max-w-sm rounded-[32px] bg-[#fdfbf7]",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]",
          "ring-1 ring-stone-200/50",
          "p-8 animate-[fadeScale_0.3s_ease-out]",
          "transition-all duration-500"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-stone-500" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-stone-800">Invite Partner</h2>
              <p className="text-xs text-stone-500">Share your emotional journey</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        <form onSubmit={validateAndSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600 ml-1">Partner Email</label>
            <div
              className={cn(
                "relative transition-all duration-300 rounded-2xl border",
                getValidationColor(),
                isFocused && "scale-[1.02]"
              )}
            >
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="partner@email.com"
                className={cn(
                  "w-full pl-11 pr-4 py-3 rounded-2xl bg-transparent",
                  "text-sm text-stone-700 placeholder:text-stone-400",
                  "focus:outline-none transition-all duration-300"
                )}
                required
              />
              {validationStatus !== "idle" && !isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {getValidationIcon()}
                </div>
              )}
            </div>
            {validationMessage && (
              <p
                className={cn(
                  "text-xs ml-3 transition-all duration-300",
                  validationStatus === "valid" && "text-teal-600",
                  (validationStatus === "invalid" || validationStatus === "self") && "text-amber-600"
                )}
              >
                {validationMessage}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600 ml-1">Space Name (optional)</label>
            <input
              type="text"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="Our Space"
              className={cn(
                "w-full px-4 py-3 rounded-2xl",
                "bg-stone-50 border border-transparent",
                "text-sm text-stone-700 placeholder:text-stone-400",
                "focus:outline-none focus:ring-1 focus:ring-stone-300 focus:bg-white",
                "transition-all duration-300"
              )}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className={cn(
                "w-full py-3 rounded-2xl",
                "bg-stone-800 text-white text-sm font-medium",
                "hover:bg-stone-700 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-300"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
