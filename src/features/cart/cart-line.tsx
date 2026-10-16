import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { NftImage } from '@/components/nft/nft-card'
import { DesignIcon } from '@/components/ui/design-icon'
import { nftQuery } from '@/services/api/catalog'
import { quantityLimit, validQuantity } from '@/lib/quantity'
import type { CartLine as CartLineData } from '@/types/marketplace'
import type { CartOperation } from '@/services/api/cart'

export function CartLine({ item, pending, change, onDraft }: { item: CartLineData; pending: boolean; change: (operation: CartOperation) => void; onDraft: (id: string, dirty: boolean) => void }) {
  const nft = useQuery(nftQuery(item.nftId))
  const limit = quantityLimit(item.availableQuantity)
  const [draft, setDraft] = useState(String(item.quantity))
  const [previous, setPrevious] = useState(item.quantity)
  if (previous !== item.quantity) { setPrevious(item.quantity); setDraft(String(item.quantity)) }
  const valid = validQuantity(draft, limit)
  useEffect(() => { onDraft(item.id, draft !== String(item.quantity)) }, [draft, item.id, item.quantity, onDraft])
  const invalidStock = item.quantity > limit
  const update = (quantity: number) => { if (quantity >= 1 && quantity <= limit) { setDraft(String(quantity)); change({ kind: 'quantity', id: item.id, quantity }) } }
  const save = () => { if (valid && Number(draft) !== item.quantity) update(Number(draft)) }
  return <li className="cart-line" data-testid="cart-line" data-line-id={item.id}>
    <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} aria-label={`Ver ${item.nftName}`} className="cart-art"><NftImage sizes="100px" key={nft.data?.image.src} image={nft.data?.image ?? { src: null, alt: item.nftName }} /></Link>
    <div className="cart-item-name"><Link to="/nfts/$nftId" params={{ nftId: item.nftId }}><h2>{item.nftName}</h2></Link><p>{nft.data?.collection.name ?? (nft.isError ? 'Coleção indisponível' : 'Carregando coleção…')}</p><p>Edição: {item.editionLabel}</p><p className="cart-stock" role="status">{limit ? `${item.availableQuantity} disponíveis` : 'Edição esgotada'}</p></div>
    <p className="cart-unit" data-testid="cart-unit-price"><span className="sr-only">Preço unitário: </span>{item.unitPriceEth} ETH</p>
    <div className="cart-quantity"><button aria-label={`Diminuir quantidade de ${item.nftName}, edição ${item.editionLabel}`} disabled={pending || item.quantity <= 1 || !limit} onClick={() => update(Math.min(item.quantity - 1, limit))}><DesignIcon file="7d18c.svg" /></button>
      <input aria-label={`Quantidade de ${item.nftName}, edição ${item.editionLabel}`} type="text" inputMode="numeric" role="spinbutton" aria-valuemin={1} aria-valuemax={limit || undefined} aria-valuenow={item.quantity} aria-invalid={!valid || invalidStock} aria-describedby={`help-${item.id}`} value={draft} disabled={pending || !limit} onChange={(event) => setDraft(event.target.value)} onBlur={save} onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); save() }
        if (event.key === 'Escape') setDraft(String(item.quantity))
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); update(item.quantity + (event.key === 'ArrowUp' ? 1 : -1)) }
      }} />
      <button aria-label={`Aumentar quantidade de ${item.nftName}, edição ${item.editionLabel}`} disabled={pending || item.quantity >= limit} onClick={() => update(item.quantity + 1)}><DesignIcon file="a803c.svg" /></button>
    </div>
    <p className="cart-line-total" data-testid="cart-line-total"><span className="sr-only">Subtotal do item: </span>{item.lineTotalEth} ETH</p>
    <button className="cart-remove" aria-label={`Remover ${item.nftName}, edição ${item.editionLabel}`} disabled={pending} onClick={() => change({ kind: 'remove', id: item.id })}><DesignIcon file="cart-delete.svg" /></button>
    {(!valid || invalidStock) && <p id={`help-${item.id}`} className="cart-line-error" role="alert">{!limit ? 'Esta edição esgotou. Remova o item para continuar.' : `Informe um inteiro de 1 a ${limit} e pressione Enter ou saia do campo. O carrinho mantém a quantidade confirmada pela API.`}</p>}
  </li>
}
