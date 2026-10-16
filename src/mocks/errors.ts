import type { ApiProblem } from '../types/marketplace.ts'
import { MAX_QUANTITY, MIN_QUANTITY } from '../lib/quantity.ts'

export class MockError extends Error {
  readonly status: number
  readonly problem: ApiProblem
  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.problem = { code, message, ...(fieldErrors && { fieldErrors }), ...(details && { details }) }
  }
}

export function invalid(field: string, message: string): never {
  throw new MockError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', { [field]: message })
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MockError(400, 'INVALID_BODY', 'Informe um objeto JSON.')
  return value as Record<string, unknown>
}

export function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) invalid(field, `Informe um texto entre 1 e ${max} caracteres.`)
  return value.trim()
}

export function integer(value: unknown, field: string, min = MIN_QUANTITY, max = MAX_QUANTITY): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) invalid(field, `Informe um inteiro entre ${min} e ${max}.`)
  return value
}

export function email(value: unknown): string {
  const result = text(value, 'email', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) invalid('email', 'E-mail inválido.')
  return result
}
