import { useRouterState } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { validateCatalogSearch } from '@/features/catalog/search'

function validateDetailSearch(raw: { returnTo?: string }) {
  const value = raw.returnTo
  return { returnTo: typeof value === 'string' && /^(\/marketplace|\/)(\?[^#]*)?$/.test(value) && value.length < 2500 ? value : undefined }
}
export const detailSearchValidator = (raw: { returnTo?: string } & SearchSchemaInput) => validateDetailSearch(raw)
export function useDetailSearch() {
  return useRouterState({ select: ({ location }) => ({ returnTo: location.pathname.startsWith('/nfts/') ? validateDetailSearch(location.search).returnTo : `${location.pathname}${location.searchStr}` }) })
}
export function catalogReturn(returnTo?: string) {
  const url = new URL(validateDetailSearch({ returnTo }).returnTo ?? '/marketplace', 'http://local')
  const raw: Record<string, unknown> = {}
  for (const [key, value] of url.searchParams) {
    raw[key] = value
    try {
      const parsed: unknown = JSON.parse(value)
      if (typeof parsed === 'string' || ((key === 'category' || key === 'network') && Array.isArray(parsed))) raw[key] = parsed
    } catch { /* URL values can also be plain strings. */ }
  }
  return { to: url.pathname === '/' ? '/' as const : '/marketplace' as const, search: validateCatalogSearch(raw) }
}
