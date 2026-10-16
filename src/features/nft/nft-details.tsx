import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { NftCard, NftImage } from '@/components/nft/nft-card'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { useAvailability } from '@/hooks/use-availability'
import { formatEth, parseEth } from '@/lib/eth'
import { clampQuantity, quantityLimit, validQuantity } from '@/lib/quantity'
import { categories, networks } from '@/features/catalog/search'
import { catalogQuery } from '@/services/api/catalog'
import type { NftDetail } from '@/types/marketplace'
import type { catalogReturn } from './navigation'
import { useCart, useCartMutation } from '@/features/cart/use-cart'

function Artwork({ nft, back }: { nft: NftDetail; back: ReturnType<typeof catalogReturn> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { if (expanded) dialog.current?.showModal() }, [expanded])
  return <div className="detail-gallery">
    <div className="detail-mobile-tools"><Link {...back} className="detail-back" aria-label="Voltar ao catálogo"><DesignIcon file="0e8e8.svg" /></Link><FavoriteButton nft={nft} variant="mobile" /></div>
    <div className="detail-thumbnails" aria-label="Imagem do NFT"><button type="button" aria-label="Ampliar imagem do NFT" onClick={() => setExpanded(true)} disabled={!nft.image.src}><NftImage image={nft.image} eager sizes="70px" /></button></div>
    <div className="detail-artwork"><NftImage key={nft.image.src} image={nft.image} eager sizes="(max-width: 767px) calc(100vw - 56px), 444px" /><button type="button" className="detail-zoom icon-button" aria-label="Ampliar imagem do NFT" onClick={() => setExpanded(true)} disabled={!nft.image.src}><DesignIcon file="9ae7b.svg" /></button></div>
    <dialog className="artwork-dialog" ref={dialog} aria-labelledby="artwork-title" onClose={() => setExpanded(false)}><h2 id="artwork-title">{nft.name}</h2><Button autoFocus variant="outline" onClick={() => dialog.current?.close()}>Fechar imagem</Button>{expanded && <NftImage image={nft.image} eager fullResolution />}</dialog>
  </div>
}

