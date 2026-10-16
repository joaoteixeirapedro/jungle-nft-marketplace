import { useEffect, useRef, useState } from 'react'
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAuth } from '@/features/auth/auth-context'
import { getSessionToken } from '@/lib/session'
import { accountApi, acceptProfile } from '@/services/api/account'
import { Field, Result, type FieldErrors } from './form'
import { errorsFrom, validateProfile } from './validation'
import type { PasswordUpdate, Profile, ProfileUpdate } from '@/types/marketplace'

const profileFields = [['displayName', 'Nome de exibição', 80], ['username', 'Nome de usuário', 32], ['email', 'E-mail', 254], ['ens', 'Nome ENS', 255], ['walletAlias', 'Apelido da carteira', 80]] as const
export function ProfileEditor({ profile }: { profile: Profile }) {
  const token = useAuth().session!.token
  const client = useQueryClient()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState('')
  const busy = useIsMutating({ mutationKey: ['profile', token] }) > 0
  const values = Object.fromEntries(profileFields.map(([key]) => [key, draft[key] ?? profile[key] ?? '']))
  const save = useMutation({
    mutationKey: ['profile', token, 'edit'], retry: false, gcTime: 0,
    mutationFn: (input: ProfileUpdate) => accountApi.profile(token, input),
    onSuccess: async (updated) => { await acceptProfile(client, token, updated); if (getSessionToken() === token) { setDraft({}); setSuccess('Perfil atualizado.'); setErrors({}) } },
    onError: (error) => { if (getSessionToken() === token) setErrors(errorsFrom(error)) },
  })
  return <><h2>Perfil do colecionador</h2><p className="sr-only" data-testid="account-summary">{profile.username} · {profile.email}</p><form className="profile-form" noValidate aria-label="Dados do perfil" aria-busy={save.isPending} onSubmit={(event) => {
    event.preventDefault()
    if (client.isMutating({ mutationKey: ['profile', token] })) return
    const validation = validateProfile(values)
    setErrors(validation); setSuccess(''); save.reset()
    if (Object.keys(validation).length) { event.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(validation)[0]}"]`)?.focus(); return }
    const input: ProfileUpdate = {}
    for (const [key] of profileFields) if (key in draft) { const value = draft[key]!.trim(); if (key === 'ens') input.ens = value || null; else input[key] = value }
    if (Object.keys(input).length) save.mutate(input)
  }}><div className="account-grid">{profileFields.map(([key, label, max]) => <Field key={key} name={key} label={label} maxLength={max} required={key !== 'ens'} type={key === 'email' ? 'email' : 'text'} autoComplete={key === 'email' ? 'email' : key === 'username' ? 'username' : key === 'displayName' ? 'name' : 'off'} value={values[key]} disabled={busy} error={errors[key]} onChange={(event) => { setDraft((old) => ({ ...old, [key]: event.target.value })); setErrors((old) => ({ ...old, [key]: '' })); setSuccess(''); save.reset() }} />)}<AvatarEditor profile={profile} /></div><Result error={save.error} success={success} /><Button type="submit" disabled={busy || !Object.keys(draft).length}>{save.isPending ? 'Salvando perfil…' : 'Salvar perfil'}</Button></form></>
}

export function AvatarEditor({ profile }: { profile: Profile }) {
  const token = useAuth().session!.token
  const client = useQueryClient()
  const file = useRef<HTMLInputElement>(null)
  const reader = useRef<FileReader | null>(null)
  const generation = useRef(0)
  const [candidate, setCandidate] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [validation, setValidation] = useState('')
  const [success, setSuccess] = useState('')
  const busy = useIsMutating({ mutationKey: ['profile', token] }) > 0
  useEffect(() => () => { generation.current++; reader.current?.abort() }, [])
  const save = useMutation({
    mutationKey: ['profile', token, 'avatar'], retry: false, gcTime: 0,
    mutationFn: (dataUrl: string | null) => accountApi.avatar(token, { dataUrl }),
    onSuccess: async (updated) => { await acceptProfile(client, token, updated); if (getSessionToken() === token) { setCandidate(null); setSuccess(updated.avatarUrl ? 'Avatar atualizado.' : 'Avatar removido.') } },
  })
  const cancel = () => { generation.current++; reader.current?.abort(); setReading(false); setCandidate(null); setValidation(''); save.reset(); if (file.current) file.current.value = '' }
  return <section className="avatar-editor" aria-labelledby="avatar-title"><h3 id="avatar-title">Avatar</h3><div className="avatar-controls">{profile.avatarUrl ? <img className="collector-avatar" src={profile.avatarUrl} alt={`Avatar de ${profile.displayName}`} /> : <span className="collector-avatar avatar-empty" role="img" aria-label="Sem avatar"><DesignIcon file="account-avatar.svg" /></span>}<Button type="button" aria-label="Alterar avatar" disabled={busy || reading} onClick={() => file.current?.click()}>Alterar</Button><button className="account-text-button" aria-label="Remover avatar" type="button" disabled={busy || reading || !profile.avatarUrl} onClick={() => { if (!client.isMutating({ mutationKey: ['profile', token] })) { setSuccess(''); cancel(); save.mutate(null) } }}>Remover</button></div><p id="avatar-hint" className="account-hint">PNG, JPEG ou WebP. Máximo de 1 MiB.</p><input hidden ref={file} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Imagem do avatar" aria-describedby="avatar-hint avatar-validation" disabled={busy || reading} onChange={(event) => {
    const selected = event.target.files?.[0]
    cancel(); setSuccess('')
    if (!selected) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)) { setValidation('Use uma imagem PNG, JPEG ou WebP.'); return }
    if (selected.size > 1_048_576) { setValidation('Limite de imagem: 1 MiB.'); return }
    const current = ++generation.current
    const next = new FileReader(); reader.current = next; setReading(true)
    next.onerror = () => { if (current === generation.current) { setReading(false); setValidation('Não foi possível ler a imagem. Selecione novamente.') } }
    next.onload = async () => {
      if (typeof next.result !== 'string') return
      const data = next.result
      const image = new Image(); image.src = data
      try { await image.decode(); if (current === generation.current && getSessionToken() === token) setCandidate(data) }
      catch { if (current === generation.current) setValidation('Imagem inválida. Selecione um arquivo de imagem válido.') }
      finally { if (current === generation.current) setReading(false) }
    }
    next.readAsDataURL(selected)
  }} />{reading && <p role="status">Preparando imagem…</p>}{validation && <p id="avatar-validation" role="alert" className="account-error">{validation}</p>}{candidate && <div className="avatar-preview"><img className="collector-avatar" src={candidate} alt="Prévia do novo avatar" /><p>A imagem atual será mantida até a confirmação.</p><Button type="button" disabled={busy} onClick={() => { if (!client.isMutating({ mutationKey: ['profile', token] })) { setSuccess(''); save.mutate(candidate) } }}>{save.isPending ? 'Salvando avatar…' : 'Confirmar avatar'}</Button><button type="button" className="account-text-button" disabled={busy} onClick={cancel}>Cancelar imagem</button></div>}<Result error={save.error} success={success} /></section>
}

