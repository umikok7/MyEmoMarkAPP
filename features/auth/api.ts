import { apiPost } from "@/lib/api-client"
import type { AuthUser } from "@/store/use-auth-store"

export const loginWithPassword = async (account: string, password: string): Promise<AuthUser> => {
  const data = await apiPost<{ user: AuthUser }>("/auth/login", { account, password })
  if (!data.user) {
    throw new Error("Login failed")
  }
  return data.user
}

export const registerAccount = async (
  email: string,
  username: string,
  password: string
): Promise<AuthUser> => {
  const data = await apiPost<{ user: AuthUser }>("/auth/register", { email, username, password })
  if (!data.user) {
    throw new Error("Register failed")
  }
  return data.user
}

export const logoutSession = () => apiPost("/auth/logout")
