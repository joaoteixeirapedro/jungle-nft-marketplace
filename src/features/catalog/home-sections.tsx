import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { artworkProps } from '@/lib/artwork'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAvailability } from '@/hooks/use-availability'
import { homeHeroQuery, homeSecondaryQuery } from '@/services/api/catalog'
import { useDetailSearch } from '@/features/nft/navigation'

const art = '/assets/figma/'

export function HomeHero() {
  const search = useDetailSearch()
  // The hero is a curated slot; all NFT identity/image data still comes through REST.
  const query = useQuery(homeHeroQuery)
  const secondary = useQuery(homeSecondaryQuery)
  const nft = query.data
  return <section className="home-hero" aria-label="NFT em destaque">
    <div className="hero-copy"><p className="hero-welcome">Bem-vindo à Kurio</p>
      <h1><span className="desktop-hero-title">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span><span className="mobile-hero-title">SEJA DONO DA<br />CULTURA DIGITAL</span></h1>
      <p className="hero-description desktop-hero-title">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
      <p className="hero-description mobile-hero-title">Descubra NFTs selecionados de criadores do mundo todo.</p>
      <Button className="hero-cta" asChild><Link to="/marketplace" aria-label="Explorar NFTs">EXPLORAR <DesignIcon file="bf307.svg" className="mobile-hero-title" /></Link></Button>
      <DesignIcon file="a11b7.svg" className="hero-dots desktop-hero-title" />
    </div>
    <div className="hero-art">
      {query.isPending ? <div className="shimmer hero-main-image" aria-label="Carregando destaque" /> : query.isError ? <div className="hero-image-error" role="alert"><p>Destaque indisponível.</p><Button variant="outline" onClick={() => void query.refetch()}>Recarregar destaque</Button></div> : nft?.image.src ? <Link to="/nfts/$nftId" params={{ nftId: nft.id }} search={search} aria-label={`Ver ${nft.name}`}><img {...artworkProps(nft.image.src, '(max-width: 399px) 126px, (max-width: 767px) 138px, (max-width: 999px) 300px, (max-width: 1199px) 360px, 450px')} alt={nft.image.alt} width="450" height="450" fetchPriority="high" className="hero-main-image" /></Link> : null}
      {secondary.data?.image.src && <img className="hero-small-image" {...artworkProps(secondary.data.image.src, '58px')} loading="lazy" alt="" width="58" height="58" />}
    </div>
    <DesignIcon file="c6c5e.svg" className="mobile-hero-dots" />
  </section>
}

export function FeaturedBanner() {
  const search = useDetailSearch()
  const query = useQuery(homeSecondaryQuery)
  return <section className="featured-banner" aria-label="Oferta em destaque">
    <h3>NFT EM DESTAQUE</h3><p>OFERTA LIMITADA</p>
    {query.isPending ? <div className="shimmer aspect-square" /> : query.data?.image.src ? <Link to="/nfts/$nftId" params={{ nftId: query.data.id }} search={search} aria-label={`Ver ${query.data.name}`}><img {...artworkProps(query.data.image.src, '310px')} alt={query.data.image.alt} width="310" height="368" loading="lazy" /></Link> : <p>Oferta indisponível</p>}
  </section>
}

const articles = [
  { image: '9add2.png', date: '12 de setembro', reading: '6 min', title: 'Como funciona a propriedade de NFTs', description: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: '8f387.png', date: '13 de setembro', reading: '2 min', title: '10 artistas digitais para acompanhar', description: 'Conheça criadores que moldam a cultura digital.' },
  { image: '83794.png', date: '15 de setembro', reading: '3 min', title: 'Raridade, atributos e procedência', description: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: 'b7cfc.png', date: '15 de setembro', reading: '2 min', title: 'Como proteger sua carteira', description: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function HomeSections() {
  const notice = useAvailability()
  return <>
    <section className="home-promos" aria-label="Explore coleções">
      <article className="promo-card"><img {...artworkProps(art + '8f387.png', '292px')} width="292" height="250" alt="Macaco com jaqueta verde e óculos de sol" loading="lazy" /><div><h2>Lançamentos gênesis<br />de edição limitada</h2><p>Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><Button asChild><Link to="/marketplace" search={{ sort: 'recent', available: true }}>Explorar <span aria-hidden="true">→</span></Link></Button></div><DesignIcon file="68d8c.svg" className="promo-overlay" /></article>
      <article className="promo-card"><img {...artworkProps(art + '9add2.png', '292px')} width="287" height="250" alt="Macaco com paletó claro e gola verde" loading="lazy" /><div><h2>Arte digital selecionada<br />e muito mais</h2><p>Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.</p><Button asChild><Link to="/marketplace" search={{ category: ['art'] }}>Explorar <span aria-hidden="true">→</span></Link></Button></div><DesignIcon file="68d8c.svg" className="promo-overlay" /></article>
    </section>
    <section className="home-journal" aria-labelledby="journal-title"><h2 id="journal-title">Diário da Cunhagem</h2><p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p><div className="journal-grid">
      {articles.map((article) => <article key={article.title}><img {...artworkProps(art + article.image, '(max-width: 767px) calc(100vw - 48px), 268px')} width="268" height="195" alt="" loading="lazy" /><div><p className="journal-meta">{article.date} | Leitura de {article.reading}</p><h3>{article.title}</h3><p>{article.description}</p><button onClick={() => notice('Os artigos do Diário da Cunhagem são referências visuais. O conteúdo editorial não faz parte desta demonstração.')}>Ler mais <span aria-hidden="true">→</span></button></div></article>)}
    </div></section>
  </>
}
