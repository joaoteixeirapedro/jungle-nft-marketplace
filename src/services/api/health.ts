import { queryOptions } from '@tanstack/react-query'
import { api } from '@/services/api/client'
import type { HealthResponse } from '@/types/diagnostics'

export const healthQueryOptions = queryOptions({
  queryKey: ['diagnostics', 'health'],
  queryFn: async ({ signal }) => {
    const response = await api.get<HealthResponse>('/health', { signal })
    return response.data
  },
})
