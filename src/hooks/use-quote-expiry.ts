import { useEffect, useState } from 'react'

export function useQuoteExpiry(expiresAt: string | undefined) {
  const [expiredAt, setExpiredAt] = useState<string>()
  useEffect(() => {
    if (!expiresAt) return
    const timer = setTimeout(() => setExpiredAt(expiresAt), Math.max(0, Date.parse(expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [expiresAt])
  return !!expiresAt && expiredAt === expiresAt
}
