import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  // Button variants and their current overrides contain no conflicting
  // utilities, so they only need class joining, not a runtime Tailwind parser.
  return clsx(inputs)
}