export function NftDetails({ nft, back }: { nft: NftDetail; back: ReturnType<typeof catalogReturn> }) {
  const notice = useAvailability()
  const navigate = useNavigate()
  const cart = useCart()
  const add = useCartMutation()
  const initial = [...nft.editions].reverse().find((edition) => edition.availableQuantity > 0) ?? nft.editions[0]
  const [selection, setSelection] = useState({ id: initial?.id, quantity: 1, draft: '1', version: nft.version, feedback: '' })
  const selected = nft.editions.find((edition) => edition.id === selection.id) ?? initial
  const limit = quantityLimit(selected?.availableQuantity ?? 0)
  const quantity = clampQuantity(selection.quantity, limit)
  if (selection.version !== nft.version) {
    setSelection({ ...selection, id: selected?.id, quantity, draft: String(quantity), version: nft.version, feedback: limit === 0 ? 'Esta edição esgotou. Selecione outra edição disponível.' : `Preço ou disponibilidade atualizados. ${quantity !== selection.quantity ? `Quantidade ajustada para ${quantity}. ` : ''}Confira os valores antes de continuar.` })
  }
  const unavailable = !selected || limit === 0
  const price = selected?.priceEth ?? nft.priceEth
  const subtotal = formatEth(parseEth(price) * BigInt(quantity))
  const related = useQuery(catalogQuery({ collectionId: nft.collectionId, sort: 'recent', page: 1, pageSize: 6 }))
  const relatedItems = related.data?.items.filter((item) => item.id !== nft.id).slice(0, 5) ?? []
  const setQuantity = (value: number) => setSelection({ ...selection, quantity: clampQuantity(value, limit), draft: String(clampQuantity(value, limit)), feedback: '' })
  const purchaseNotice = () => { if (selected && validQuantity(selection.draft, limit) && !unavailable && cart.ready && !cart.pending) add.run({ kind: 'add', item: { nftId: nft.id, editionId: selected.id, quantity } }, () => { void navigate({ to: '/cart' }) }) }
  return <article className="nft-detail" aria-labelledby="nft-title">
    <nav className="detail-breadcrumb" aria-label="Caminho de navegação"><Link to="/">Início</Link><span aria-hidden="true"> / </span><Link {...back} aria-label="Mercado, Voltar ao catálogo">Mercado</Link></nav>
    <div className="detail-product"><Artwork nft={nft} back={back} />
      <div className="detail-sheet">
        <div className="detail-heading"><h1 id="nft-title">{nft.name}</h1><p className="detail-unit-price" data-testid="edition-price">{price} ETH</p></div>
        <div className="detail-about"><h2>Sobre este NFT:</h2><p>{nft.description}</p></div>
        <fieldset className="detail-editions"><legend>Edição:</legend><div className="edition-options">{nft.editions.map((edition) => <label className="edition-option" key={edition.id} data-selected={edition.id === selected?.id} data-unavailable={edition.availableQuantity === 0} title={`${edition.priceEth} ETH · ${edition.availableQuantity} disponíveis`}>
          <input type="radio" name={`edition-${nft.id}`} value={edition.id} checked={edition.id === selected?.id} disabled={edition.availableQuantity === 0} onChange={() => { const next = clampQuantity(quantity, quantityLimit(edition.availableQuantity)); setSelection({ ...selection, id: edition.id, quantity: next, draft: String(next), feedback: next !== quantity ? `Quantidade ajustada para ${next} nesta edição.` : '' }) }} aria-label={`Edição ${edition.label}, ${edition.priceEth} ETH, ${edition.availableQuantity > 0 ? `${edition.availableQuantity} disponíveis` : 'esgotada'}`} />
          {['1/1', '1/10', '1/50'].includes(edition.label) && <DesignIcon file={edition.label === '1/1' ? '091e2.svg' : edition.label === '1/50' && edition.id === selected?.id ? 'c4842.svg' : 'a9dab.svg'} />}<span>{edition.label}</span>
        </label>)}</div></fieldset>
        <p className={`detail-stock ${unavailable ? 'sold-out' : ''}`} role="status" data-testid="edition-stock">{unavailable ? 'Edição esgotada' : `${selected.availableQuantity} disponíveis nesta edição`}</p>
        <div className="detail-buy-bar"><div className="detail-quantity-row"><div className="detail-quantity"><label htmlFor="nft-quantity">Qtd.</label><button type="button" aria-label="Diminuir quantidade" disabled={unavailable || quantity <= 1} onClick={() => setQuantity(quantity - 1)}><span className="quantity-desktop-icon"><DesignIcon file="7d18c.svg" /></span><span className="quantity-mobile-icon"><DesignIcon file="dd0fb.svg" /></span></button>
          <input id="nft-quantity" type="text" inputMode="numeric" pattern="[0-9]*" role="spinbutton" aria-valuemin={1} aria-valuemax={limit || undefined} aria-valuenow={unavailable ? undefined : quantity} aria-label="Quantidade" aria-invalid={!unavailable && !validQuantity(selection.draft, limit)} aria-describedby="quantity-help quantity-feedback" disabled={unavailable} value={unavailable ? '—' : selection.draft} onChange={(event) => { const draft = event.target.value; setSelection({ ...selection, draft, quantity: validQuantity(draft, limit) ? Number(draft) : quantity, feedback: validQuantity(draft, limit) ? '' : `Informe um inteiro entre 1 e ${limit}.` }) }} onBlur={() => { if (!unavailable && !validQuantity(selection.draft, limit)) setSelection({ ...selection, quantity, draft: String(quantity), feedback: `Quantidade corrigida para ${quantity}. Limite: ${limit}.` }) }} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setQuantity(quantity + (event.key === 'ArrowUp' ? 1 : -1)) } }} />
          <button type="button" aria-label="Aumentar quantidade" disabled={unavailable || quantity >= limit} onClick={() => setQuantity(quantity + 1)}><span className="quantity-desktop-icon"><DesignIcon file="a803c.svg" /></span><span className="quantity-mobile-icon"><DesignIcon file="f8641.svg" /></span></button></div><p className="detail-mobile-price" data-testid="mobile-edition-price">{price} ETH</p></div>
          <div className="detail-actions"><Button className="detail-purchase" disabled={unavailable || !cart.ready || cart.pending || !validQuantity(selection.draft, limit)} onClick={purchaseNotice}><span className="purchase-desktop-label">COMPRAR</span><span className="purchase-mobile-label">Comprar NFT</span></Button><FavoriteButton nft={nft} variant="detail" /><button className="detail-cart" aria-label="Adicionar ao carrinho" disabled={unavailable || !cart.ready || cart.pending || !validQuantity(selection.draft, limit)} onClick={purchaseNotice}><DesignIcon file="3c537.svg" /></button></div>
          {quantity > 1 && !unavailable && <p className="detail-subtotal">Subtotal estimado: <strong data-testid="nft-subtotal">{subtotal} ETH</strong></p>}
        </div>
        <p id="quantity-feedback" className="detail-feedback" role="status" aria-live="polite">{cart.pending ? 'Adicionando ao carrinho…' : selection.feedback}</p>
        {add.isError && <p className="detail-feedback" role="alert">{add.error.message} Confira seu carrinho antes de tentar novamente. <Link to="/cart">Ver carrinho</Link></p>}
        <dl className="detail-token-info"><div><dt>ID do token:</dt><dd>{nft.id}</dd></div><div><dt>Coleção:</dt><dd>{nft.collection.name}</dd></div><div><dt>Criador:</dt><dd>{nft.creator.name}</dd></div><div><dt>Atributos:</dt><dd>{Object.values(nft.attributes).join(', ') || 'Não informados'}</dd></div></dl>
        <div className="detail-share"><span>Compartilhar este NFT:</span>{[['a4abe.svg', 'LinkedIn'], ['bec29.svg', 'E-mail'], ['fbcbd.svg', 'Twitter']].map(([file, label]) => <button className="icon-button" key={file} aria-label={`Compartilhar por ${label}`} onClick={() => notice('O compartilhamento social ainda não está disponível nesta demonstração.')}><DesignIcon file={file!} /></button>)}</div>
        <p id="quantity-help" className="detail-reservation-note">Estoque sujeito a atualização. A seleção não reserva unidades; valores finais serão confirmados pela cotação no checkout.</p>
      </div>
    </div>
    <section className="detail-metadata" aria-labelledby="metadata-title"><div className="detail-section-heading"><h2 id="metadata-title">Detalhes do NFT</h2><button onClick={() => notice('Avaliações de colecionadores não fazem parte dos fluxos desta demonstração.')}>Avaliações de colecionadores</button></div><p>{nft.description}</p><dl><div><dt>Rede:</dt><dd>{networks[nft.network]}</dd></div><div><dt>Categoria:</dt><dd>{categories[nft.category]}</dd></div><div><dt>Criador:</dt><dd>{nft.creator.name} — {nft.creator.bio}</dd></div><div><dt>Coleção:</dt><dd>{nft.collection.description}</dd></div>{Object.entries(nft.attributes).map(([name, value]) => <div key={name}><dt>{name}:</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="detail-related" aria-labelledby="related-title"><div className="detail-section-heading"><h2 id="related-title">Mais desta coleção</h2></div>{related.isPending ? <p role="status">Carregando coleção…</p> : related.isError ? <div role="alert">Não foi possível carregar a coleção. <Button variant="outline" onClick={() => void related.refetch()}>Recarregar coleção</Button></div> : relatedItems.length ? <div className="related-grid">{relatedItems.map((item) => <NftCard imageSizes="(max-width: 767px) calc((100vw - 80px) / 2), (max-width: 1199px) calc((100vw - 136px) / 3), 213px" key={item.id} nft={item} collection={nft.collection.name} />)}</div> : <p>Nenhum outro NFT disponível nesta coleção.</p>}</section>
  </article>
}
