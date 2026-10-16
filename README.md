# Kurio · NFT Marketplace

Implementação do [Frontend Challenge da Jungle Gaming](https://github.com/junglegaming/frontend-challenge), com descoberta, compra e conta do colecionador. React + TypeScript + Vite, TanStack Router/Query, Axios, Tailwind CSS, shadcn/ui, MSW, Socket.IO Client e Playwright.

O [enunciado original integral](docs/CHALLENGE_README.md) foi preservado. O [Figma oficial](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) define a identidade visual. [Relatório final e matriz de conformidade](docs/DELIVERY.md).

**Publicação:** repositório público em [joaoteixeirapedro/jungle-nft-marketplace](https://github.com/joaoteixeirapedro/jungle-nft-marketplace). O site ainda não foi publicado: o usuário pediu avaliação local antes do deploy. Há configuração Vercel pronta; não há URL pública da aplicação nem testes públicos aprovados.

## Executar

Requisitos: Node.js 24+ e npm. Não é necessário backend, Docker, conta privada, extensão de carteira ou chave de API.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. Para verificar o build estático:

```sh
npm run build
npm start
```

Abra http://127.0.0.1:4173. O preview local não é um servidor de hospedagem. Portas são estritas; encerre somente seu servidor manual na porta correspondente antes dos E2E.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Vite com mocks REST e WebSocket |
| `npm run build` | TypeScript e build em `dist/` |
| `npm start` / `npm run preview` | Preview estático em 4173 |
| `npm run typecheck` | Tipos da aplicação, configuração e testes |
| `npm run lint` | ESLint com zero warnings |
| `npm run test:data` | 12 testes de domínio, precisão, versões e migração |
| `npm run test:e2e` | Playwright em desenvolvimento, desktop/mobile |
| `npm run test:e2e:production` | 106 casos contra o build estático |
| `npm run audit:lighthouse` | 12 medições; manter o preview rodando em outro terminal |
| `npm run assets:optimize` | WebP lossless a partir dos originais; reutiliza saídas válidas |
| `npm run assets:verify` | Pixels no Chromium, inventário e capturas; requer preview |
| `npm run msw:init` | Regenera o worker oficial ao atualizar MSW |

Antes dos testes de navegador/Lighthouse, instale o Chromium uma vez:

```sh
node node_modules/@playwright/test/cli.js install chromium
```

O relatório HTML desta entrega está em `docs/test-report/index.html`. Para abri-lo: `node node_modules/@playwright/test/cli.js show-report docs/test-report`.

Relatório padrão dos E2E em `playwright-report/production`; traces ficam em `test-results/production` quando há falha. Há oito baselines versionadas para início, detalhe, carrinho e pagamento. Não atualize snapshots sem revisar a diferença. Baselines foram produzidas em Chromium/Windows; rasterização em outro sistema pode variar.

## Ambiente e mocks

`.env.example` documenta os defaults; `.env` é opcional e ignorado. `VITE_ENABLE_MOCKS=true`, `VITE_API_BASE_URL=/api` e `VITE_SOCKET_URL=https://realtime.nft-marketplace.test`. As variáveis são públicas e exigem novo build após mudanças. Mocks ficam ativos também no build de demonstração.

MSW intercepta REST e WebSocket no navegador. `@mswjs/socket.io-binding` faz os handshakes Engine.IO/Socket.IO; o cliente usa apenas `websocket`, sem polling. Não há servidor Socket.IO, Express ou backend separado. O bootstrap aguarda `worker.start()` antes de executar o módulo do cliente Socket.IO. O hostname reservado não precisa resolver na rede.

Banco único no `localStorage`; token de sessão e identificação do visitante no `sessionStorage`. Persistência é local ao navegador/origem. Contas, carrinhos, favoritos, carteiras e pedidos são isolados por usuário. Limpar o armazenamento restaura a demonstração; não existe identidade ou pagamento de produção.

Eventos `nft.updated` e `order.updated` têm identidade e versão; mensagens duplicadas/antigas são rejeitadas. Uma conexão compartilhada possui cleanup por sessão. Reconexão revalida os recursos ativos por REST; um evento não confirma compra sozinho. O diagnóstico em `/dev/diagnostics` mostra conexão/evento e oferece desconectar/conectar.

[Contratos REST e eventos](docs/API_CONTRACTS.md) · [Arquitetura, sessão, carrinho e cache](ARCHITECTURE.md).

## Testar os fluxos

Contas **fictícias** `alice@example.test` e `bruno@example.test`, senha `Demo#2026`. Login não é automático. Alice já tem favoritos, carrinho, duas carteiras simuladas e um recibo histórico; Bruno tem dados separados e um slot de carteira livre.

1. Explore Home/catálogo, combine busca/filtros/ordenação e use histórico/refresh.
2. Abra o NFT, escolha edição/quantidade e adicione ao carrinho. Teste remoção e cupom `WELCOME10`; `EXPIRED` e um código desconhecido exercitam rejeição.
3. Autentique, revise carrinho e siga ao checkout. Selecione carteira/rede, conecte a carteira simulada e confirme após a revisão. O recibo só aparece quando a API confirma o pedido.
4. Edite perfil, avatar, senha e carteiras. Consulte favoritos e pedidos. Faça logout e entre com a outra conta para verificar isolamento.

No console da aplicação, após o bootstrap:

```js
// Reset completo e determinístico; revoga sessões. Recarregue e autentique novamente.
await fetch('/api/__mock/reset', { method: 'POST' })
// Selecione um cenário sem apagar o banco; recarregue para renovar o cache.
await fetch('/api/__mock/scenario', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'order-timeout' }),
})
```

Cenários: `default`, `empty`, `slow`, `out-of-order`, `server-error`, `network-error`, `transient-error`, `session-expired`, `unauthorized`, `validation-error`, `coupon-invalid`, `coupon-expired`, `price-changed`, `sold-out`, `stock-conflict`, `order-timeout`, `payment-confirmed`, `payment-declined`, `payment-pending`, `wallet-refused` e `malformed-session`.

`order-timeout` cria o pedido e perde a resposta; recuperar usa a mesma chave/corpo, sem novo pedido. `payment-declined` preserva itens e libera reservas. Para reconexão, use os controles de `/api/__mock/realtime`; para preço/estoque, `/api/__mock/nfts/:id`; exemplos completos no contrato. O modo Offline do DevTools também corta REST e não equivale a interromper apenas o Socket.IO simulado.

## Imagens e Lighthouse

Artes oficiais: WebP lossless em 320/640/1254 px; `srcset`/`sizes` consideram slot e densidade. Ampliação usa 1254 px. Originais e fontes TTF recuperáveis em `assets/originals`, fora de `public/` e de `dist/`. SVGs e pequenos ícones originais foram preservados. Roboto Mono WOFF2 local mantém glifos/métricas e a licença em `public/fonts/OFL.txt`.

`assets:optimize` usa Sharp fixado no lockfile e verifica pixels na resolução original. `scripts/optimize-fonts.py` é manutenção opcional com `fonttools[woff]==4.67.0`; os WOFF2 já estão versionados e o build Node não requer Python. Medidas, comparação de qualidade, inventário e capturas em `docs/assets/`.

Lighthouse usa Chrome do Playwright, perfis oficiais mobile/desktop, armazenamento novo por execução e cenário padrão. São três execuções por página/perfil, com HTML, JSON e medianas em `docs/lighthouse/final-delivery/`. `AUDIT_URL` altera a origem do preview; `AUDIT_PHASE` e `AUDIT_RUNS` servem a investigações. Não confunda métricas de laboratório com INP de usuários reais.

## Deploy preparado

`vercel.json` usa `npm run build`, saída `dist/`, fallback SPA e worker sem cache persistente. Na Vercel, importe este repositório, selecione Node 24 e mantenha os mocks ativos. Não configure proxy/backend para `/api` ou Socket.IO. HTTPS e `/mockServiceWorker.js` acessível como JavaScript são necessários. Após publicar, ainda será preciso verificar rotas profundas, assets, sessão, compra/recibo, logout e eventos na URL pública. **Essa publicação foi adiada pelo usuário.**

## Limitações e autoria assistida

A demonstração não oferece segurança de backend: os dados simulados são visíveis e editáveis no navegador. As páginas editoriais/suporte fora do escopo informam indisponibilidade. Há adaptações funcionais e de acessibilidade do Figma documentadas em `ARCHITECTURE.md`; não se declara igualdade integral com todos os frames. Limitações de performance e da publicação constam no relatório final.

O desenvolvimento, a otimização e as verificações foram assistidos pelo Codex. O usuário forneceu os requisitos, o arquivo Figma e autorizações de exportação; o agente editou o código e executou os comandos registrados. Não houve geração artificial das artes oficiais.
