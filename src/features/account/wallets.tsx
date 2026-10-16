import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { getSessionToken } from '@/lib/session'
import { accountApi, acceptWallet } from '@/services/api/account'
import { networks } from '@/features/catalog/search'
import type { Network, Wallet, WalletInput, WalletType } from '@/types/marketplace'
import { Field, Result, type FieldErrors } from './form'
import { errorsFrom } from './validation'

const fields = [['displayName', 'Nome de exibição', 80, true], ['alias', 'Apelido da carteira', 80, true], ['profileName', 'Nome do perfil', 80, true], ['address', 'Endereço da carteira', 80, true], ['secondaryAddress', 'ENS ou endereço secundário', 80, false], ['referralCode', 'Código de indicação', 80, true], ['email', 'E-mail', 254, true], ['ens', 'Nome ENS', 255, false]] as const
export function WalletSlot({ role, wallet, onSaved }: { role: Wallet['role']; wallet?: Wallet; onSaved: () => void }) {
  const { session } = useAuth()
  const [editing, setEditing] = useState(role === 'primary')
  const label = role === 'primary' ? 'Carteira principal' : 'Carteira secundária'
  return <section className="account-wallet" aria-label={label}><header><div><h2>{label}</h2><p className="account-hint">{role === 'primary' ? 'Estas carteiras ficam disponíveis no pagamento para receber NFTs comprados.' : wallet ? 'Uma segunda opção para suas compras.' : 'Você ainda não adicionou uma carteira secundária.'}</p></div>{!editing && <button className="account-text-button" onClick={() => setEditing(true)}>{wallet ? 'Editar' : 'Adicionar'} {role === 'primary' ? 'principal' : 'secundária'}</button>}</header>{editing ? <WalletEditor key={`${session!.token}:${wallet?.id ?? role}`} role={role} wallet={wallet} close={() => { setEditing(false); onSaved() }} cancel={() => setEditing(false)} /> : wallet && <dl className="wallet-details"><div><dt>Nome</dt><dd>{wallet.displayName}</dd></div><div><dt>Apelido</dt><dd>{wallet.alias}</dd></div><div><dt>Rede</dt><dd>{networks[wallet.network]}</dd></div><div><dt>Tipo</dt><dd>{wallet.type}</dd></div><div><dt>Endereço</dt><dd>{wallet.address}</dd></div></dl>}</section>
}
function WalletEditor({ role, wallet, close, cancel }: { role: Wallet['role']; wallet?: Wallet; close: () => void; cancel: () => void }) {
  const { session } = useAuth()
  const token = session!.token
  const client = useQueryClient()
  const [defaults] = useState<WalletInput>(() => ({ role, displayName: session!.user.displayName, alias: '', profileName: session!.user.username, email: session!.user.email, ens: session!.user.ens, referralCode: '', secondaryAddress: null, network: 'ethereum', type: 'metamask', address: '' }))
  const [draft, setDraft] = useState<Partial<WalletInput>>({})
  const values: WalletInput = { ...(wallet ?? defaults), ...draft }
  const [errors, setErrors] = useState<FieldErrors>({})
  const busy = useIsMutating({ mutationKey: ['wallets', token] }) > 0
  const save = useMutation({
    mutationKey: ['wallets', token, 'save'], retry: false, gcTime: 0,
    mutationFn: (input: Partial<WalletInput>) => accountApi.wallet(token, input, wallet?.id),
    onSuccess: async (updated) => { await acceptWallet(client, token, updated); if (getSessionToken() === token) close() },
    onError: (error) => { if (getSessionToken() === token) setErrors(errorsFrom(error)) },
  })
  const change = (key: keyof WalletInput, value: string) => { setDraft((old) => ({ ...old, [key]: value })); setErrors((old) => ({ ...old, [key]: '' })); save.reset() }
  const textField = (key: typeof fields[number][0]) => {
    const [, label, max, required] = fields.find((field) => field[0] === key)!
    return <Field key={key} name={key} id={`${role}-${key}`} label={label} required={required} maxLength={max} type={key === 'email' ? 'email' : 'text'} autoComplete="off" value={values[key] ?? ''} disabled={busy} error={errors[key]} onChange={(event) => change(key, event.target.value)} />
  }
  return <form className="wallet-form" aria-label={`Dados da carteira ${role === 'primary' ? 'principal' : 'secundária'}`} noValidate aria-busy={save.isPending} onSubmit={(event) => {
    event.preventDefault()
    if (client.isMutating({ mutationKey: ['wallets', token] })) return
    const validation: FieldErrors = {}
    for (const [key, , max, required] of fields) { const value = values[key]?.trim() ?? ''; if ((required && !value) || value.length > max) validation[key] = `Informe ${required ? 'de 1 a' : 'até'} ${max} caracteres.` }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) validation.email = 'Informe um e-mail válido.'
    if (values.network === 'solana' ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(values.address.trim()) : !/^0x[a-fA-F0-9]{40}$/.test(values.address.trim())) validation.address = 'Formato de endereço incompatível com a rede selecionada.'
    setErrors(validation); save.reset()
    if (Object.keys(validation).length) { event.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(validation)[0]}"]`)?.focus(); return }
    // Patch only edited fields so background refreshes cannot overwrite newer metadata.
    const input: WalletInput = { role, network: values.network, type: values.type, displayName: values.displayName.trim(), alias: values.alias.trim(), profileName: values.profileName.trim(), email: values.email.trim(), address: values.address.trim(), referralCode: values.referralCode.trim(), ens: values.ens?.trim() || null, secondaryAddress: values.secondaryAddress?.trim() || null }
    const changes = Object.fromEntries(Object.keys(draft).map((key) => [key, input[key as keyof WalletInput]])) as Partial<WalletInput>
    if (!wallet || Object.keys(changes).length) save.mutate(wallet ? changes : input)
  }}><div className="account-grid">{textField('displayName')}{textField('alias')}<Field name="network" id={`${role}-network`} label="Rede" required error={errors.network}><select id={`${role}-network`} name="network" required value={values.network} disabled={busy} aria-invalid={!!errors.network} aria-describedby={errors.network ? `${role}-network-error` : undefined} onChange={(event) => change('network', event.target.value as Network)}>{Object.entries(networks).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>{textField('profileName')}{textField('address')}{textField('secondaryAddress')}<Field name="type" id={`${role}-type`} label="Tipo de carteira" required error={errors.type}><select id={`${role}-type`} name="type" required value={values.type} disabled={busy} aria-invalid={!!errors.type} aria-describedby={errors.type ? `${role}-type-error` : undefined} onChange={(event) => change('type', event.target.value as WalletType)}><option value="metamask">MetaMask</option><option value="walletconnect">WalletConnect</option><option value="coinbase">Coinbase</option></select></Field>{textField('referralCode')}{textField('email')}{textField('ens')}</div><Result error={save.error} /><div className="account-actions"><Button type="submit" disabled={busy || (!!wallet && !Object.keys(draft).length)}>{save.isPending ? 'Salvando carteira…' : 'Salvar carteira'}</Button><button type="button" className="account-text-button" disabled={busy} onClick={cancel}>Cancelar</button></div></form>
}
export function WalletHelp({ saved }: { saved: boolean }) { return <>{saved && <p className="account-success" role="status">Carteira salva. Conecte-a novamente no checkout antes de comprar.</p>}<p className="account-hint wallet-policy">Cada conta permite uma carteira principal e uma secundária. Ambas podem ser editadas. A edição encerra a conexão dessa carteira; recibos anteriores permanecem inalterados.</p><Link className="account-text-button" to="/checkout">Ir ao checkout</Link></> }






