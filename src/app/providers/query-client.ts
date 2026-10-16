import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/services/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status !== undefined && error.status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})
