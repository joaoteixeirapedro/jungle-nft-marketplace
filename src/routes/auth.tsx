import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAvailability } from '@/hooks/use-availability'
import { authApi } from '@/services/api/auth'
import { ApiError } from '@/services/api/client'
import { useAuth } from '@/features/auth/auth-context'
import { safeAuthRedirect, validateAuthFields } from '@/lib/auth-navigation'
import '@/features/auth/auth.css'
import { AuthLink } from '@/features/auth/auth-link'
import { restoreAuthTrigger } from '@/features/auth/focus'

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">{[['88a3c.svg', 'green'], ['75804.svg', 'green-half'], ['a3c98.svg', 'yellow'], ['1c266.svg', 'blue'], ['1174b.svg', 'blue-half'], ['5f1dc.svg', 'red'], ['e1073.svg', 'red-half']].map(([file, position]) => <span className={`google-${position}`} key={file}><DesignIcon file={file!} /></span>)}</span>
}
function DividerLine({ right = false }: { right?: boolean }) {
  return <span><DesignIcon file={right ? '10a7c.svg' : 'f0bae.svg'} className="auth-desktop-copy" /><DesignIcon file="f587b.svg" className="auth-mobile-copy" /></span>
}
export function LoginPage() { return <AuthPage key="login" /> }
export function RegisterPage() { return <AuthPage key="register" register /> }

