import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAvailability } from '@/hooks/use-availability'

const benefits = [
  { icon: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { icon: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { icon: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

export function SiteFooter() {
  const notice = useAvailability()
  const unavailable = () => notice('Esta área ainda não está disponível na demonstração.')
  return <footer className="site-footer page-container">
    <div className="footer-benefits">{benefits.map((benefit) => <div key={benefit.icon}><span className="benefit-icon" aria-hidden="true">{benefit.icon}</span><h2>{benefit.title}</h2><p>{benefit.text}</p></div>)}
      <form className="newsletter" onSubmit={(event) => { event.preventDefault(); notice('A newsletter ainda não está disponível nesta demonstração. Nenhum cadastro foi realizado.') }}><h2>Antecipe-se ao próximo lançamento</h2><div><label htmlFor="newsletter-email" className="sr-only">E-mail para novidades</label><input id="newsletter-email" type="email" placeholder="digite seu e-mail..." required autoComplete="email" /><Button type="submit">Enviar</Button></div><p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p></form>
    </div>
    <div className="footer-contact"><Link to="/" className="wordmark">KURIO</Link><p>Feito para colecionadores,<br />criadores e cultura</p><button onClick={() => notice('O endereço de contato é ilustrativo, conforme o layout da demonstração.')}>contato@email.com</button><button onClick={() => notice('O telefone é ilustrativo, conforme o layout da demonstração.')}>+55 11 4002 8922</button></div>
    <div className="footer-links"><div><h2>Meu perfil</h2>{['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'].map((label) => label === 'Meu perfil' ? <Link to="/profile" preload={false} key={label}>{label}</Link> : <button key={label} onClick={unavailable}>{label}</button>)}</div>
      <div><h2>Central de ajuda</h2>{['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => <button key={label} onClick={unavailable}>{label}</button>)}</div>
      <div><h2>Coleções</h2><Link to="/marketplace" search={{ category: ['art'] }}>Arte digital</Link><Link to="/marketplace" search={{ category: ['photography'] }}>Fotografia</Link><Link to="/marketplace" search={{ category: ['music'] }}>Música</Link><Link to="/marketplace" search={{ category: ['3d'] }}>Arte 3D</Link><button onClick={unavailable}>Utilidade</button></div>
      <div className="footer-social"><h2>Redes sociais</h2><div>{['99280.svg', 'd48dd.svg', 'b4111.svg', 'b8b84.svg', 'ca2da.svg'].map((file, index) => <button className="icon-button" key={file} aria-label={['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube'][index]} onClick={() => notice('Os perfis sociais são ilustrativos nesta demonstração.')}><DesignIcon file={file} /></button>)}</div><h2>Carteiras compatíveis</h2><p className="wallet-brands">METAMASK · WALLETCONNECT · COINBASE</p></div>
    </div>
    <p className="footer-copyright">© 2026 Kurio. Propriedade digital para todos.</p>
  </footer>
}
