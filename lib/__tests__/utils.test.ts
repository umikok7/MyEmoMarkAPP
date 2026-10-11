import { describe, expect, it } from "vitest"
import { cn } from "../utils"

describe("cn", () => {
  it("merges conflicting tailwind classes with the last one winning", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("keeps unrelated classes", () => {
    expect(cn("text-sm", "bg-white")).toBe("text-sm bg-white")
  })

  it("ignores falsy inputs", () => {
    expect(cn("text-sm", false && "hidden", undefined)).toBe("text-sm")
  })
})
