/** Same per-line integer limits as the simulated API. */
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 999
export function quantityLimit(available: number) { return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(available))) }
export function validQuantity(input: string, limit: number) {
  const value = Number(input)
  return /^\d+$/.test(input) && Number.isSafeInteger(value) && value >= MIN_QUANTITY && value <= limit
}
export function clampQuantity(value: number, limit: number) { return Math.max(MIN_QUANTITY, Math.min(value, Math.max(MIN_QUANTITY, limit))) }
