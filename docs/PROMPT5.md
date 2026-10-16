# Prompt 5 — Detalhes, edições e favoritos

## Implementação e integração

- `/nfts/$nftId`: acesso direto/refresh, skeleton, 404, erro com retry e feedback de atualização em segundo plano. Query por ID com AbortSignal; sem reaproveitar dados de outro NFT durante a troca de rota.
- Imagem original da API, fallback de falha e ampliação em diálogo nativo. Escape fecha; o foco retorna ao acionador.
- Edições geradas a partir da resposta, preço/estoque próprios, radios acessíveis e opções esgotadas desabilitadas. Seleção inicial: última edição disponível, ou primeira se todas estiverem esgotadas.
- Quantidade inteira entre 1 e `min(estoque, 999)`, limites compartilhados com o domínio, botões nos limites, teclado e correção de entrada inválida. Troca de edição/estoque reduz a quantidade quando necessário; edição esgotada bloqueia compra.
- ETH continua string. Subtotal estimado usa `parseEth`/`formatEth` e BigInt; a cotação futura será a referência definitiva. Nenhuma reserva ou inclusão no carrinho é simulada pela interface.
- Descrição, coleção, criador, rede, categoria e atributos reais da resposta; recomendações consultadas por `collectionId`, excluindo o NFT atual.
- `FavoriteButton` compartilhado entre cards da Home/catálogo/relacionados e detalhes. Mesmo cache TanStack Query; persistência somente no banco MSW existente.
- Visitante recebe aviso de autenticação necessária, sem gravação nem login improvisado. Sessão em `sessionStorage` usa o mecanismo existente, agora observável. `authApi.login/register/logout` notifica seus consumidores.
- Favoritos segregados pela sessão. Mudança de sessão cancela leituras privadas e remove caches anteriores. Callbacks de mutations conferem a sessão capturada antes de escrever no cache.
- Adição/remoção otimista com snapshot, rollback, reconciliação com a resposta e invalidação. Uma mutation de favoritos por sessão por vez; cliques rápidos não duplicam operações. 401 limpa a sessão e preserva o aviso de expiração.
- Contexto de origem em `returnTo`, limitado a `/` ou `/marketplace` com busca interna validada. Cards, destaque e recomendações usam a mesma navegação. O retorno conserva filtros, busca, ordenação e página, inclusive após refresh. Origem Home retorna à Home; acesso direto retorna ao mercado.
- `nft.updated` chega pelo cliente Socket.IO existente, com transporte WebSocket e MSW/binding. Cancela snapshot HTTP obsoleto, preserva metadados do detalhe, aplica versões mais recentes e revalida detalhe, catálogos e favoritos. A conexão pública sobrevive às trocas entre Home, catálogo e detalhe; listeners são removidos no cleanup. Replay/recuperação avançada permanecem no Prompt 9.

Endpoints reutilizados: `GET /api/nfts/:id`, `GET /api/nfts?collectionId=…`, `GET /api/favorites`, `PUT /api/favorites/:id`, `DELETE /api/favorites/:id`. Nenhum endpoint de negócio, contrato incompatível, dependência ou servidor adicional foi criado. Os cenários HTTP existentes de falha/latência passam também a cobrir a leitura de detalhes, além da listagem.

## Referência visual e ajustes explícitos

Fonte: `.fig` fornecido pelo usuário, importado sem modificar o conteúdo. Contexto de design, screenshots, tokens e assets obtidos pela skill Figma design-to-code.

- Desktop `10:244`, 1440 × 2246; mobile `15:5536`, 414 × 896.
- Referências: `docs/figma/nft-detail-desktop.png` e `nft-detail-mobile.png`.
- Aplicação: `docs/screenshots/prompt5/nft-{390,414,768,1440}.png`.
- Desktop preserva miniatura lateral, arte principal de 404 × 404 dentro de superfície 444 × 444, conteúdo adjacente, metadados, relacionados e rodapé existente. Mobile preserva arte de largura fluida, gradiente, voltar/favorito, folha arredondada e barra de compra fixa, substituindo a navegação inferior nessa rota.
- O frame repete a mesma imagem quatro vezes; a API tem uma imagem por NFT. Há uma única miniatura e ampliação funcional, sem fabricar galeria com cópias ou atribuir obras diferentes ao mesmo NFT.
- Não foram inventados rating, 19 avaliações, contrato, royalties, edição aberta ou metadados do texto ilustrativo do Figma. Valores, número de edições, estoque, descrições, criadores e relacionados vêm da API. Isso altera conteúdo e altura em relação ao protótipo.
- Seletores e botões têm áreas de toque maiores; foco visível e estados de estoque/erro são adicionais funcionais. A quantidade permanece legível com três dígitos; ETH longo quebra sem overflow. Há um acionador de ampliação também no mobile.
- Avaliações, redes sociais e compra usam os avisos honestos existentes; não declaram operações realizadas. Footer e componentes da descoberta foram reutilizados.

