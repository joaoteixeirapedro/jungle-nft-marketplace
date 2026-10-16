# Entrega técnica · Prompt 12

Data: 16/10/2026. Este documento complementa o [enunciado original preservado](CHALLENGE_README.md), sem alterar seus requisitos. Valores em bytes; MB significa 1.000.000 bytes.

## A. Estado geral

O marketplace utiliza a stack exigida e passou na regressão final do build estático. Não restou falha funcional bloqueante nos cenários executados. O usuário pediu testar localmente antes de publicar na Vercel. O deploy obrigatório do enunciado permanece pendente por essa decisão; não há URL pública da aplicação nem verificação de fluxos públicos.

Foram otimizadas artes e fontes, divididas as rotas secundárias e corrigidos custos de matching dos assets no MSW e deslocamentos durante o carregamento. A regressão identificou um estilo de favoritos compartilhado que havia ficado no CSS de uma rota; ele foi movido para a camada global para preservar o acesso direto à conta. A infraestrutura Socket.IO/MSW e as regras de compra não foram substituídas.

## B. Imagens e fontes

| Categoria | Antes | Depois | Redução | Qualidade |
| --- | ---: | ---: | ---: | --- |
| Quatro artes, resolução completa 1254 px | 7.959.897 | 5.387.774 | 2.572.123 / 32,31% | WebP lossless; RGBA idêntico |
| Mesmas artes, conjunto de 320 px | 7.959.897 | 374.764 | 95,29% | Redimensionamento e codificação lossless |
| Mesmas artes, conjunto de 640 px | 7.959.897 | 1.472.910 | 81,50% | Redimensionamento e codificação lossless |
| Todos os arquivos de arte distribuídos, 3 resoluções | 7.959.897 | 7.235.448 | 724.449 / 9,10% | Inclui as 12 variantes; não é transferência por visita |
| SVGs e pequenos PNGs originais | 84.224 | 84.224 | 0% | Preservados; baixo impacto |
| **Total de imagens em `public/assets`** | **8.044.121** | **7.319.672** | **724.449 / 9,01%** | Originais grandes fora do build |
| Roboto Mono, três pesos | 237.008 | 114.064 | 122.944 / 51,87% | WOFF2; mapas, métricas e contornos iguais |

A economia por navegação é maior que a economia de disco: o navegador escolhe variantes em `srcset`/`sizes`. Não são baixadas todas as resoluções para cada uso. Hero é eager/prioritário; imagens secundárias são lazy; ampliação sempre usa 1254 px. Cart/checkout usam slots pequenos. Nenhuma imagem foi gerada artificialmente.

No Chromium, as artes recebidas na Home somaram **374.764 bytes em 390 px (1× e 2×)**, **736.952 em 1440 px/1×** e **2.749.200 em 1440 px/2×**. Em relação às quatro artes originais de 7.959.897 bytes, são reduções de 95,29%, 90,74% e 65,46%, respectivamente. A contagem deduplica URLs e considera o carregamento/captura descrito no script; não representa o tráfego total comprimido de HTML, JS e APIs.

As quatro comparações de canvas do Chromium verificaram 6.290.064 canais RGBA por arte, sem diferenças em resolução completa. O gerador Sharp também comparou bytes decodificados. Transparência e cores integram essa comparação. As versões menores foram conferidas nas capturas, nos cards e no comparativo de 450 px: não se afirma identidade de pixels após redimensionamento. As baselines desktop afetadas foram revisadas; o primeiro diff da Home tinha 37 pixels, e o checkout tinha um pixel na miniatura. Mobile permaneceu dentro das baselines existentes.

Originais recuperáveis em `assets/originals/{figma,fonts}`; não são copiados para `dist`. O gerador verifica hashes e reutiliza saídas válidas. Novos uploads de avatar continuam sob a validação existente, sem recompressão destrutiva.

Evidências: [pesos e hashes](assets/optimization.json), [fontes](assets/fonts.json), [inventário e comparação no navegador](assets/verification.json), [comparativo](assets/comparison-450.png), [miniatura do checkout](assets/checkout-thumbnail-comparison.png). O inventário registra 114 imagens distribuídas. Capturas cobrem Home, catálogo e detalhe em 390/768/1440 px e densidades 1×/2×.

| Uso | Arquivos | Exibição aproximada | Estratégia |
| --- | --- | --- | --- |
| NFTs/coleções e cards | Quatro artes oficiais compartilhadas pelas fixtures | 155–355 px, conforme grid | 320/640/1254 e sizes por contexto |
| Hero | Arte retornada pela API do NFT em destaque | 126–450 px | Prioridade alta, variante por viewport/DPR |
| Galeria | Arte da API do detalhe | Principal até 444 px; miniatura 98 px | Responsivo; zoom em resolução completa |
| Banners/editorial | Mesmas artes do Figma | 268–310 px | Lazy, variantes adequadas |
| Carrinho/compra/recibo | Arte consultada por identificador | 70–100 px | Variante pequena |
| Avatar/ícones | PNGs pequenos, SVGs e avatar enviado pelo usuário | 16–80 px | Originais preservados; dimensões explícitas quando aplicável |

