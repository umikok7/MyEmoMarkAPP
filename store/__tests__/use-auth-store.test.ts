import { beforeEach, describe, expect, it } from "vitest"
import { useAuthStore } from "../use-auth-store"

const resetStore = () => {
  useAuthStore.setState({ userId: null, user: null, isLoggedIn: false, isHydrated: false })
  window.localStorage.clear()
}

describe("useAuthStore", () => {
  beforeEach(resetStore)

  it("hydrate falls back to guest when nothing is stored", () => {
    useAuthStore.getState().hydrate()
    const state = useAuthStore.getState()
    expect(state.isLoggedIn).toBe(false)
    expect(state.isHydrated).toBe(true)
  })

  it("hydrate restores a stored user", () => {
    window.localStorage.setItem("awesome-user", JSON.stringify({ id: "u-1", name: "Aoi" }))
    useAuthStore.getState().hydrate()
    const state = useAuthStore.getState()
    expect(state.userId).toBe("u-1")
    expect(state.isLoggedIn).toBe(true)
  })

  it("signIn persists and signs in", () => {
    useAuthStore.getState().signIn({ id: "u-2" })
    const state = useAuthStore.getState()
    expect(state.isLoggedIn).toBe(true)
    expect(JSON.parse(window.localStorage.getItem("awesome-user") ?? "{}").id).toBe("u-2")
  })

  it("signOut clears storage and resets to guest", () => {
    useAuthStore.getState().signIn({ id: "u-3" })
    useAuthStore.getState().signOut()
    const state = useAuthStore.getState()
    expect(state.isLoggedIn).toBe(false)
    expect(window.localStorage.getItem("awesome-user")).toBeNull()
  })
})