function AuthPage({ register = false }: { register?: boolean }) {
  const search = useSearch({ strict: false })
  const location = useRouterState({ select: (state) => state.location })
  const overlay = location.state.authDialog
  const destination = safeAuthRedirect(overlay?.redirect ?? search.redirect)
  const reason = overlay?.reason ?? search.reason
  const navigate = useNavigate()
  const auth = useAuth()
  const notice = useAvailability()
  const client = useQueryClient()
  const form = useRef<HTMLFormElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const controller = useRef<AbortController | null>(null)
  const submitted = useRef<Record<string, string> | null>(null)
  const navigated = useRef(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const readValues = () => Object.fromEntries([...new FormData(form.current!).entries()].map(([key, value]) => [key, String(value)]))
  const focusError = (validation: Record<string, string>) => [...(form.current?.querySelectorAll<HTMLInputElement>('input') ?? [])].find((input) => validation[input.name])?.focus()
  const close = () => {
    controller.current?.abort()
    const publicDestination = /^\/(profile|wallets|favorites|orders|checkout)(?:[/?#]|$)/.test(destination) ? '/marketplace' : destination
    void navigate({ href: overlay ? location.href : publicDestination, state: (previous) => ({ ...previous, authDialog: undefined }), replace: true, resetScroll: false })
  }
  useEffect(() => {
    const modal = dialog.current
    const overflow = document.documentElement.style.overflow
    const paddingRight = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`
    document.documentElement.style.overflow = 'hidden'
    modal?.showModal()
    return () => { controller.current?.abort(); submitted.current = null; modal?.close(); document.documentElement.style.overflow = overflow; document.body.style.paddingRight = paddingRight; requestAnimationFrame(restoreAuthTrigger) }
  }, [])
  useEffect(() => {
    if (auth.status === 'authenticated' && !navigated.current) {
      navigated.current = true
      void navigate({ href: destination, state: (previous) => ({ ...previous, authDialog: undefined }), replace: true, resetScroll: !overlay || destination !== location.href })
    }
  }, [auth.status, destination, navigate, overlay, location.href])
  const mutation = useMutation({
    mutationKey: ['authentication'], gcTime: 0,
    mutationFn: () => {
      const values = submitted.current
      submitted.current = null
      if (!values) throw new Error('Formulário indisponível. Tente novamente.')
      const input = { email: values.email!.trim(), password: values.password! }
      return register ? authApi.register({ ...input, username: values.username!.trim(), confirmPassword: values.confirmPassword! }, controller.current!.signal) : authApi.login(input, controller.current!.signal)
    },
    onError: (error) => {
      if (controller.current?.signal.aborted || axios.isCancel(error)) return
      if (error instanceof ApiError && error.fieldErrors) { setErrors(error.fieldErrors); focusError(error.fieldErrors) }
    },
  })
  const field = (name: string, label: string, placeholder: string, password = false) => <div className="auth-field-group" key={name}><label htmlFor={`auth-${name}`} className="sr-only">{label}</label><div className="auth-input-wrap"><input id={`auth-${name}`} name={name} type={password && !revealed[name] ? 'password' : name === 'email' ? 'email' : 'text'} placeholder={placeholder} autoComplete={password ? register ? 'new-password' : 'current-password' : name === 'email' ? 'email' : 'username'} autoCapitalize="none" spellCheck={false} maxLength={name === 'email' ? 254 : name === 'username' ? 32 : 128} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `error-${name}` : undefined} disabled={mutation.isPending} onInput={() => { if (errors[name]) setErrors((previous) => { const next = { ...previous }; delete next[name]; return next }) }} />{password && <button type="button" aria-label={`${revealed[name] ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={!!revealed[name]} onClick={() => setRevealed({ ...revealed, [name]: !revealed[name] })}><span className="auth-eye-desktop"><DesignIcon file={register ? 'f5a88.svg' : '5cb53.svg'} /></span><span className="auth-eye-mobile"><DesignIcon file="76f46.svg" /></span></button>}</div>{errors[name] && <p className="auth-field-error" id={`error-${name}`}>{errors[name]}</p>}</div>
  return <dialog className={`auth-dialog ${register ? 'auth-register' : 'auth-login'}`} ref={dialog} aria-labelledby="auth-title" aria-describedby="auth-description" onCancel={(event) => { event.preventDefault(); close() }}>
    <button className="auth-close icon-button" type="button" aria-label="Voltar sem entrar" onClick={close}><DesignIcon file="3c6c3.svg" /></button>
    <Link to="/" className="auth-wordmark" aria-label="Kurio, início">KURIO</Link>
    <nav className="auth-tabs" aria-label="Acesso à conta"><AuthLink redirect={destination} replace aria-current={!register ? 'page' : undefined}>Entrar</AuthLink><span aria-hidden="true" /><AuthLink mode="register" redirect={destination} replace aria-current={register ? 'page' : undefined}>Criar conta</AuthLink></nav>
    <h1 id="auth-title" className="auth-mobile-title">{register ? 'Criar perfil de colecionador' : 'Entrar'}</h1>
    <p id="auth-description" className="auth-description">{register ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.' : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}</p>
    {(reason === 'expired' || reason === 'invalid') && <p className="auth-feedback" role="alert">{reason === 'expired' ? 'Sua sessão expirou.' : 'Sua sessão não é válida.'} Entre novamente para retomar sua navegação.</p>}
    {auth.status === 'error' && <div className="auth-feedback" role="alert">Não foi possível verificar a sessão. Ela foi preservada. <button type="button" onClick={auth.retry}>Verificar novamente</button></div>}
    {auth.status === 'checking' || auth.status === 'authenticated' ? <p role="status" className="auth-feedback">Verificando sessão…</p> : <form ref={form} className="auth-form" noValidate aria-busy={mutation.isPending} onSubmit={(event) => {
      event.preventDefault()
      if (client.isMutating({ mutationKey: ['authentication'] })) return
      const values = readValues()
      const validation = validateAuthFields(values, register)
      setErrors(validation)
      if (Object.keys(validation).length) { focusError(validation); return }
      controller.current = new AbortController()
      submitted.current = values
      mutation.mutate()
    }}>
      <div className="auth-fields">{register && field('username', 'Nome de usuário', 'Nome de usuário')}{field('email', 'E-mail', register ? 'Digite seu e-mail' : 'contato@email.com')}{field('password', 'Senha', 'Senha', true)}{register && field('confirmPassword', 'Confirmar senha', 'Confirmar senha', true)}{!register && <button className="auth-forgot" type="button" onClick={() => notice('A recuperação de senha não está disponível nesta demonstração. Use as credenciais fictícias documentadas ou crie uma conta.')}>Esqueceu a senha?</button>}</div>
      {mutation.isError && !axios.isCancel(mutation.error) && <p className="auth-feedback" role="alert">{mutation.error instanceof ApiError ? mutation.error.message : 'Não foi possível concluir a autenticação. Tente novamente.'}</p>}{errors.form && <p className="auth-feedback" role="alert">{errors.form}</p>}
      <Button type="submit" className="auth-submit" disabled={mutation.isPending}>{mutation.isPending ? 'Aguarde…' : register ? <><span className="auth-desktop-copy">Criar conta</span><span className="auth-mobile-copy">Criar perfil</span></> : 'Entrar'}</Button>
    </form>}
    <div className="auth-social"><div className="auth-divider"><DividerLine /><p>Ou continue com</p><DividerLine right /></div><div className="auth-social-buttons"><button type="button" onClick={() => notice('O acesso por Google não está disponível nesta demonstração. Utilize e-mail e senha.')}><GoogleMark />Continuar com Google</button><button type="button" onClick={() => notice('O acesso por Facebook não está disponível nesta demonstração. Utilize e-mail e senha.')}><DesignIcon file="5561e.svg" />Continuar com Facebook</button></div></div>
    <p className="auth-mobile-switch">{register ? 'Já tem uma conta? ' : 'Novo na Kurio? '}<AuthLink mode={register ? 'login' : 'register'} redirect={destination} replace>{register ? 'Entre' : 'Crie uma conta'}</AuthLink></p>
  </dialog>
}