## C. Performance

Foram concluídas **12 medições** no build final aprovado, três por combinação. [Resumo e configurações efetivas](lighthouse/final-delivery/summary.json).

| Página/perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP mediano | CLS mediano | TBT mediano |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home · desktop | 83 | 100 | 100 | 92 | 2.43 s | 0.00067 | 19.5 ms |
| Home · mobile | 67 | 100 | 100 | 92 | 5.59 s | 0.00009 | 282.0 ms |
| Detalhe · desktop | 96 | 100 | 100 | 92 | 1.34 s | 0.00009 | 0.0 ms |
| Detalhe · mobile | 75 | 100 | 100 | 92 | 4.62 s | 0.00000 | 183.0 ms |

A meta de performance 90 foi atingida no detalhe desktop; permanece abaixo na Home e no mobile. As metas de acessibilidade 95, boas práticas 95 e SEO 90 foram atingidas nas quatro combinações. Existem 12 HTMLs e 12 JSONs finais, além do resumo; as notas não foram arredondadas para ocultar falhas.

Perfis efetivos: desktop **1350×940, DPR 1, CPU 1×, RTT 40 ms, 10.240 Kbps**; mobile **412×823, DPR 1,75, CPU 4×, RTT 150 ms, 1.638,4 Kbps**. Chrome/Chromium **156.0.0.0**. Os parâmetros completos estão nos JSONs.

Comparação com a referência única anterior: performance Home **79→83 desktop**, **65→67 mobile**; detalhe **93→96 desktop**, **69→75 mobile**. Isso é uma referência exploratória antes versus medianas finais, sem afirmar significância estatística. CLS Home desktop **0,04300→0,00067**, Home mobile **0,06742→0,00009**, detalhe desktop **0,06070→0,00009**; detalhe mobile permaneceu 0.

O custo de inicializar o MSW/binding, executar React e obter o catálogo antes de descobrir a imagem principal continua no caminho crítico. A auditoria mobile também aponta JavaScript não utilizado e execução/CPU; o perfil aplica desaceleração 4×. A redução das artes melhora o payload real, mas não elimina esse custo nem a limitação de contabilização do Service Worker. São causas identificadas pelos relatórios, não uma afirmação de que a meta seja impossível. Melhorias adicionais exigem nova investigação do bootstrap e nova medição, preservando a simulação obrigatória.

Condições: build Vite de produção servido em 127.0.0.1:4174, Windows, Node 24.19.0, Lighthouse 13.5.0 e Chromium do Playwright 1.64.1. Perfis oficiais desktop/mobile, throttling simulado padrão, janela/perfil temporários e armazenamento novo por execução, cenário padrão, sem testes E2E concorrentes. Cada JSON contém viewport, DPR, throttling, user agent, ambiente e versões; o resumo inclui hash do HTML do build. INP não é medido por esta auditoria de navegação.

A referência anterior tem uma execução por combinação, insuficiente para uma mediana estatística: Home desktop/mobile 79/65 e detalhe desktop/mobile 93/69 em performance. Acessibilidade 100, boas práticas 96 e SEO 92. Ela está em `lighthouse/before`. Uma investigação intermediária sofreu TARGET_CRASHED ao concorrer com E2E; não foi usada como resultado final. Não foram desativados imagens, fontes, APIs, reconciliação ou eventos para pontuar.

O Service Worker faz o DevTools/Lighthouse reportar transferência zero de vários recursos atravessando o MSW. O `total-byte-weight` do Lighthouse subconta o carregamento e **não prova** uma visita de apenas 315 KB. Para imagens, a evidência separada soma corpos efetivamente recebidos no Chromium, por URL, e informa o `currentSrc`. Não equivale ao tráfego HTTP completo comprimido de uma visita.

Melhorias: WebP responsivo, WOFF2, lazy loading secundário, rotas sob demanda, preloads de módulos sem executar Socket.IO antes do MSW, CSS Tailwind restrito a `src`, bypass estático antes dos handlers de domínio, dimensões dos ícones e espaço reservado no detalhe. Cache financeiro/privado e reconciliação continuam conservadores.

## D. Visual, responsividade e acessibilidade

As mudanças visuais desta etapa se concentram em imagens/fontes e estabilidade do carregamento; não redesenham as páginas. As referências locais extraídas do Figma e as baselines do Prompt 11 são a base da comparação. Acesso MCP ao Figma continuou limitado pela quota; não se declara inspeção integral de todos os frames nesta etapa nem fidelidade pixel a pixel universal.

