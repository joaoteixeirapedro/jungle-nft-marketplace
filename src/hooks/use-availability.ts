import { createContext, useContext } from 'react'

export const AvailabilityContext = createContext<(message: string) => void>(() => undefined)
export function useAvailability() { return useContext(AvailabilityContext) }
