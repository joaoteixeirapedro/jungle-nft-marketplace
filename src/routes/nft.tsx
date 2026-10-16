import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/services/api/client'
import { nftQuery } from '@/services/api/catalog'
import { NftDetails } from '@/features/nft/nft-details'
import { catalogReturn } from '@/features/nft/navigation'
import '@/features/nft/nft-details.css'

export function NftPage() {
  const { nftId } = useParams({ from: '/nfts/$nftId' })
  const { returnTo } = useSearch({ from: '/nfts/$nftId' })
  const query = useQuery(nftQuery(nftId))
  const back = catalogReturn(returnTo)
  if (query.isPending) return <><Link {...back} className="detail-loading-back">Voltar ao catálogo</Link><section className="detail-loading" aria-label="Carregando NFT" role="status"><span className="sr-only">Carregando NFT…</span><div className="shimmer" /><div><div className="shimmer" /><div className="shimmer" /><div className="shimmer" /></div></section></>
  if (!query.data) return <section className="detail-error" role="alert"><h1>{query.error instanceof ApiError && query.error.status === 404 ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1><p>{query.error instanceof ApiError && query.error.status === 404 ? 'Este NFT não está disponível no catálogo.' : 'Confira sua conexão e tente novamente.'}</p>{!(query.error instanceof ApiError && query.error.status === 404) && <Button onClick={() => void query.refetch()}>Tentar novamente</Button>}<Button variant="outline" asChild><Link {...back}>Voltar ao catálogo</Link></Button></section>
  return <><NftDetails key={nftId} nft={query.data} back={back} />{query.isFetching && <p role="status" className="detail-refresh">Atualizando disponibilidade…</p>}{query.isError && <div role="alert" className="detail-refresh">Não foi possível atualizar os dados. <Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>}</>
}
