import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft/nft-card'
import { nftQuery } from '@/services/api/catalog'
import type { CartLine, Totals } from '@/types/marketplace'

function PurchaseLine({ item }: { item: CartLine }) {
  // Historical names/prices/quantities always come from the order/receipt snapshot.
  // Only decorative artwork is looked up in the catalogue (not part of CartLine).
  const nft = useQuery(nftQuery(item.nftId))
  return <li className="purchase-line" data-testid="purchase-line"><NftImage sizes="100px" image={nft.data?.image ?? { src: null, alt: item.nftName }} /><div><Link to="/nfts/$nftId" params={{ nftId: item.nftId }}>{item.nftName}</Link><p>Edição {item.editionLabel} · Qtd. {item.quantity}</p><p>{item.unitPriceEth} ETH / unidade</p></div><strong>{item.lineTotalEth} ETH</strong></li>
}
export function PurchaseItems({ items }: { items: CartLine[] }) { return <ul className="purchase-items">{items.map((item) => <PurchaseLine key={item.id} item={item} />)}</ul> }
export function PurchaseTotals({ totals, couponCode }: { totals: Totals; couponCode: string | null }) {
  return <dl className="purchase-totals" data-testid="purchase-totals"><div><dt>Subtotal</dt><dd>{totals.subtotalEth} ETH</dd></div><div><dt>Desconto{couponCode ? ` (${couponCode})` : ''}</dt><dd>{totals.discountEth} ETH</dd></div><div><dt>Taxa de rede</dt><dd>{totals.networkFeeEth} ETH</dd></div><div className="purchase-total"><dt>Total</dt><dd data-testid="purchase-total">{totals.totalEth} ETH</dd></div></dl>
}
export function CheckoutSkeleton() {
  return <div className="checkout-layout" role="status" data-testid="checkout-skeleton"><span className="sr-only">Carregando carrinho, carteiras e cotação…</span><div className="shimmer h-96" aria-hidden="true" /><div className="shimmer h-96" aria-hidden="true" /></div>
}
