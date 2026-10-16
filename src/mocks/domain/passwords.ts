import { invalid } from '../errors.ts'
import type { PasswordVerifier } from '../state/model.ts'

export function validatePassword(value: unknown, field = 'password'): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) invalid(field, 'Use de 8 a 128 caracteres, com letra e número.')
  return value
}

export async function derivePassword(password: string, salt: string, iterations = 100_000): Promise<PasswordVerifier> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations, hash: 'SHA-256' }, key, 256)
  return { salt, iterations, hash: [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
}
