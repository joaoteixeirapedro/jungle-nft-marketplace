# Kurio — NFT Marketplace

Marketplace de NFTs desenvolvido para o desafio de Frontend Developer da Jungle Gaming. Inclui catálogo com busca e filtros, detalhes com seleção de edição, favoritos, carrinho, cupons, checkout, pedidos e conta do colecionador. Autenticação, carteiras e pagamentos são simulados no navegador.

## Tecnologias

- React, TypeScript e Vite.
- TanStack Router, TanStack Query e Axios.
- Tailwind CSS e componentes shadcn/ui com Radix Slot.
- MSW, `@mswjs/socket.io-binding` e Socket.IO Client.
- Playwright, axe-core, testes de domínio com Node.js e Lighthouse.

## Como executar

Requisitos: **Node.js 24 ou superior** e npm. Não é necessário iniciar um backend nem configurar chaves de API ou extensões de carteira.

```sh
npm ci
npm run dev
```

Acesse [localhost:5173](http://127.0.0.1:5173). Para testar o build de produção localmente:

```sh
npm run build
npm start
```

O preview fica em [localhost:4173](http://127.0.0.1:4173).

O arquivo [`.env.example`](.env.example) documenta os valores padrão. Copiá-lo para `.env` é opcional; mudanças exigem reiniciar o Vite ou gerar outro build.

| Variável | Padrão |
| --- | --- |
| `VITE_ENABLE_MOCKS` | `true`; mantém a simulação ativa também no build |
| `VITE_API_BASE_URL` | `/api` |
| `VITE_SOCKET_URL` | `https://realtime.nft-marketplace.test`; origem interceptada pelo MSW |

## Demonstração

A aplicação ainda não possui uma URL pública. A configuração de deploy está preparada em `vercel.json`; a publicação permanece pendente.

## API simulada e contas de teste

O MSW intercepta as requisições REST e a conexão WebSocket. O binding implementa o protocolo Socket.IO; o cliente usa somente o transporte `websocket`, sem polling ou servidor adicional.

| Conta fictícia | Senha |
| --- | --- |
| `alice@example.test` | `Demo#2026` |
| `bruno@example.test` | `Demo#2026` |

As fixtures incluem 30 NFTs, 90 edições, três coleções e dados separados por conta. Alice possui carteiras e um pedido histórico. O cupom `WELCOME10` aplica 10% de desconto; `EXPIRED` exercita a expiração.

O banco simulado fica no `localStorage`; a sessão e a identificação do visitante ficam no `sessionStorage`. Os dados sobrevivem a refresh na mesma origem. Ao autenticar, o carrinho do visitante é incorporado à conta.

No console do navegador, com a aplicação aberta:

```js
// Selecionar um cenário, preservando o banco.
await fetch('/api/__mock/scenario', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'payment-declined' }),
})

// Restaurar todas as fixtures e revogar as sessões simuladas.
await fetch('/api/__mock/reset', { method: 'POST' })
```

Após mudar o cenário, recarregue para renovar o cache. Depois do reset, autentique novamente. Há cenários de lentidão, respostas fora de ordem, falhas de rede, sessão expirada, mudança de preço/estoque e timeout após a criação do pedido. A [documentação dos cenários](docs/API_SIMULADA.md) explica como reproduzi-los, inclusive desconexão e recuperação do Socket.IO. Os [contratos REST e eventos](docs/API_CONTRACTS.md) detalham os recursos e os controles disponíveis.

## Testes

```sh
npm run typecheck
npm run lint
npm run test:data
npx playwright install chromium
npm run build
npm run test:e2e:production
```

Os E2E iniciam o preview na porta **4173** e executam em Chromium desktop e mobile, com dados isolados. Encerre um preview manual nessa porta antes de rodá-los. `npm run test:e2e` testa o servidor de desenvolvimento na porta **5173**, que também deve estar livre.

Relatórios e traces novos ficam em `playwright-report/` e `test-results/`, ignorados pelo Git. O [relatório HTML de entrega](docs/test-report/index.html) está versionado; para abri-lo, use `npx playwright show-report docs/test-report`.

Para reproduzir o Lighthouse, mantenha `npm start` aberto em outro terminal e execute `npm run audit:lighthouse`. O comando realiza três medições por página e perfil. Os [relatórios HTML/JSON e medianas](docs/lighthouse/final-delivery/) estão preservados. Os resultados e as limitações conhecidas constam em [docs/DELIVERY.md](docs/DELIVERY.md).

## Notas técnicas

- `src/app` concentra bootstrap, providers e roteamento; `components`, `features`, `routes` e `hooks` organizam a interface. `services` contém os clientes HTTP/Socket.IO; `types` compartilha os contratos; `mocks` reúne handlers, fixtures e estado simulado. Os testes ficam em `tests/` e os assets distribuídos em `public/`.
- TanStack Query gerencia consultas, mutations e invalidação. As chaves incluem parâmetros e identidade; requisições obsoletas são canceladas. Favoritos têm atualização otimista com rollback.
- Preços trafegam como strings decimais e os cálculos usam inteiros em wei. A cotação da API é revalidada antes do pedido; a chave de idempotência permite recuperar uma compra após timeout sem duplicá-la.
- Eventos `nft.updated` e `order.updated` são versionados. Duplicatas e versões antigas são descartadas; reconexões reconciliam os recursos ativos por REST. Logout e troca de conta limpam dados privados e subscriptions.

As políticas de sessão, cache, persistência, compra e as adaptações do layout estão em [ARCHITECTURE.md](ARCHITECTURE.md). As artes e fontes são locais; os originais em `assets/originals/` são utilizados pelos scripts de otimização e não entram no build.

## Referências do desafio

- [Enunciado da Jungle Gaming](https://github.com/junglegaming/frontend-challenge) e [cópia preservada](docs/CHALLENGE_README.md).
- [Figma original](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) e [referências visuais e origem dos assets](docs/figma/README.md).
