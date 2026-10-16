# Referências visuais e assets

O [Figma original](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) define a identidade visual. As referências locais foram extraídas do arquivo fornecido e de uma cópia de trabalho. As imagens desta pasta servem à comparação, não são usadas como screenshots da interface.

| Tela | Frame desktop | Frame mobile | Referência local |
| --- | --- | --- | --- |
| Início | `2:2` | `14:5226` | `home-desktop.png`, `home-mobile.png` |
| Detalhe do NFT | `10:244` | `15:5536` | `nft-detail-desktop.png`, `nft-detail-mobile.png` |
| Login | `9:115` | `16:1022` | `login-desktop.png`, `login-mobile.png` |
| Cadastro | `9:1022` | `16:1228` | `register-desktop.png`, `register-mobile.png` |
| Carrinho | `11:1278` | `16:360` | `cart-desktop.png` |
| Pagamento | `11:2862` | `16:748` | Inventário `checkout-assets.json` |
| Confirmação | `11:4385` | Sem frame próprio | Inventário `checkout-assets.json` |
| Perfil | `9:1238` | Sem frame próprio | `profile-reference.png` |
| Carteiras | `9:1670` | Sem frame próprio | `wallets-reference.png` |

Perfil e carteiras foram capturados no editor; o viewport corta parte dos frames. O acesso ao contexto automatizado teve limites de permissão/quota, e parte da inspeção/exportação ocorreu pelo navegador. Não se afirma comparação integral de pixels em todas as telas.

## Artes e ícones

| Identificador original | Arte |
| --- | --- |
| `8f387` | Macaco com jaqueta verde e óculos |
| `83794` | Macaco de chapéu e moletom roxo |
| `9add2` | Macaco com paletó e gola verde |
| `b7cfc` | Macaco dourado com fones verdes |

As fixtures associam essas artes aos NFTs em `src/mocks/data/artwork.ts`. As versões distribuídas estão em `public/assets/artwork`, nos tamanhos 320/640/1254 px. PNGs originais em `assets/originals/figma` são entradas dos scripts de otimização.

SVGs e ícones pequenos originais ficam em `public/assets/figma`. Os inventários `assets.json`, `detail-assets.json`, `auth-assets.json`, `cart-assets.json`, `checkout-assets.json` e `account-assets.json` registram os exports. Nomes derivados dos identificadores do Figma são mantidos para rastreabilidade. Os wrappers controlam composição e área de toque sem redesenhar a geometria dos ícones. Não foram geradas artes substitutas.

Roboto Mono 400/500/700 é distribuída localmente em WOFF2, com licença OFL em `public/fonts`. Os originais TTF e o conversor opcional estão preservados.

As adaptações funcionais e de acessibilidade estão em [ARCHITECTURE.md](../../ARCHITECTURE.md#figma-acessibilidade-e-assets). As oito baselines executáveis de início, detalhe, carrinho e pagamento ficam junto das suítes em `tests/e2e/*-snapshots`; capturas intermediárias de desenvolvimento não fazem parte da entrega.
