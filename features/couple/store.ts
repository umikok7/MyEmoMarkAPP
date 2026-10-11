"use client"

import { create } from "zustand"
import type { CoupleSpace, SpaceKind } from "./types"

type SpaceState = {
  space: SpaceKind
  coupleSpaceId: string | null
  setSpace: (space: SpaceKind, coupleSpaceId?: string) => void
  setDefaultCoupleSpace: (coupleSpaceId: string) => void
  resetToPersonal: () => void
}

export const useSpaceStore = create<SpaceState>((set) => ({
  space: "personal",
  coupleSpaceId: null,

  setSpace: (space, coupleSpaceId) => { set((state) => ({
      space,
      coupleSpaceId:
        space === "couple" ? (coupleSpaceId ?? state.coupleSpaceId) : state.coupleSpaceId,
    })); },

  setDefaultCoupleSpace: (coupleSpaceId) => { set({ coupleSpaceId }); },

  resetToPersonal: () => { set({ space: "personal" }); },
}))

export const pickAcceptedSpace = (spaces: CoupleSpace[]) =>
  spaces.filter((item) => item.status === "accepted")

export const pickPendingSent = (spaces: CoupleSpace[], userId: string | null) =>
  spaces.filter((item) => item.status === "pending" && item.creator_user_id === userId)

export const pickPendingReceived = (spaces: CoupleSpace[], userId: string | null) =>
  spaces.filter((item) => item.status === "pending" && item.creator_user_id !== userId)