## Verificações

Comandos equivalentes aos scripts npm (npm não está no PATH deste ambiente):

```sh
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node --test tests/data/*.test.ts
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts
```

- TypeScript strict, lint sem warnings e build de produção.
- Seis testes de domínio: os cinco anteriores mais validação/clamp de quantidade e limite compartilhado.
- 38 execuções Playwright: seis grupos de API no desktop, quatro de setup, seis de descoberta e seis de detalhes/favoritos em desktop/mobile. A expectativa antiga da Home foi atualizada para aceitar a URL com contexto e conferir retorno à origem.
- Novos cenários: contexto/refresh/acesso direto, ampliação e restauração de foco, responsividade 390/768/1440; edição/quantidade e ETH exato; preço/estoque via Socket.IO/MSW sem polling; favorito anônimo, adicionar/remover, clique rápido, persistência, sincronização de cards e alternância de contas; 401; rollback de 422 e resposta de sessão anterior; 404/503/retry, shimmer sem animação e cancelamento de leitura antiga.
- Login dos testes ocorre pela API existente; o setup atualiza o token e notifica o observador de sessão. Não há formulário de autenticação de teste na aplicação. Helpers aguardam o bootstrap MSW antes de enviar requests.
- Capturas reais em 390, 414, 768 e 1440, imagens/fontes carregadas localmente, verificação de geometria intrínseca dos SVGs, ausência de overflow horizontal e erros JS. Nenhum URL temporário de asset usado no runtime.

Resultado: 6/6 testes de domínio e 38/38 execuções Playwright aprovados; TypeScript, lint e build sem erros. O relatório HTML fica em `playwright-report/production/index.html`. Outras oito execuções direcionadas, aprovadas, cobrem os últimos ajustes de retorno com busca/preços, quantidade e isolamento de cache privado. O fallback de imagem foi validado no navegador usando uma URL local inexistente. Uma tentativa adicional excedeu o limite de bootstrap enquanto compilação e inspeção visual disputavam recursos; a repetição após a compilação, com um worker, passou integralmente.

## Matriz de conformidade com o README (escopo desta etapa)

| Requisito | Implementado? | Observação |
| --- | --- | --- |
| Detalhes, imagem, edições, quantidade e disponibilidade | Sim | API por ID; estados esgotado/404/erro; uma imagem real ampliável. |
| ETH em strings, sem perda de precisão | Sim | BigInt em wei; cotação definitiva permanece no checkout futuro. |
| Favoritos autenticados e persistentes por usuário | Sim | API MSW; conta determinada pela sessão; visitante recebe aviso. |
| Query/mutations, cache consistente e atualização otimista com rollback | Sim | Cache por sessão, reconciliação API e proteção contra respostas antigas. |
| Navegação direta, refresh e contexto do catálogo | Sim | TanStack Router; query por ID; retorno interno validado. |
| Atualizações de preço/estoque via MSW + Socket.IO | Sim, no escopo | Evento real recebido pelo cliente; nenhuma infraestrutura backend. Recuperação avançada no Prompt 9. |
| Estados assíncronos, responsividade e acessibilidade | Sim, no escopo | Loading/retry/404, reduced motion, teclado, labels, foco e avisos acessíveis. |
| Figma e assets oficiais | Sim, com ajustes documentados | Layout desktop/mobile preservado; conteúdo determinado pela API e miniaturas repetidas removidas. |
| Testes prioritários e compilação | Sim | Domínio e E2E de produção, além de TypeScript/lint/build. |

## Próximas etapas e arquivos

Não houve avanço ao Prompt 6. Login/cadastro e redirecionamento completo após autenticação, telas de conta, página dedicada de favoritos, carrinho/checkout, reconexão/replay avançados, avaliações/editorial, Lighthouse e deploy permanecem fora deste escopo. Favoritos estão funcionais para sessões obtidas pela API atual; a entrada pela interface será ligada no Prompt 6.

Principais arquivos: `src/routes/nft.tsx`, `src/features/nft/{nft-details.tsx,nft-details.css,navigation.ts}`, `src/features/favorites/favorite-button.tsx`, `src/services/api/favorites.ts`, `src/hooks/{use-session-token.ts,use-marketplace-realtime.ts}`, `src/lib/{session.ts,quantity.ts}`, `src/components/nft/nft-card.tsx`, `src/components/layout/{app-shell.tsx,site-header.tsx}`, `src/features/catalog/home-sections.tsx`, `src/app/router/index.ts`, `src/mocks/{http.ts,errors.ts,domain/cart.ts}`, `tests/e2e/{nft-details.spec.ts,catalog.spec.ts}`, `tests/data/quantity.test.ts` e documentação/assets locais.

Commit solicitado: `feat: implement nft details editions and favorites`. Não criado porque o repositório não possui `user.name`/`user.email` configurados. Nenhuma identidade foi inventada ou configuração global alterada.
