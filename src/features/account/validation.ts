import { ApiError } from '@/services/api/client'
import type { FieldErrors } from './form'
export function errorsFrom(error: Error): FieldErrors { return error instanceof ApiError ? error.fieldErrors ?? {} : {} }
export function validateProfile(input: Record<string, string>) {
  const errors: FieldErrors = {}
  for (const field of ['displayName', 'walletAlias']) if (!input[field]?.trim() || input[field]!.trim().length > 80) errors[field] = 'Informe de 1 a 80 caracteres.'
  if (!/^[a-z0-9_]{3,32}$/i.test(input.username?.trim() ?? '')) errors.username = 'Use de 3 a 32 letras, números ou sublinhado.'
  if (!input.email?.trim() || input.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = 'Informe um e-mail válido.'
  if ((input.ens?.trim().length ?? 0) > 255) errors.ens = 'Use até 255 caracteres.'
  return errors
}


