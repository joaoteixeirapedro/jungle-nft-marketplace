# Auditoria do marketplace — Prompt 11

Auditoria de 16/10/2026. O [README original](https://github.com/junglegaming/frontend-challenge/blob/main/README.md) foi lido integralmente (seções 1–12). O README local é o manual da solução; não substitui o enunciado. O Figma oficial é `Ff0SksUi7UFtPWUO8kyNtw`; referências locais e a cópia importada `lrCchkzKTa5nrWJT5nhUMN` preservam o arquivo fornecido pelo usuário.

## A. Resumo executivo

Os fluxos existentes foram auditados no build estático: descoberta, autenticação, favoritos, conta, carrinho, cotação, compra, recusa, recuperação idempotente, recibo e reconexão. REST e eventos continuam interceptados pelo MSW; não existe backend adicional.

Foram identificados **nove grupos de problemas**: oito corrigidos (itens 1–8 da seção G) e um de performance ainda pendente (peso dos PNGs). Não foi encontrada falha P0 no domínio de compras ou no isolamento das contas. A entrega pública ainda depende do Prompt 12: Lighthouse e deploy não estão concluídos nem aprovados por esta auditoria.

Resultado consolidado: **106/106 cenários Playwright aprovados** (execução completa + reteste dos casos afetados), **11/11 testes de domínio**, TypeScript/lint/build aprovados. A execução completa, isoladamente, teve 105 aprovações e uma diferença de baseline; o reteste final teve **10/10**, sem atualizar snapshots. Esse histórico é preservado, não apresentado como uma única execução completamente verde.

## B. Matriz de rastreabilidade

Status **V** = implementado e verificado; **P** = parcialmente implementado/verificado. Quando o teste contém várias asserções, a evidência é seu comportamento observado, não apenas a existência do arquivo. Os caminhos abaixo são relativos à raiz do projeto.

| Referência original / requisito | Status | Implementação → evidência e teste | Pendência |
| --- | --- | --- | --- |
| §2 / stack | P | `package.json`, router, queries, Axios, Button, Tailwind, MSW e Socket.IO participam dos fluxos; `setup.spec.ts` verifica REST pelo worker e cliente real sem polling | Lighthouse no Prompt 12 |
| §3 / início | V | `routes/home.tsx`, `home-sections.tsx`; `catalog.spec.ts` observa dados REST e navegação do destaque | Diferenças de conteúdo descritas em D |
| §3 / URL e catálogo | V | `features/catalog/{search,catalog,filters}.tsx`; busca, rede + preço, sort, página 2, refresh e histórico no mesmo teste de `catalog.spec.ts` | — |
| §3 / consultas assíncronas | V | Query keys com parâmetros, cancelamento e descarte; testes de resposta antiga, vazio e retry em `catalog.spec.ts` | — |
| §3 / detalhe | V | `nft-details.tsx`, `routes/nft.tsx`; acesso direto, 404, ampliação, edições e quantidade em `nft-details.spec.ts` | Contrato oferece uma imagem por NFT |
| §3 / favoritos | V | `favorite-button.tsx`; persistência, sincronização, rollback e troca de sessão em `nft-details.spec.ts`/`auth.spec.ts` | — |
| §3 / carrinho | V | `routes/cart.tsx`, `features/cart`; edição, remoção, limites, refresh e merge visitante em `cart.spec.ts` | — |
| §3 / cupom | V | Domínio central de carrinho/cotação; válido, inválido, expirado, substituição e remoção em `cart.spec.ts` | — |
| §3 / ETH | V | Strings nos contratos e `lib/eth.ts` com `BigInt`; precisão de 18 casas e totais da API em `domain.test.ts`/`cart.spec.ts` | Números dos sliders representam centésimos inteiros, não cálculo financeiro em float |
| §3 / checkout | V | `routes/checkout.tsx`; campos, carteira, rede, conexão, revisão e nova validação da API em `checkout.spec.ts` | — |
| §3 / cotação obsoleta | V | Revalidação e fingerprint no domínio; UI bloqueia preço/estoque/cupom/rede inválidos em `checkout.spec.ts`/`realtime.spec.ts` | — |
| §3 / pagamento | V | Estados definidos pela API, não por temporizador da UI; confirmação/recusa/pendência e preservação dos itens em `checkout.spec.ts` | — |
| §3 / recibo | V | `receiptQuery`, snapshot em `mocks/domain/orders.ts`; teste muda catálogo, recarrega e compara recibo anterior | — |
| §3 / sessão | V | `AuthProvider`, proteção de rotas, navegação segura; cadastro/conflito/login/logout/refresh/expiração em `auth.spec.ts` | — |
| §3 / retomada e isolamento | V | Queries/subscriptions por identidade, cancelamento de respostas; A/B, checkout interrompido e pedidos/recibos 403 em `auth.spec.ts`, `account.spec.ts`, `checkout.spec.ts` | — |
| §3 / perfil e avatar | V | `features/account/profile.tsx`; validação, falha, prévia, API, header e refresh em `account.spec.ts` | — |
| §3 / senha | V | Formulário sem persistir credenciais; PBKDF2 no mock, invalidação das outras sessões; `account.spec.ts` e `domain.test.ts` | — |
| §3 / carteiras | V | Slots principal/secundária, unicidade, rede e edição em `wallets.tsx`; `account.spec.ts` verifica impacto no checkout e recibo histórico | — |
| §3 / ações auxiliares | V | Avisos honestos para áreas editoriais; perfil do rodapé corrigido; `catalog.spec.ts`/`audit.spec.ts` verificam foco e navegação | — |
| §4 / estado e cache | V | Router/Query/Axios tipados, retries documentados, descarte de snapshots antigos; testes de catálogo, sessão e realtime | — |
| §4 / otimista | V | Favoritos têm snapshot anterior e rollback real; teste provoca falha e verifica recuperação | — |
| §4 / rotas | V | Acesso direto, fallback SPA local e 404 em `setup.spec.ts`; recursos 403/404 em demais jornadas | Hospedagem pública ainda não verificada |
| §5 / REST | V | Recursos mínimos e erros documentados em `API_CONTRACTS.md`; seis grupos em `api.spec.ts`, além das jornadas via Axios | — |
| §5 / idempotência | V | Chave por usuário + fingerprint; repetição recupera e corpo diferente retorna 409; `domain.test.ts`, `api.spec.ts`, `checkout.spec.ts` | — |
| §6 / mocks e fixtures | V | Banco único persistido, dois usuários, 30 NFTs/90 edições, reset; `api.spec.ts` verifica handlers, consistência e persistência | — |
| §6 / cenários | V | `mocks/http.ts`, controles de rede/HTTP, latência, sessão, cupom, preço/estoque, pagamento e timeout; APIs e UI exercitadas | — |
| §6 / transporte | V | MSW WebSocket + `toSocketIo` + `socket.io-client` com `transports:['websocket']`; `setup.spec.ts`/`realtime.spec.ts` | Limitações do binding documentadas em `ARCHITECTURE.md` |
| §7 / eventos | V | `nft.updated` e `order.updated` atravessam transporte; versão/ID, duplicatas, mensagens antigas e terminais em `realtime.spec.ts` | — |
| §7 / recuperação | V | Reconciliação REST dos recursos ativos, listeners liberados, tentativa preservada; desconexão/refresh não criam compra em `realtime.spec.ts` | — |
| §8 / visual | V | Comparação real com frames/referências em D; correção da barra mobile e capturas do build | Não equivale a igualdade pixel a pixel |
| §8 / responsividade | V | `audit.spec.ts`: 320, 390, 768, 1280, 1440 e reflow equivalente a zoom 200%; inclui interação e medições | Não houve teste de zoom nativo em todos os navegadores |
| §8 / skeletons | V | Shimmer de catálogo/detalhe/resumo e reduced motion verificados por suites de catálogo, detalhe e carrinho | — |
| §8 / acessibilidade | V | Axe + teclado/foco e formulários reais; resultados e limitações em E | Não é certificação WCAG completa |
| §9 / jornadas E2E | V | Chromium desktop/mobile; jornadas A–I cobertas pelas suites existentes e ampliadas | Sem Firefox/WebKit, que não são exigidos pelo enunciado |
| §9 / baselines | P | Seis novas imagens de início/detalhe/carrinho + duas existentes de pagamento; snapshots determinísticos | Arquivos preparados para versionamento; sem commit por identidade Git ausente |
| §10 / performance | P | Revisão de assets, cache, listeners e build em F | 12 Lighthouse, métricas e metas ainda não medidos |
| §12 / documentação | P | Setup, env, cenários, contratos, arquitetura, testes e evidências locais | Revisão final e comando Lighthouse no Prompt 12 |
| §12 / entrega pública | P | Build/preview local funciona com mocks e rotas diretas | Repositório de entrega e URL pública ainda não configurados |

Não se aplicam integrações reais de blockchain, extensões ou gateways: estão explicitamente fora do escopo original. Favoritos e histórico usam a composição da conta; não há frames próprios identificados para essas listas.

## C. Testes automatizados e evidências

- Primeira regressão de produção, antes das correções: **100/100**, zero retries, 6,3 minutos.
- Domínio: **11/11**. Precisão ETH, estoque, snapshot, idempotência concorrente, sessão, conta, limites e versões.
- Novos testes: três grupos em `tests/e2e/audit.spec.ts`, executados nos dois perfis; completam regressão visual, scans de acessibilidade e teclado/reflow/console.
- A primeira execução nova reproduziu problemas de semântica/foco. Traces preservados em `test-results/audit`, `test-results/audit-fixed` e `test-results/prompt11-regression`; não foram removidos testes para obter aprovação.
- A regressão completa ampliada terminou com **105/106 aprovados**, zero retries e zero skips, em 6,8 minutos. A única falha foi a baseline antiga do rodapé de pagamento desktop (124 pixels); não foi falha de pedido/pagamento. Após revisar o diff, a baseline foi atualizada e a jornada completa passou (**1/1**) em 13,5 segundos. Reteste final: **10/10 aprovados**, zero retries/falhas/skips, em 1,5 minuto, sem atualizar snapshots. Incluiu as seis execuções de auditoria, a jornada de compra nos dois perfis e busca/filtros/ordenação/paginação/histórico nos dois perfis. A união dos resultados pelo `testId` está em `AUDIT_RESULTS.json`: 106 casos, 106 aprovados, zero falhas restantes.

`api.spec.ts` usa fetch dentro da página para testar a rede do MSW; jornadas de interface usam os serviços Axios da aplicação. Alterações de cenário/estoque/replay são enviadas aos controles HTTP do mock; não há chamada do teste a setters ou ao cache. Um pedido histórico já existente não é contado como nova compra nos testes de timeout.

As baselines novas do carrinho foram revistas após a correção de dl (altura +2 px desktop / +5 px mobile). A troca do botão de perfil do rodapé por link também deslocou ligeiramente seu texto, exigindo revisão da baseline antiga de pagamento desktop (124 pixels, localizados nesse texto). O diff e trace anteriores foram preservados; não houve relaxamento de tolerância nem máscara para ocultar a mudança. Snapshots mascaram apenas ID/horário voláteis da cotação. Os dados vêm do reset determinístico; fontes/imagens são locais e carregadas antes das capturas. Uma baseline registra a implementação revisada, não substitui a comparação com o Figma. Chromium/Windows é o ambiente das imagens.

Relatórios locais: [regressão completa](../playwright-report/prompt11-regression/index.html) e [reteste final aprovado](../playwright-report/prompt11-recheck/index.html). O primeiro mantém a falha visual já resolvida; o segundo prova sua correção e as verificações afetadas. [Resumo JSON consolidado](AUDIT_RESULTS.json) é calculado a partir dos dois relatórios por identidade estável de teste, sem alterar os relatórios originais.

Todos os 106 casos atuais foram executados; nenhum foi pulado. A suíte completa de desenvolvimento não foi repetida separadamente, pois os mesmos casos rodaram contra o build otimizado. Lighthouse e auditoria da hospedagem pública não foram executados nesta etapa. Também foram preservadas 24 capturas finais (12 telas em 1440/414), uma prova extra da barra mobile e quatro capturas contextuais do editor Figma em `screenshots/prompt11`; geometria, erros e assets estão nos JSONs desse diretório.

## D. Figma e inspeção visual

O conector retornou novamente limite do plano Starter para screenshot de pagamento. Não houve upgrade nem alteração de desenho/metadados nesta etapa. Foram usadas as referências já extraídas e o editor no navegador para os frames que faltavam. Capturas do editor preservam o contexto e o zoom; não são exports 1:1 nem assets da aplicação.

| Tela | Frame / fonte de comparação | Desktop e mobile | Resultado / diferenças restantes |
| --- | --- | --- | --- |
| Início | `2:2`, `14:5226`; `docs/figma/home-*.png` | Ambos | Arte, hero, cards, paleta e composição conferidos; posição de carrinho/conta mobile corrigida. Filtros e paginação reais, estoque/raridade e dados da API alteram altura e textos. |
| Catálogo | Componente de descoberta dos frames de início; sem frame independente identificado | Ambos | Grid/filtros reutilizados, busca e estados extras funcionais. Não se atribui um frame inexistente ao catálogo. |
| Detalhe | `10:244`, `15:5536`; `nft-detail-*.png` | Ambos | Galeria e barra de compra conferidas. Uma miniatura em vez de quatro cópias idênticas; sem ratings, royalties, contratos ou edição aberta inventados. Metadados/estoque reais alteram altura. |
| Login | `9:115`, `16:1022`; `login-*.png` | Ambos | Composição modal desktop/página mobile, ícones e fonte conferidos. Credenciais não são preenchidas como desenho; feedback e voltar têm função real. |
| Cadastro | `9:1022`, `16:1228`; `register-*.png` | Ambos | Mesma identidade, campos reais, conflito e erros. Mensagens podem ampliar formulário; não há OAuth fictício. |
| Carrinho | `11:1278`, `16:360`; export desktop e editor mobile | Ambos | Colunas, resumo, controles e delete original conferidos; semântica do resumo corrigida. Estoque/edição, quote e validação aumentam altura. |
| Pagamento | `11:2862`, `16:748`; editor nesta auditoria | Ambos | Duas colunas desktop, prioridade de carteiras mobile. Só carteiras cadastradas são oferecidas, com conexão/rede explícitas; campos/itens expansíveis e revisão. |
| Confirmação / recibo | `11:4385`; editor nesta auditoria | Desktop; mobile adaptado | Cartão central, ilustração original 80×80 e borda âmbar. Dados e referência vêm do snapshot; inclui identificação explícita da simulação. Sem frame mobile próprio. |
| Perfil | `9:1238`; referência local e medidas do refinamento anterior | Desktop; mobile adaptado | Ícones originais, coluna e formulário preservados. Salvamentos separados/feedback; sem frame mobile específico. |
| Carteiras | `9:1670`; referência local e medidas anteriores | Desktop; mobile adaptado | Slots e controles originais preservados; sem clonar carteira ou inventar operação ausente no contrato. |
| Favoritos / pedidos | Sem frames próprios identificados | Ambos | Navegação da conta e listas reais; não se declara comparação com desenho inexistente. |

W/C/D no rodapé e a identificação tipográfica das carteiras aparecem no próprio desenho: não foram classificados erroneamente como ícones substituídos. Os inventários de assets continuam em `docs/figma`. A conferência final local encontrou 64 arquivos usados não vazios e 242 slots SVG visíveis com geometria nativa; um ícone dentro do título desktop deliberadamente recortado para leitores de tela está identificado separadamente em `screenshots/prompt11/asset-verification.json`. Não foram geradas imagens substitutas.

## E. Acessibilidade

Foi adicionada somente a dependência de desenvolvimento `@axe-core/playwright@4.14.0`. A integração segue a [documentação oficial do Playwright](https://playwright.dev/docs/accessibility-testing). O bundle de produção não carrega axe.

Scans: início, catálogo, detalhe, login, cadastro, perfil, carteiras, favoritos, pedidos, recibo, carrinho, checkout e diálogo de revisão, em desktop e mobile. Tags A/AA, WCAG 2.1/2.2 e boas práticas; nenhuma regra ou elemento foi excluído para suprimir achados. JSONs completos, incluindo resultados inconclusivos, ficam anexados ao relatório HTML.

Verificação por teclado usa eventos reais de Tab, Shift+Tab, Enter, Espaço e Escape: skip link, drawer, retorno ao acionador e foco em formulário com viewport reduzido. Ampliação, aviso auxiliar e revisão de compra já verificam foco/fechamento nas suites existentes. Erros de formulário são associados por `aria-describedby` e mantêm foco no primeiro campo inválido; mensagens dinâmicas usam status/alert.

Correções: nomes dos links preservam texto visível; avatar vazio tem papel de imagem; lista de valores tem estrutura válida; diagnóstico está em landmark; drawer circula foco entre primeiro e último controle. Não foram removidos alt texts, feedback ou informações financeiras.

Limites: axe não comprova todos os critérios; não houve avaliação com NVDA/VoiceOver nem testes inclusivos com usuários. Reflow de 200% foi modelado com viewport equivalente, não com automação do zoom nativo de todos os navegadores. Não se declara certificação WCAG 2.2 AA.

## F. Performance objetiva

As quatro artes originais têm 1254×1254 px e somam **7.959.897 bytes** (aproximadamente 7,96 MB), embora o maior slot normal tenha 450 px. Medidas em `screenshots/prompt11/assets.json`. Cache de URL evita baixar cada cópia do mesmo arquivo, mas não elimina o custo inicial/decode. Este é um risco concreto de performance em rede móvel e permanece P2.

Uma tentativa local de recompressão PNG foi descartada porque a comparação dos pixels decodificados não foi idêntica. Nenhum original foi sobrescrito, reduzido ou recolorido; não se sacrificou fidelidade para melhorar tamanho. Uma estratégia de entrega otimizada com equivalência visual deve ser decidida e medida na etapa de performance.

O hero tem prioridade alta e não usa lazy loading; cards/editoriais usam lazy loading e dimensões declaradas. Não foram observados assets quebrados nem origens externas de imagens/fontes nos fluxos normais. Os testes de reconexão verificam uma conexão e uma subscription, inclusive após vários ciclos; replay antigo/duplicado não repete consultas. Polling REST de pedido ocorre apenas enquanto pendente.

Ambiente: Windows/Chromium, Node 24.19.0, Vite 8.3.4, Playwright 1.64.1 e axe 4.14.0. Chunks do build final: app 357,60 kB (gzip 111,25), MSW/browser 472,14 kB (gzip 174,45), entrada React 213,80 kB (gzip 67,15); MSW é importado conforme a configuração dos mocks. Esses valores são tamanhos de arquivo, não métricas de experiência. Não se inferem pontuações Lighthouse, LCP, CLS ou TBT a partir do build. Nenhuma medição Lighthouse foi executada nesta etapa, conforme o recorte do Prompt 11.

## G. Correções, antes → depois

| # | Prioridade | Antes | Depois / evidência |
| --- | --- | --- | --- |
| 1 | P1 | Faltavam baselines obrigatórias de início/detalhe/carrinho | Seis imagens novas, comparadas e verificadas junto das duas de pagamento |
| 2 | P1 | Shift+Tab no primeiro controle do drawer não voltava ao último controle | Limites de Tab explícitos, só para controles visíveis/habilitados; teste de foco |
| 3 | P2 | Carrinho e conta ocupavam colunas 3/4 sob o botão central mobile | Colunas 4/5 explícitas, teste de posição e screenshot |
| 4 | P2 | “Meu perfil” no rodapé abria aviso de indisponibilidade | Link real para `/profile`, com proteção/retorno já existentes |
| 5 | P2 | `aria-label` dos cards omitia preço/estado; breadcrumb/sidebar divergiam do texto visível | Card usa nome nativo do conteúdo; breadcrumb/sidebar incluem texto visível. Seletores atualizados preservam a intenção dos testes |
| 6 | P2 | Avatar vazio tinha `aria-label` em span genérico | `role="img"` e nome acessível, ícone original preservado |
| 7 | P2 | Parágrafo solto dentro de `dl` dos totais | Grupo `dt/dd` válido, mesma informação de rede |
| 8 | P3 | Acesso ao diagnóstico ficava fora de landmarks | Navegação nomeada sem mudar sua posição visual |

Também foram corrigidos pressupostos dos testes novos: imagem lazy fora do viewport não equivale a imagem quebrada; rótulos obrigatórios podem incluir asterisco; botão Salvar perfil inicia desabilitado sem alterações. Essas correções do teste não ocultam defeitos da aplicação. Não houve mudança em contratos, estoque, reservas, sessão ou infraestrutura dos mocks.

## H. Pendências

- **P0:** nenhuma falha identificada nesta auditoria.
- **P1 funcional:** nenhuma falha conhecida após as correções e regressão. A entrega global continua sem comprovação dos requisitos de Lighthouse e deploy, explicitamente reservados ao Prompt 12; não deve ser apresentada como entrega pública pronta.
- **P2:** peso das quatro artes PNG; medir/otimizar a entrega preservando sua aparência. Fidelidade não é igualdade pixel a pixel: diferenças funcionais e de dados estão discriminadas em D.
- **P3:** suites antigas ainda usam pequenas janelas fixas de observação negativa em alguns testes de respostas/replay; latências são determinísticas. Os testes novos não acrescentam sleeps. Substituição sistemática por sinais de término pode ser feita sem alterar o contrato, mas não foi ampliada nesta etapa.

## I. Verificações técnicas e reprodução

Comandos do `package.json` usados com o fallback npm documentado no README. O sandbox inicialmente bloqueou `spawn`/dependências nativas do Vite; a execução autorizada fora do sandbox passou. Não foi alterada a configuração do aplicativo para mascarar o bloqueio do ambiente. Warnings `NO_COLOR`/`FORCE_COLOR` são do runner Node, não erros da interface.

```sh
npm run build
npm run test:data
npm run lint
npm run test:e2e:production
```

Porta 5173 do usuário preservada. Previews de verificação são locais e temporários, sem backend separado. O smoke do build cobre SPA, MSW REST, conexão/evento/reconexão Socket.IO e ausência de polling: as oito execuções de setup passaram na regressão completa. TypeScript, lint sem warnings, build de produção e os onze testes de domínio passaram sobre a versão final.

| Verificação final | Resultado real |
| --- | --- |
| TypeScript | Aprovado |
| ESLint | Aprovado, zero warnings |
| Build estático | Aprovado, 570 módulos |
| Domínio | 11/11 |
| Regressão E2E completa | 105/106; diferença de baseline do rodapé identificada |
| Reteste sem atualizar snapshots | 10/10, incluindo compra afetada e teclado com Espaço |
| Cobertura consolidada E2E | 106/106 aprovados, zero falhas restantes |
| Smoke estático | 8/8 casos de setup incluídos na regressão |
| Axe | 26 scans por execução, zero violações nos cenários avaliados |
| Capturas finais | 24 telas, sem console inesperado ou overflow; larguras 1440/414 |

## J. Arquivos alterados

- `src/styles/globals.css`: posição dos itens da barra mobile.
- `src/components/layout/{app-shell,site-footer}.tsx`: landmark e link de perfil.
- `src/components/nft/nft-card.tsx`, `features/nft/nft-details.tsx`, `features/account/{layout,profile}.tsx`: semântica e nomes acessíveis.
- `src/features/catalog/catalog.tsx`: foco no drawer.
- `src/routes/cart.tsx`, `features/cart/cart.css`: estrutura de `dl` válida.
- `tests/e2e/audit.spec.ts`, suas seis baselines e seletores dos testes existentes de catálogo/detalhes/auth/checkout/conta/realtime.
- `package.json`/`package-lock.json`: apenas ferramenta de acessibilidade para desenvolvimento.
- README, arquitetura, este relatório e `docs/AUDIT_RESULTS.json`, além das evidências úteis em `docs/screenshots/prompt11`.

Commit solicitado, se possível: `test: audit marketplace flows and fix regressions`. `git config user.name` e `user.email` estão ausentes; o projeto inteiro já estava sem rastreamento/commit inicial. Não foi inventada autoria nem incluído todo o workspace num commit. Arquivos e baselines estão prontos para revisão e versionamento pelo usuário. Não houve push, deploy ou avanço automático ao Prompt 12.
