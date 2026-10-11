"use client"

import { create } from "zustand"

export type AuthUser = {
  id: string
  name?: string
  email?: string
}

const STORAGE_KEY = "awesome-user"
const GUEST_ID = "guest"

type AuthState = {
  userId: string | null
  user: AuthUser | null
  isLoggedIn: boolean
  isHydrated: boolean
  hydrate: () => void
  signIn: (user: AuthUser) => void
  signOut: () => void
}

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {return null}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {return null}
  try {
    const parsed = JSON.parse(raw) as AuthUser | null
    return parsed?.id ? parsed : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  user: null,
  isLoggedIn: false,
  isHydrated: false,

  hydrate: () => {
    const user = readStoredUser()
    set({
      user,
      userId: user?.id ?? GUEST_ID,
      isLoggedIn: Boolean(user),
      isHydrated: true,
    })
  },

  signIn: (user) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user, userId: user.id, isLoggedIn: true, isHydrated: true })
  },

  signOut: () => {
    window.localStorage.removeItem(STORAGE_KEY)
    set({ user: null, userId: GUEST_ID, isLoggedIn: false, isHydrated: true })
  },
}))
