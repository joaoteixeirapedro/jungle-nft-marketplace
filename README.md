# Kurio — NFT Marketplace

Marketplace de NFTs desenvolvido para o desafio técnico de frontend da **Jungle Gaming**, com catálogo, detalhes e edições de NFTs, favoritos, carrinho persistente, cupons, checkout, recibos, perfil e carteiras. Contas, pagamentos, conexões de carteira e eventos em tempo real são simulados no navegador.

- **Aplicação publicada:** [jungle-nft-marketplace-xi.vercel.app](https://jungle-nft-marketplace-xi.vercel.app).
- **Código da entrega:** [repositório na branch `main`](https://github.com/joaoteixeirapedro/jungle-nft-marketplace/tree/main).
- **Referências:** [enunciado do desafio](docs/CHALLENGE_README.md) e [layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

## Guia rápido para avaliação

1. Acesse a aplicação publicada e explore busca, filtros, ordenação, paginação e detalhes dos NFTs. Os parâmetros do catálogo permanecem na URL.
2. Entre com `alice@example.test` e senha `Demo#2026`. Adicione uma edição disponível ao carrinho, aplique `WELCOME10`, selecione e conecte uma carteira da conta, revise a compra e acompanhe o pedido até o recibo.
3. Confira perfil, carteiras, favoritos e a recuperação de sessão ao atualizar a página. A conta `bruno@example.test`, com a mesma senha, permite avaliar o isolamento entre usuários.
4. Use os [cenários de falha e tempo real](docs/API_SIMULADA.md) para reproduzir recusa de pagamento, timeout, alteração de preço/estoque e reconexão.
5. Consulte os [resultados da entrega](docs/DELIVERY.md), os relatórios E2E e as auditorias indicados abaixo. As evidências registram as execuções de **16/10/2026**.

### Onde conferir cada requisito

| Aspecto do desafio | Código e documentação |
| --- | --- |
| Telas, navegação e responsividade | `src/routes/`, `src/features/`, `src/components/` e [referências visuais](docs/figma/README.md) |
| Router, Query e Axios | `src/app/`, `src/services/api/` e [políticas de cache e sessão](ARCHITECTURE.md#rest-cache-e-sessão) |
| REST, mocks e fixtures | `src/mocks/`, [contratos REST e eventos](docs/API_CONTRACTS.md) e [cenários reproduzíveis](docs/API_SIMULADA.md) |
| Socket.IO e reconciliação | `src/services/socket/`, `src/mocks/handlers/realtime.ts` e [decisões de tempo real](ARCHITECTURE.md#socketio-e-reconciliação) |
| Testes, acessibilidade e regressão visual | `tests/data/`, `tests/e2e/` e [resultados e relatórios](docs/DELIVERY.md#testes) |
| Performance | [Configuração Lighthouse](lighthouse.config.mjs), `scripts/audit-lighthouse.mjs` e [auditorias HTML/JSON](docs/lighthouse/final-delivery/) |
| Decisões de UX, adaptações do Figma e limitações | [ARCHITECTURE.md](ARCHITECTURE.md#figma-acessibilidade-e-assets) |
| Publicação, rotas diretas e arquivos distribuídos | [vercel.json](vercel.json) e [validação do deploy](docs/DELIVERY.md#publicação-em-produção) |

## Tecnologias

React, TypeScript e Vite; TanStack Router para navegação; TanStack Query para estado remoto; Axios para REST; Tailwind CSS e componentes shadcn/ui adaptados com Radix Slot; MSW na camada de rede; Socket.IO Client com `@mswjs/socket.io-binding` para simular o protocolo. A validação usa testes de domínio do Node.js, Playwright, axe-core e Lighthouse.

## Executar localmente

Requisitos: **Node.js 24 ou superior** e npm. As dependências são instaladas pelo lockfile. Não é necessário configurar backend, serviço privado, chave de API, extensão de carteira ou gateway de pagamento.

```sh
npm ci
npm run dev
```

O ambiente de desenvolvimento fica em [127.0.0.1:5173](http://127.0.0.1:5173), com os mocks habilitados por padrão.

Para compilar e servir a versão de produção:

```sh
npm run build
npm start
```

O preview fica em [127.0.0.1:4173](http://127.0.0.1:4173). `npm run preview` é equivalente a `npm start`.

### Variáveis de ambiente

O arquivo [`.env.example`](.env.example) contém os valores padrão; copiá-lo para `.env` é opcional. As variáveis são públicas e incorporadas durante o build. Após alterá-las, gere um novo build. Não coloque credenciais ou segredos em variáveis `VITE_*`.

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa os mocks, inclusive na demonstração publicada |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas REST interceptadas pelo MSW |
| `VITE_SOCKET_URL` | `https://realtime.nft-marketplace.test` | Origem reservada para interceptação do transporte Socket.IO |

## Contas, persistência e cenários

| Conta fictícia | Senha |
| --- | --- |
| `alice@example.test` | `Demo#2026` |
| `bruno@example.test` | `Demo#2026` |

As fixtures incluem 30 NFTs, 90 edições, três coleções e dados separados por conta. Alice possui carteiras e um pedido histórico. O cupom `WELCOME10` oferece 10% de desconto; `EXPIRED` permite testar expiração.

O banco simulado fica no `localStorage`; a sessão e a identidade do visitante ficam no `sessionStorage`. Atualizar a página preserva a sessão na mesma aba. Ao entrar, o carrinho do visitante é incorporado à conta. O estado da demonstração pertence a cada navegador.

Depois de carregar a aplicação, execute no console do navegador, localmente ou na URL pública:

```js
// Selecionar um cenário sem apagar os dados existentes.
await fetch('/api/__mock/scenario', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'payment-declined' }),
})
```

Recarregue a página para renovar o cache. Para restaurar todas as fixtures e o cenário padrão:

```js
await fetch('/api/__mock/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'default' }),
})
```

Após o reset, recarregue e entre novamente. Selecionar apenas `default` não desfaz alterações já persistidas.

| Cenário | Como avaliar |
| --- | --- |
| `slow`, `empty` | Abra o catálogo e observe os skeletons ou o estado vazio |
| `network-error`, `server-error`, `transient-error` | Observe o feedback de falha e a recuperação por nova tentativa |
| `out-of-order` | Altere rapidamente filtros e confira se o resultado final corresponde à URL |
| `session-expired` | Entre antes de selecionar o cenário e confira a retomada da autenticação |
| `payment-declined` | Finalize uma compra e confira a recusa com preservação dos itens |
| `order-timeout` | Envie uma compra e use a recuperação oferecida pela interface para consultar o mesmo pedido |
| `price-changed`, `sold-out` | Mantenha a edição `nft-001-ed-10` no carrinho e confira a atualização e a revalidação do checkout |

O passo a passo completo, incluindo interrupção/reconexão do socket, pedidos pendentes e eventos repetidos, está em [API_SIMULADA.md](docs/API_SIMULADA.md). Os endpoints de controle, códigos de erro e payloads estão em [API_CONTRACTS.md](docs/API_CONTRACTS.md).

## Comandos de validação

Instale o Chromium do Playwright antes da primeira execução E2E ou Lighthouse:

```sh
npx playwright install chromium
```

| Comando | O que executa |
| --- | --- |
| `npm run typecheck` | Verificação de tipos do TypeScript |
| `npm run lint` | ESLint, sem permitir avisos |
| `npm run test:data` | Testes de domínio existentes em `tests/data/` |
| `npm run test:e2e` | Suíte Playwright com servidor de desenvolvimento na porta 5173 |
| `npm run build` | Verificação de tipos e geração do build em `dist/` |
| `npm run test:e2e:production` | Suíte Playwright com preview do build na porta 4173 |
| `npm run test:e2e:report` | Abre o último relatório E2E de desenvolvimento |
| `npm run audit:lighthouse` | Três medições de Home e detalhe por perfil desktop/mobile |

Para reproduzir a validação local do build:

```sh
npm run typecheck
npm run lint
npm run test:data
npm run build
npm run test:e2e:production
```

O Playwright inicia e encerra seu próprio servidor. Deixe a porta correspondente livre; para o preview de produção, também é possível definir `PLAYWRIGHT_PORT` com outra porta. Os testes executam com mocks, contextos isolados e nenhuma repetição automática configurada.

Para executar a suíte na aplicação publicada, use PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://jungle-nft-marketplace-xi.vercel.app'
try {
  npm run test:e2e:production
} finally {
  Remove-Item Env:PLAYWRIGHT_BASE_URL
}
```

Com `PLAYWRIGHT_BASE_URL`, o comando usa a URL informada e não inicia servidor local. Novos relatórios ficam em `playwright-report/development`, `playwright-report/production` ou `playwright-report/public`; artefatos e traces de falha ficam no diretório correspondente em `test-results/`. Os relatórios finais versionados ficam em `docs/test-report/`.

Para Lighthouse local, execute `npm run build` e mantenha `npm start` aberto em um terminal. Em outro, execute `npm run audit:lighthouse`. O script usa a porta 4173 e grava HTML, JSON e medianas em `docs/lighthouse/final-delivery/`, substituindo arquivos de mesmo nome. Para auditar a publicação, defina `AUDIT_URL` com a URL pública; o build local continua necessário para registrar sua identificação. A configuração está em `lighthouse.config.mjs`.

### Resultados registrados em 16/10/2026

| Verificação | Resultado |
| --- | --- |
| TypeScript, lint e build | Aprovados |
| Testes de domínio | **13 aprovados**, sem falhas ou testes ignorados |
| E2E no build local | **112/112 aprovados**: 59 desktop e 53 mobile |
| E2E na URL pública | **112/112 aprovados**: 59 desktop e 53 mobile |
| Repetições, testes ignorados ou instáveis nas suítes E2E finais | 0 |
| Rotas e arquivos publicados | 10 rotas e 161 arquivos verificados; arquivos idênticos ao build local por SHA-256 |

Medianas Lighthouse de três medições por página e perfil, na versão pública de produção:

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home / desktop | 100 | 100 | 100 | 92 |
| Home / mobile | 94 | 100 | 100 | 92 |
| Detalhe do NFT / desktop | 100 | 100 | 100 | 92 |
| Detalhe do NFT / mobile | 94 | 100 | 100 | 92 |

As quatro combinações atingiram as metas do enunciado. [DELIVERY.md](docs/DELIVERY.md) detalha LCP, CLS, TBT, ambiente, condições e limitações; [DELIVERY_RESULTS.json](docs/DELIVERY_RESULTS.json) reúne os resultados estruturados. As oito imagens de referência da regressão visual foram produzidas em Windows/Chromium; a reprodução exata requer o mesmo ambiente ou referências apropriadas ao sistema utilizado.

Para abrir as evidências E2E preservadas:

```sh
npx playwright show-report docs/test-report
npx playwright show-report docs/test-report/public
```

## Organização do repositório

### Código da aplicação

| Pasta | Conteúdo |
| --- | --- |
| `src/app/` | Inicialização dos mocks, aplicação, providers, QueryClient e configuração do Router |
| `src/routes/` | Páginas e pontos de entrada das rotas públicas e protegidas |
| `src/features/` | Interface e lógica por fluxo: catálogo, NFT, autenticação, favoritos, carrinho, checkout e conta |
| `src/components/` | Componentes reutilizáveis, elementos de UI e estrutura compartilhada das páginas |
| `src/services/api/` | Cliente Axios e operações REST tipadas |
| `src/services/socket/` | Cliente Socket.IO, estado da conexão e sincronização com os recursos REST |
| `src/mocks/data/` | Fixtures e associação dos NFTs às imagens |
| `src/mocks/domain/` | Regras de negócio simuladas de catálogo, contas, sessão, carrinho, pedidos e carteiras |
| `src/mocks/handlers/` | Interceptação REST e Socket.IO e controles dos cenários |
| `src/mocks/state/` | Banco simulado, persistência e execução dos pedidos/eventos |
| `src/mocks/` | Inicialização do MSW, definição de cenários e tratamento compartilhado de falhas |
| `src/hooks/`, `src/lib/`, `src/types/` | Hooks compartilhados, utilitários e contratos TypeScript |
| `src/styles/` | Estilos globais, tema e tokens visuais |
| `public/` | Worker MSW, imagens, ícones e fontes servidos pela aplicação |
| `assets/originals/` | Arquivos originais do Figma e fontes usados na otimização opcional |

### Testes, evidências e ferramentas

| Caminho | Conteúdo |
| --- | --- |
| `tests/data/` | Testes de domínio sem navegador |
| `tests/e2e/` | Cenários Playwright e oito imagens de referência nas pastas `*-snapshots/` |
| `docs/CHALLENGE_README.md` | Enunciado preservado para consulta |
| `docs/API_CONTRACTS.md`, `docs/API_SIMULADA.md` | Contratos REST/eventos e instruções para selecionar/resetar cenários |
| `docs/DELIVERY.md`, `docs/DELIVERY_RESULTS.json` | Resumo da validação final e resultados estruturados |
| `docs/test-report/` | Relatório E2E local; `public/` contém o relatório da URL pública e `initial-failures/` seus traces de diagnóstico |
| `docs/lighthouse/final-delivery/` | 12 relatórios HTML, 12 JSON e um resumo com medianas |
| `docs/figma/` | Referências visuais e inventários dos arquivos exportados |
| `docs/assets/` | Evidências da otimização e verificação de imagens/fontes |
| `scripts/` | Auditoria Lighthouse e manutenção/verificação opcional dos assets |
| `ARCHITECTURE.md` | Responsabilidades, sessão, carrinho, cache, idempotência, tempo real, decisões e limitações |

Na raiz, `package.json` e `package-lock.json` definem comandos e dependências; `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` e `components.json` configuram build, tipos, lint e shadcn/ui. `playwright*.config.ts` e `lighthouse.config.mjs` configuram as validações. `.env.example`, `vercel.json` e `.vercelignore` documentam ambiente e publicação.

`node_modules/`, `dist/`, `playwright-report/` e `test-results/` são saídas locais ignoradas pelo Git. As evidências selecionadas para avaliação ficam versionadas em `docs/`. Os scripts `assets:optimize` e `assets:verify` são ferramentas opcionais de manutenção; `assets:verify` usa o preview em execução. O conversor `scripts/optimize-fonts.py` exige Python apenas para recriar as fontes.

## Publicação e limites da simulação

A Vercel usa o preset Vite, `npm ci`, `npm run build` e a saída `dist/`. As três variáveis públicas acima estão configuradas para produção. [vercel.json](vercel.json) define o fallback da SPA para acesso direto e refresh de rotas internas e serve o worker MSW sem cache. [.vercelignore](.vercelignore) exclui dependências locais, relatórios, arquivos originais e arquivos de ambiente do envio.

O Socket.IO usa o cliente real com transporte WebSocket, interceptado pelo MSW e pelo binding do protocolo. O endereço `.test` é intencional: não existe um servidor Socket.IO hospedado na Vercel. O `BroadcastChannel` sincroniza abas da mesma origem; a simulação não compartilha dados entre dispositivos.

Valores em ETH usam strings decimais e cálculos inteiros em wei. O checkout revalida a cotação e preserva chaves de idempotência para recuperar a mesma compra após timeout. Eventos versionados descartam duplicatas e atualizações antigas; a reconexão reconcilia os dados com REST. As políticas completas, adaptações do Figma e limites da avaliação visual/acessível estão em [ARCHITECTURE.md](ARCHITECTURE.md).
