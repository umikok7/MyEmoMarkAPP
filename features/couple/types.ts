export type SpaceKind = "personal" | "couple"

export type CoupleSpace = {
  id: string
  space_name: string | null
  status: "pending" | "accepted" | "rejected"
  user_id_1: string
  user_id_2: string
  creator_user_id: string
}
