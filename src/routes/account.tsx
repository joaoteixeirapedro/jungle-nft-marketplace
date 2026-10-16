import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { NftCard } from '@/components/nft/nft-card'
import { useAuth } from '@/features/auth/auth-context'
import { favoritesQuery } from '@/services/api/favorites'
import { profileQuery } from '@/services/api/account'
import { walletsQuery } from '@/services/api/checkout'
import { AccountLayout } from '@/features/account/layout'
import { AccountLoading, AccountFailure } from '@/features/account/form'
import { PasswordEditor, ProfileEditor } from '@/features/account/profile'
import { WalletHelp, WalletSlot } from '@/features/account/wallets'

export { AccountNavigation } from '@/features/account/layout'
export function FavoritesPage() {
  const auth = useAuth()
  const query = useQuery(favoritesQuery(auth.session!.token))
  return <AccountLayout title="Seus favoritos"><h2>Seus favoritos</h2>{query.isPending ? <AccountLoading /> : query.isError ? <div role="alert"><p>Não foi possível carregar favoritos.</p><Button onClick={() => void query.refetch()}>Tentar novamente</Button></div> : query.data.items.length ? <div className="nft-grid account-favorites">{query.data.items.map((nft) => <NftCard imageSizes="(max-width: 767px) calc((100vw - 80px) / 2), (max-width: 1100px) calc((100vw - 330px) / 2), (max-width: 1199px) calc((100vw - 458px) / 3), 262px" key={nft.id} nft={nft} />)}</div> : <p>Nenhum favorito salvo nesta conta.</p>}</AccountLayout>
}
export function ProfilePage() {
  const { session } = useAuth()
  const query = useQuery(profileQuery(session!.token))
  return <AccountLayout title="Meu perfil">{query.isPending ? <AccountLoading /> : query.isError && !query.data ? <AccountFailure error={query.error} retry={() => void query.refetch()} /> : <div key={session!.token} className="profile-editors">{query.isError && <AccountFailure error={query.error} retry={() => void query.refetch()} />}<ProfileEditor profile={query.data!} /><PasswordEditor /></div>}</AccountLayout>
}
export function WalletsPage() {
  const { session } = useAuth()
  const query = useQuery(walletsQuery(session!.token))
  const [saved, setSaved] = useState(false)
  return <AccountLayout title="Minhas carteiras">{query.isPending ? <AccountLoading /> : query.isError && !query.data ? <AccountFailure error={query.error} retry={() => void query.refetch()} /> : <div key={session!.token}>{query.isError && <AccountFailure error={query.error} retry={() => void query.refetch()} />}<p className="sr-only" data-testid="account-summary">{query.data!.items.length} carteiras cadastradas</p>{(['primary', 'secondary'] as const).map((role) => <WalletSlot key={role} role={role} wallet={query.data!.items.find((wallet) => wallet.role === role)} onSaved={() => setSaved(true)} />)}<WalletHelp saved={saved} /></div>}</AccountLayout>
}


