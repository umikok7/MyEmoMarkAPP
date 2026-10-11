"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { saveMood } from "./api"
import type { SaveMoodInput } from "./api"
import { useSpaceStore } from "@/features/couple"

export const useSaveMood = () => {
  const { space, coupleSpaceId, resetToPersonal } = useSpaceStore()

  return useMutation({
    mutationFn: (input: Omit<SaveMoodInput, "space" | "coupleSpaceId">) =>
      saveMood({ ...input, space, coupleSpaceId }),
    onSuccess: () => {
      toast(space === "couple" ? "已记录到我们的空间" : "已记录", {
        description: "Mood recorded.",
        duration: 2000,
      })
      resetToPersonal()
    },
    onError: () => {
      toast("保存失败", { description: "请重试", duration: 2000 })
    },
  })
}