Home, catálogo e detalhe foram capturados em desktop, tablet e mobile, incluindo densidade dupla. Login, cadastro, favoritos, carrinho, checkout, recibo, perfil, carteiras e pedidos continuam na auditoria axe/teclado e regressão existentes. O teste de responsividade também cobre 320/390/768/1280/1440 px e reflow em 640 px. A operação por teclado inclui drawer, modais, zoom, formulários e revisão de compra. A comparação automática com baselines não substitui a referência do Figma nem certifica WCAG.

## E. Build e produção local

**TypeScript aprovado, ESLint aprovado sem warnings e build aprovado** pelos scripts do projeto. Uma exportação limpa do índice Git executou `npm ci`, build e 12 testes de domínio: 375 pacotes instalados, zero vulnerabilidades reportadas pelo npm, 41 chunks JS/CSS idênticos aos do workspace. [Evidência da cópia limpa](CLEAN_CHECKOUT.json). O aviso npm 11 sobre o postinstall opcional do MSW não impediu o uso do worker oficial já versionado. O build continua estático, sem processo de backend. O worker oficial está em `dist/mockServiceWorker.js`. O bootstrap registra os mocks também em produção; Axios recebe REST interceptado e o cliente Socket.IO recebe o handshake/eventos via MSW WebSocket e binding.

Rotas diretas, refresh, autenticação e acesso negado integram os E2E. O preview em 4174 fica disponível para avaliação local; os testes usam 4173 em contextos separados. `vercel.json` prepara o build, diretório, fallback SPA e worker sem cache persistente. Isso não comprova um deploy.

## F. Testes

A primeira regressão completa teve **104/106**: acesso direto aos favoritos no desktop falhou por CSS compartilhado carregado apenas na rota de detalhe; checkout desktop divergiu um pixel na miniatura otimizada. A correção de CSS preserva a ação real; a miniatura foi comparada antes da atualização pontual de baseline. O resultado inicial está em `REGRESSION_INITIAL.json`; traces e HTML locais foram preservados em `test-results/prompt12-initial` e `playwright-report/prompt12-initial`.

A regressão final passou em **106/106**, sem retries, falhas, skips ou atualização de baselines: 56 execuções desktop e 50 mobile, em 7,0 minutos. Resultado bruto em [DELIVERY_TEST_RESULTS.json](DELIVERY_TEST_RESULTS.json) e [relatório HTML](test-report/index.html). Os 12 testes de domínio também passaram. A suíte cobre busca/histórico, detalhes/404, sessão/isolamento, favoritos/rollback, carrinho/cupom, compra/recibo, recusa, idempotência, timeout, conta, eventos antigos/duplicados, reconexão, teclado e skeletons. Os testes de dados incluem uma verificação de migração que preserva preços, estoque, versões, usuários e pedidos existentes.

## G. Matriz final do README

