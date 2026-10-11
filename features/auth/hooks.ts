"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { loginWithPassword, logoutSession, registerAccount } from "./api"
import { useAuthStore } from "@/store/use-auth-store"

export const useLogin = () => {
  const signIn = useAuthStore((state) => state.signIn)
  const router = useRouter()

  return useMutation({
    mutationFn: ({ account, password }: { account: string; password: string }) =>
      loginWithPassword(account, password),
    onSuccess: (user) => {
      signIn(user)
      router.push("/")
      router.refresh()
    },
    onError: () => {
      toast("登录失败", {
        description: "请检查账号和密码后重试。",
        duration: 2200,
      })
    },
  })
}

export const useRegister = () => {
  const signIn = useAuthStore((state) => state.signIn)
  const router = useRouter()

  return useMutation({
    mutationFn: ({
      email,
      username,
      password,
    }: {
      email: string
      username: string
      password: string
    }) => registerAccount(email, username, password),
    onSuccess: (user) => {
      signIn(user)
      router.push("/")
      router.refresh()
    },
    onError: () => {
      toast("注册失败", { description: "请稍后重试。", duration: 2200 })
    },
  })
}

export const useLogout = () => {
  const signOut = useAuthStore((state) => state.signOut)
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logoutSession(),
    onSettled: () => {
      signOut()
      queryClient.clear()
      router.push("/login")
    },
  })
}