export function PasswordEditor() {
  const token = useAuth().session!.token
  const client = useQueryClient()
  const form = useRef<HTMLFormElement>(null)
  const submitted = useRef<PasswordUpdate | null>(null)
  const controller = useRef<AbortController | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState('')
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const busy = useIsMutating({ mutationKey: ['profile', token] }) > 0
  useEffect(() => () => { submitted.current = null; controller.current?.abort() }, [])
  const save = useMutation({
    mutationKey: ['profile', token, 'password'], gcTime: 0, retry: false,
    mutationFn: () => { const input = submitted.current; submitted.current = null; if (!input) throw new Error('Preencha novamente o formulário.'); return accountApi.password(token, input, controller.current!.signal) },
    onSuccess: () => { if (getSessionToken() === token) { form.current?.reset(); setShown({}); setErrors({}); setSuccess('Senha alterada. Esta sessão foi mantida; as outras sessões foram encerradas.') } },
    onError: (error) => { if (getSessionToken() === token) setErrors(errorsFrom(error)) },
  })
  return <form ref={form} className="password-form" noValidate aria-label="Alterar senha" aria-busy={save.isPending} onSubmit={(event) => {
    event.preventDefault()
    if (client.isMutating({ mutationKey: ['profile', token] })) return
    const data = new FormData(event.currentTarget)
    const input = { currentPassword: String(data.get('currentPassword') ?? ''), newPassword: String(data.get('newPassword') ?? ''), confirmPassword: String(data.get('confirmPassword') ?? '') }
    const validation: FieldErrors = {}
    if (!input.currentPassword) validation.currentPassword = 'Informe a senha atual.'
    if (input.newPassword.length < 8 || input.newPassword.length > 128 || !/[A-Za-z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) validation.newPassword = 'Use de 8 a 128 caracteres, com letra e número.'
    if (input.confirmPassword !== input.newPassword || !input.confirmPassword) validation.confirmPassword = 'As senhas devem ser iguais.'
    setErrors(validation); setSuccess(''); save.reset()
    if (Object.keys(validation).length) { event.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(validation)[0]}"]`)?.focus(); return }
    submitted.current = input; controller.current = new AbortController(); save.mutate()
  }}><h2>Alterar senha</h2><p className="account-hint" id="password-policy">Use de 8 a 128 caracteres, com letra e número.</p>{([['currentPassword', 'Senha atual'], ['newPassword', 'Nova senha'], ['confirmPassword', 'Confirmar nova senha']] as const).map(([key, label]) => <Field key={key} name={key} label={label} error={errors[key]} required><div className="account-password-wrap"><input id={key} name={key} required maxLength={key === 'currentPassword' ? undefined : 128} disabled={busy} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} type={shown[key] ? 'text' : 'password'} aria-invalid={!!errors[key]} aria-describedby={`password-policy${errors[key] ? ` ${key}-error` : ''}`} onInput={() => { setErrors((old) => ({ ...old, [key]: '' })); setSuccess(''); save.reset() }} /><button type="button" aria-label={`${shown[key] ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={!!shown[key]} onClick={() => setShown((old) => ({ ...old, [key]: !old[key] }))}><DesignIcon file="account-password.svg" /></button></div></Field>)}<Result error={save.error} success={success} /><Button disabled={busy} type="submit">{save.isPending ? 'Alterando senha…' : 'Salvar senha'}</Button></form>
}