| Requisito original | Status | Evidência | Pendência |
| --- | --- | --- | --- |
| Stack obrigatória com uso efetivo (§2) | Atendido e verificado | Código, lockfile, build; REST Axios/MSW e Socket.IO nos E2E | — |
| Descoberta, compra e conta desktop/mobile (§1/3) | Atendido e verificado | Suítes catálogo, detalhes, auth, cart, checkout e account | 106/106 na execução final |
| Busca/filtros/sort/página em URL e histórico (§3) | Atendido e verificado | `catalog.spec.ts` | — |
| Detalhe direto, 404, edições, limites e favoritos (§3) | Atendido e verificado | `nft-details.spec.ts`, `auth.spec.ts` | Corrigido e revalidado |
| Carrinho persistente e merge do visitante (§3) | Atendido e verificado | `cart.spec.ts`, `api.spec.ts` | — |
| ETH decimal preciso; quote da API (§3) | Atendido e verificado | BigInt em wei, `domain.test.ts`, carrinho/checkout | — |
| Revisão/revalidação e mudança exige novo aceite (§3) | Atendido e verificado | `checkout.spec.ts`, `realtime.spec.ts` | — |
| Pedido idempotente, timeout e estados terminais (§3/5) | Atendido e verificado | Dados/API/checkout/realtime | — |
| Recibo snapshot e baixa apenas do comprado (§3) | Atendido e verificado | Compra e testes de domínio | — |
| Sessão, expiração, proteção, logout e isolamento (§3/4) | Atendido e verificado | Auth/account/API/realtime | 106/106 na execução final |
| Perfil, avatar, senha e carteiras (§3/5) | Atendido e verificado | `account.spec.ts`; persistência após refresh | — |
| Contratos tipados, queries, mutations, cancelamento (§4/5) | Atendido e verificado | `types/marketplace.ts`, API, testes fora de ordem | — |
| Atualização otimista com rollback (§4) | Atendido e verificado | Favoritos e teste de falha | — |
| REST MSW, estado único, persistência/reset (§6) | Atendido e verificado | API/setup e domínio | — |
| Cenários determinísticos exigidos (§6) | Atendido e verificado | Controles e `api.spec.ts` | — |
| Socket.IO, eventos de domínio, cleanup/reconexão (§7) | Atendido e verificado | Setup/nft-details/realtime; sem polling | — |
| Imagens/fontes locais e identidade Figma (§8) | Parcialmente atendido | Assets oficiais, referências e capturas | Limite de comparação integral dos frames; adaptações documentadas |
| Viewports mínimos, sem overflow e shimmer (§8) | Atendido e verificado | Auditoria em 390/768/1440, reduced motion e screenshots | — |
| Teclado, foco, semântica e feedback (§8) | Atendido e verificado | Axe e testes de teclado/formulários | 26 scans axe, sem certificação WCAG |
| E2E nos 12 grupos e oito baselines (§9) | Atendido e verificado | 106 casos; HTML/JSON e traces de falha | 106/106, zero falhas restantes |
| Lighthouse: 3 medições × 2 páginas × 2 perfis (§10) | Atendido e verificado | 12 HTML + 12 JSON e medianas, runner/config versionados | — |
| Metas Lighthouse ≥90/95/95/90 (§10) | Parcialmente atendido | Medições reais e causas acima | Performance inicial abaixo de 90 em algumas combinações |
| Código, lockfile, assets, mocks e testes (§12) | Atendido e verificado | Código e relatórios versionados no commit de entrega; verificação de segredos | — |
| README, contratos e política de cache/sessão (§12) | Atendido e verificado | README, contratos e arquitetura | — |
| Checkout limpo sem serviços privados (§12) | Atendido e verificado | Dependências fixadas e scripts | npm ci + build + 12 testes aprovados |
| Deploy obrigatório e URL pública (§12) | Não atendido | Configuração Vercel preparada | Usuário adiou publicação para testar localmente |
| Versão pública correspondente e fluxos/refresh (§12) | Não verificável | Nenhuma publicação realizada | Testar após autorização e publicação |
| Blockchain/extensões/pagamentos reais | Não aplicável | Fora do escopo explícito (§1) | — |

## H. Documentação

README com setup/ambiente/contas/cenários/comandos/deploy e uso de IA; `CHALLENGE_README.md` com o enunciado intacto; `API_CONTRACTS.md` com REST/eventos; `ARCHITECTURE.md` com sessão, carrinho, cache, reconciliação e adaptações visuais. Contas de demonstração fictícias Alice/Bruno, senha `Demo#2026`. Relatórios anteriores continuam disponíveis como histórico e não substituem o estado final descrito aqui.

## I. Deploy

Repositório criado: https://github.com/joaoteixeirapedro/jungle-nft-marketplace. Vercel preparada, **publicação adiada expressamente pelo usuário**. Sem URL pública da aplicação, sem aprovação de testes públicos. O preview local permite testar todos os fluxos com MSW/Socket.IO; depois de publicar, esses fluxos deverão ser repetidos na origem pública HTTPS, incluindo worker, assets e refresh de rotas privadas/profundas.

## J. Pendências por prioridade

1. **Entrega externa:** publicar quando o usuário concluir sua avaliação e autorizar; verificar a URL pública. O requisito de deploy ainda não está cumprido.
2. **Performance:** Home 83/67 e detalhe mobile 75, abaixo de 90; causas e métricas registradas. Acessibilidade/boas práticas/SEO atingem as metas.
3. **Visual:** limites de comparação integral do Figma e diferenças/adaptações já documentadas. Não há alegação de correspondência absoluta.

## K. Principais arquivos

`src/lib/artwork.ts`, `src/lib/design-icon-dimensions.ts`, componente de imagem/ícone, Home, galeria, carrinho/resumo, rotas de conta e Router; estado/apresentação do tempo real; primeiro handler estático; CSS compartilhado; fixtures/migração; `public/assets/artwork`, WOFF2 e `assets/originals`; `scripts/optimize-assets.mjs`, `verify-assets.mjs`, `optimize-fonts.py`, `audit-lighthouse.mjs`, configuração Lighthouse; testes/baselines; package/lockfile; README/arquitetura/relatórios; `vercel.json`.

Validação de segurança: nenhum `.env` privado, token conhecido ou chave privada foi encontrado nos arquivos candidatos ao Git; o lockfile foi auditado pelo npm sem vulnerabilidades reportadas. Isso não é uma garantia universal de segurança. Este repositório não tinha commits anteriores: o commit de entrega reúne a aplicação existente e as melhorias desta etapa, sem inventar um histórico de desenvolvimento.
