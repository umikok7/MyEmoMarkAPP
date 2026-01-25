declare module "next-pwa" {
  import type { NextConfig } from "next"

  type PwaConfig = {
    dest: string
    disable?: boolean
  }

  export default function withPWA(config: PwaConfig): (nextConfig: NextConfig) => NextConfig
}
