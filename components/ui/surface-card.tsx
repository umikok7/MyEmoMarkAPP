import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const surfaceCardVariants = cva("rounded-xl ring-1 ring-black/5", {
  variants: {
    variant: {
      glass: "bg-white/60 shadow-sm transition-colors duration-500 hover:bg-white/80",
      solid: "bg-[#fdfbf7] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]",
      muted:
        "border border-stone-100 bg-stone-50 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
})

export type SurfaceCardVariant = VariantProps<typeof surfaceCardVariants>["variant"]

export interface SurfaceCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceCardVariants> {}

export function SurfaceCard({ className, variant, ...props }: SurfaceCardProps) {
  return <div className={cn(surfaceCardVariants({ variant }), className)} {...props} />
}
