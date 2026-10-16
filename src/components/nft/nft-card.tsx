import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { Nft } from '@/types/marketplace'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { useDetailSearch } from '@/features/nft/navigation'
import { artworkProps } from '@/lib/artwork'

export function NftImage({ image, eager = false, sizes = '(max-width: 767px) calc((100vw - 80px) / 2), (max-width: 999px) calc((100vw - 330px) / 2), (max-width: 1199px) calc((100vw - 388px) / 3), 256px', fullResolution = false }: { image: Nft['image']; eager?: boolean; sizes?: string; fullResolution?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <div className="nft-image">
    {image.src && !failed
      ? <img {...(fullResolution ? { src: image.src } : artworkProps(image.src, sizes))} alt={image.alt} loading={eager ? 'eager' : 'lazy'} width="400" height="400" onError={() => setFailed(true)} />
      : <span className="text-center text-xs text-muted-foreground">Imagem oficial indisponível</span>}
  </div>
}

export function NftCard({ nft, collection, imageSizes }: { nft: Nft; collection?: string; imageSizes?: string }) {
  const search = useDetailSearch()
  return <article className="nft-card" data-testid="nft-card" data-nft-id={nft.id}>
    <Link to="/nfts/$nftId" params={{ nftId: nft.id }} search={search} className="block rounded-lg">
      <NftImage key={nft.image.src} image={nft.image} sizes={imageSizes} />
      <div className="nft-card-content">
        <p className="nft-collection sr-only">{collection ?? nft.network}</p>
        <h3>{nft.name}</h3>
        <p className="font-semibold tabular-nums" data-testid="nft-price">{nft.priceEth.replace('.', ',')} ETH</p>
        <p className={`nft-availability ${nft.availableQuantity === 0 ? 'sold-out' : ''}`}>{nft.availableQuantity > 0 ? `${nft.availableQuantity} disponíveis` : 'Esgotado'}</p>
      </div>
    </Link>
    {nft.attributes.rarity === 'rare' && <span className="rarity-badge">RARO</span>}
    <FavoriteButton nft={nft} />
  </article>
}

export function NftSkeletons() {
  return <div className="nft-grid" aria-hidden="true" data-testid="catalog-skeleton">
    {Array.from({ length: 9 }, (_, index) => <div className="nft-card" key={index}><div className="nft-image shimmer" /><div className="nft-card-content space-y-2"><div className="shimmer h-4 w-4/5" /><div className="shimmer h-4 w-2/3" /><div className="shimmer h-3 w-1/2" /></div></div>)}
  </div>
}
