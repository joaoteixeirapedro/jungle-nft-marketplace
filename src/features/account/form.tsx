import type { InputHTMLAttributes, ReactNode } from 'react'
import { ApiError } from '@/services/api/client'
import { errorsFrom } from './validation'
import { Button } from '@/components/ui/button'

export type FieldErrors = Record<string, string>

export function Field({ name, label, error, children, ...input }: InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; error?: string; children?: ReactNode }) {
  const id = input.id ?? name
  return <div className="account-field" data-field={name}><label htmlFor={id}><span>{label}{!input.required && ' (opcional)'}</span>{input.required && <span className="account-required" aria-hidden="true">*</span>}</label>{children ?? <input {...input} id={id} name={name} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />}{error && <p id={`${id}-error`} className="account-error">{error}</p>}</div>
}
export function Result({ error, success }: { error: Error | null; success?: string }) {
  return <>{error && <p className="account-error" role="alert">{error.message}{errorsFrom(error).form && ` ${errorsFrom(error).form}`}</p>}{!error && success && <p className="account-success" role="status">{success}</p>}</>
}
export function AccountLoading() { return <div className="account-loading" role="status"><span className="sr-only">Carregando dados da conta…</span>{Array.from({ length: 6 }, (_, index) => <div key={index} className="shimmer" />)}</div> }
export function AccountFailure({ error, retry }: { error: Error; retry: () => void }) {
  const denied = error instanceof ApiError && error.status === 403
  return <div role="alert" className="account-feedback"><h2>{denied ? 'Acesso não permitido' : 'Não foi possível carregar os dados'}</h2><p>{error.message}</p>{!denied && <Button onClick={retry}>Tentar novamente</Button>}</div>
}


