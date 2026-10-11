"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as React from "react"
import { useAuthStore } from "@/store/use-auth-store"

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })

const AuthHydration = ({ children }: { children: React.ReactNode }) => {
  const hydrate = useAuthStore((state) => state.hydrate)

  React.useEffect(() => {
    hydrate()
  }, [hydrate])

  return <>{children}</>
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydration>{children}</AuthHydration>
    </QueryClientProvider>
  )
}
