# Prompt 8 — Checkout, pagamento simulado e recibos

Implementação de 16/10/2026. Referência principal: [README oficial](https://github.com/junglegaming/frontend-challenge/blob/main/README.md), relido integralmente nesta etapa. A documentação local complementa o enunciado; os contratos estabelecidos no Prompt 3 foram preservados. Nenhuma dependência foi instalada.

## A. Implementações

- `/checkout`: entrada protegida, leitura do carrinho e das carteiras autorizadas, dados do colecionador, seleção de carteira/rede, conexão simulada, recusa e desconexão. A carteira principal é selecionada inicialmente; carteira e rede incompatíveis bloqueiam o avanço. Dados opcionais não preenchidos são omitidos do corpo.
- Revisão em diálogo nativo antes do envio, com foco inicial em voltar à edição, Escape e retorno do foco. Campos obrigatórios, limites e e-mail seguem o contrato existente. Labels permanecem estáveis mesmo com mensagens de erro.
- Cotação específica para carteira/rede, com valores e expiração da API. Antes do POST de pedido, sessão, carteira, carrinho e cotação são consultados novamente. Diferenças exigem outra revisão. Não há cálculo financeiro paralelo na interface.
- Envio de pedido com chave idempotente persistida antes da requisição; bloqueio síncrono de cliques repetidos e mutations sem retry automático. Refresh e reautenticação permitem recuperar a mesma tentativa, sem iniciar outra compra automaticamente.
- `/orders`: consulta mínima de pedidos da conta, com estado, total e acesso ao detalhe.
- `/orders/$orderId`: pending, confirmed e declined vindos da API. Enquanto pendente, eventos existentes invalidam o detalhe e uma consulta a cada 2 segundos permite recuperar o estado mesmo sem receber o evento. Há consulta manual e recuperação após refresh.
- Recibo confirmado obtido por endpoint próprio. Valores, nomes, edições, quantidades, carteira, colecionador e referência simulada vêm do snapshot histórico; somente a imagem decorativa é consultada no catálogo.
- Falhas de consulta, 403, 404, ausência de carteira, carrinho vazio, cupom inválido/expirado, estoque, cotação expirada e resultado ambíguo possuem feedback e ações de recuperação. Recusa não gera recibo nem esvazia carrinho.

## B. Integração e regras

Todos os caminhos abaixo usam a base `/api` e passam por Axios/TanStack Query. Nenhum endpoint de negócio novo foi criado.

| Operação | Endpoint utilizado |
| --- | --- |
| Sessão antes da compra | GET `/session` |
| Carrinho e reconciliação | GET `/cart` |
| Carteiras autorizadas | GET `/wallets` |
| Conexão simulada | POST `/wallets/:id/connection`, corpo `{network}` |
| Desconexão simulada | DELETE `/wallets/:id/connection` |
| Cotação e revalidação | POST `/quotes`, corpo `{walletId,network}` |
| Nova tentativa ou recuperação | POST `/orders`, `Idempotency-Key` e `CreateOrderRequest` |
| Histórico mínimo | GET `/orders` |
| Estado do pedido | GET `/orders/:id` |
| Recibo histórico | GET `/orders/:id/receipt` |
| Arte dos itens | GET `/nfts/:id` |

A edição do cupom continua no carrinho pelo serviço existente. Os testes usam os controles MSW de reset, cenário, relógio, atualização de NFT e finalização de pedido; esses controles não são importados pela interface.

### Cache e concorrência

Queries privadas incluem token: `['cart',token]`, `['wallets',token]`, `['orders',token]`, `['order',token,id]`, `['receipt',token,id]`. A quote reutiliza o serviço anterior e acrescenta `{walletId,network}` à assinatura de carrinho/itens/preços/disponibilidade/cupom. O carrinho do Prompt 7 mantém seu formato anterior de key quando não fornece contexto.

Leituras de checkout/pedido têm staleTime 0 e retry false; recibo tem staleTime Infinity por ser imutável, com refetch explícito/invalidação quando necessário. Mutations `['wallets',token,'connection']` e `['orders',token,'create']` não fazem retry automático. Axios conserva timeout de 10 segundos e cancelamento/descarte na mudança de sessão. Callbacks verificam o token capturado antes de atualizar dados ou navegar. O cleanup privado existente foi ampliado para incluir recibos.

Revalidação final usa uma query própria para obter quote nova; não aceita apenas o snapshot em cache. Compara itens/versões, carteira/rede, cupom, subtotal, desconto, taxa e total com a revisão aceita. A API ainda faz a validação final/atômica de preço e disponibilidade, inclusive se houver mudança após essa consulta. Se houver rejeição, a interface reconcilia o carrinho e solicita revisão.

Após criação/resultado terminal, invalida pedidos, carrinho, catálogo, detalhes dos NFTs afetados e quotes. O cache do detalhe não substitui uma versão mais nova por uma resposta de criação antiga. A UI não reserva estoque, não remove linhas localmente como fonte de verdade e não confirma pagamentos por temporizador. O domínio existente reserva na criação, vende na confirmação, libera na recusa e subtrai somente as quantidades compradas do carrinho atual, preservando acréscimos posteriores.

### Identidade idempotente e recuperação

`sessionStorage` mantém, por user.id, apenas rascunho de dados/seleção e referência da intenção: chave, corpo exato e orderId quando conhecido. Não guarda outro pedido, resultado de pagamento, recibo, estoque ou cálculo monetário. A autoridade permanece no banco MSW persistido.

A chave UUID é criada somente depois de uma revisão válida e revalidação bem-sucedida; o armazenamento ocorre antes do POST. Se não puder persistir, o envio não ocorre. Clique rápido não passa pelo bloqueio síncrono duas vezes. Timeout, falha de rede, cancelamento, 401, 5xx ou conflito idempotente mantêm a tentativa sem inventar resultado. A ação de recuperar repete exatamente a chave e o corpo originais. A API retorna o mesmo pedido antes de revalidar uma quote antiga, sem outra reserva. Refresh/login não fazem esse POST automaticamente.

Rejeições definitivas anteriores à criação (por exemplo quote alterada/expirada, estoque, cupom ou validação) permitem descartar aquela referência ainda sem orderId e voltar à revisão. Resultado terminal autoritativo limpa a referência associada ao pedido. Se o usuário consultar outro pedido sem relação com a tentativa, sua referência não é removida. Armazenamento corrompido bloqueia outra compra e orienta consultar pedidos.

As referências ficam separadas por conta. B não recebe dados de A na interface; A pode recuperar a intenção ao autenticar novamente na mesma aba. Não há coordenação de uma intenção compartilhada entre abas independentes: duas confirmações deliberadas em abas diferentes são intenções diferentes. Fechar a aba remove sessionStorage; pedidos já criados continuam consultáveis na API pelo histórico da conta.

### MSW e eventos

Preservados o mesmo banco, handlers, socket.io-client e `@mswjs/socket.io-binding`, exclusivamente com transporte WebSocket. Nenhum servidor Socket.IO/Express, extensão ou pagamento real foi introduzido. `nft.updated` invalida carrinho e cotação; `order.updated` da conta corrente invalida o pedido e, no resultado terminal, carrinho/recibo. Não há setters chamados pelo mock.

`server-error`, `network-error`, `transient-error` e `out-of-order` foram estendidos aos recursos existentes `/wallets` e `/orders`, inclusive recibos/conexão. Não foi criado um segundo mecanismo de cenário. `order-timeout` continua criando o pedido antes de atrasar a primeira resposta por 15 segundos; a recuperação idempotente não sofre esse atraso. `payment-pending`, `payment-declined`, `wallet-refused`, cupom e controles de estoque são os cenários preexistentes.

Reconexão/replay/ordenação avançados do socket ficam no Prompt 9. Nesta etapa, o pedido tem GET manual/periódico e reconstituição por refresh; terminais continuam controlados pelo domínio.

## C. Figma e acessibilidade

Frames consultados na [cópia de trabalho](https://www.figma.com/design/lrCchkzKTa5nrWJT5nhUMN/Frontend-Challenge): Desktop / Pagamento `11:2862` (1440 × 1657), Mobile / Pagamento `16:748` (414 × 896), Desktop / Confirmação de Pedido `11:4385` (1440 × 1657). Não há frame mobile específico do recibo; foi adaptado preservando a composição central, hierarquia e paleta.

A skill figma-design-to-code foi aplicada; get_design_context com screenshot e get_screenshot retornaram limite do plano Starter. A consulta dos frames ocorreu diretamente no editor. Isso não equivale a extração integral nem permite declarar equivalência pixel a pixel. Nenhum upgrade foi comprado e os desenhos não foram alterados.

Após autorização expressa do usuário nesta etapa, foi adicionada configuração de exportação SVG somente a `thank-you 1` (`11:5150`) na cópia de trabalho. O arquivo original `checkout-thank-you.svg`, 80 × 80, substitui o texto provisório do recibo. A geometria intrínseca foi verificada em todos os viewports; não foram redesenhados paths. A exportação não alterou o desenho. O ícone de voltar reutiliza o SVG oficial existente; NFT images continuam fornecidas pela API. Fonte Roboto Mono e assets permanecem locais.

Desktop conserva formulário em duas colunas à esquerda, resumo à direita, header/footer existentes e recibo central de 580 px com separadores e borda âmbar. Mobile prioriza carteira/rede e CTA, oferecendo dados do colecionador e itens em seções expansíveis antes da revisão final. Radio nativo identifica a carteira ativa; labels/erros associados, botão com foco visível, diálogo modal com Escape/foco, regiões de status, shimmer/reduced motion e alvos de toque fazem parte da interface.

Diferenças conhecidas: apenas carteiras reais da API são oferecidas (as fixtures atuais têm duas MetaMask), sem adicionar WalletConnect/Coinbase fictícias para preencher o desenho. A identificação do provedor usa a inicial tipográfica. Os dados requeridos pelo contrato, conexão explícita, expiração, mensagens, descontos e detalhes históricos aumentam a altura em relação aos frames estáticos. O recibo mostra também colecionador/rede/endereço e identifica claramente a transação como simulada. Etherscan abre aviso coerente de indisponibilidade de exploração real. Os valores ilustrativos do Figma não substituem preços ou taxas da API. Não foram modificados header/carrinho/cards além da indicação Mercado no checkout.

Capturas da aplicação em `docs/screenshots/prompt8/`: checkout e recibo em 390, 414, 768 e 1440; formulário e revisão mobile. `verification.json` registra ausência de overflow/imagens quebradas/erros JavaScript e geometria 80 × 80 da ilustração. Baselines de pagamento em `tests/e2e/checkout.spec.ts-snapshots/`; apenas ID/horário voláteis da quote são mascarados. As baselines documentam a implementação revisada, não provam igualdade com o Figma. Foram geradas no Chromium/Windows; outros ambientes requerem revisão controlada das diferenças de renderização.

## D. Verificação

Comandos executados com Node 24, sem usar o Vite do usuário na porta 5173:

```text
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node --test tests/data/*.test.ts
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts --workers=1
```

TypeScript, lint e build passaram. Domínio/validação: **8/8 aprovados**. A regressão completa executou **74 verificações: 72 aprovadas e 2 falhas no mesmo teste legado de autenticação**, em desktop/mobile (7,6 minutos). A falha era a navegação de logout procurando o menu do placeholder que deixou de existir no checkout. Os **12/12 casos novos de checkout passaram nessa regressão**, inclusive baselines de pagamento, timeout, recusa, cupom e estoque. Relatório completo e traces das falhas preservados: `playwright-report/production/index.html` e `test-results/production/`.

Após corrigir o teste, toda a suíte de autenticação passou: **12/12**, em 1,7 minuto. Relatório separado: `playwright-report/production-auth-fix/index.html`. O helper mantém a navegação SPA anterior quando o menu de conta existe e usa acesso direto ao perfil somente como alternativa no checkout, preservando a finalidade do teste de respostas atrasadas/subscriptions entre contas.

A verificação final do helper e do acabamento mobile executou **6/6 testes aprovados**, em 58,4 segundos: rotas privadas/retorno/403, resposta privada e eventos durante troca de conta, e jornada completa ao recibo em desktop/mobile. Relatório: `playwright-report/production-prompt8-final/index.html`. As baselines foram revistas após retirar o espaço reservado à navegação inferior que não é usada no pagamento/recibo. TypeScript e lint passaram novamente no código final; o build final também passou. Não houve uma segunda execução completa de 74 testes após essa correção localizada: os casos afetados foram reexecutados, sem afirmar 74/74 em uma única execução.

Antes da regressão, os seis grupos novos passaram em desktop e mobile (12 execuções). Mais quatro execuções dirigidas passaram ao incluir falha de consulta do pedido e cupom expirado na revalidação final; a jornada completa passou nos dois projetos ao gerar/revisar baselines.

Cobertura: catálogo → edição/quantidade → carrinho visitante → autenticação/merge → checkout → conexão → revisão → envio único → confirmação → recibo; carteiras/rede/recusa/desconexão; validação/foco; quote expirada com relógio controlado; pendência/refresh; recusa preservando carrinho; confirmação preservando quantidade adicionada depois; timeout real do Axios e replay de chave/corpo idênticos sem duplicação; alterações pelo cliente Socket.IO; precisão de 18 casas; cupom expirado após revisão; 503/latência/skeleton/retry; imutabilidade após preço novo; sessão expirada após commit; retomada A/B/A; 403 e 404. Testes de API anteriores preservam o conflito de conteúdo para a mesma chave e concorrência de criação.

As primeiras execuções identificaram botão de revisão duplicado para tecnologia assistiva, foco inicial do diálogo e label alterado por mensagem de erro. Foram corrigidos na interface e os casos mantidos. A janela também é fechada quando a revalidação rejeita a revisão. Não foram acrescentados retries de teste para ocultar falhas. Testes anteriores que esperavam o placeholder de checkout foram atualizados para a página funcional; logout no teste do carrinho passa pela conta, acessível também no mobile.

## E. Conformidade com o README

Requisitos abaixo são paráfrases das seções reais do enunciado; não são critérios novos.

| Requisito do README | Status | Evidência |
| --- | --- | --- |
| §3 Pagamento: dados, carteira/rede, revisão e envio | Implementado | `/checkout`, dados API, validação e diálogo antes de criar pedido. |
| §3 Conexão, recusa e desconexão simuladas | Implementado | Endpoints existentes de connection e teste wallet-refused. |
| §3 Revalidar condições e exigir outra confirmação se mudarem | Implementado | GETs e quote fresca, comparação com revisão, bloqueio de estoque/cupom/expiração. |
| §3 ETH decimal em strings; quote define valores | Implementado | Totals/CartLine da API, teste com 18 casas; domínio BigInt preservado. |
| §3/5 Duplicatas, timeout e conflito de chave/conteúdo | Implementado | Referência persistida antes do envio, replay exato, teste de cliques/timeout e API de conflito. |
| §3 Pendência, confirmação e recusa; refresh | Implementado | Detalhe protegido, eventos/GET, settlement persistido e cenários UI. |
| §3 Confirmação condicionada ao resultado da simulação | Implementado | Branch confirmed da resposta; recibo consultado por GET, nenhum sucesso local. |
| §3 Carrinho preservado em falha; baixa só do comprado | Implementado | Domínio anterior preservado e caso UI com acréscimo durante pendência. |
| §3 Snapshot imutável e referências simuladas | Implementado | GET receipt; comparação antes/depois da mudança de catálogo; aviso Etherscan. |
| §3/4 Sessão, isolamento e respostas antigas | Implementado | Guard/AuthProvider/Axios, keys por sessão, cleanup de receipt e teste A/B/A/403. |
| §4/6 Cache, estado assíncrono e mocks de rede | Implementado | Query/mutations existentes, cenários MSW ampliados, loading/erro/retry, banco único. |
| §6/7 Socket.IO exercitado com MSW | Integrado nesta etapa | Eventos reais invalidam quote/pedido; binding e cliente únicos, sem backend. |
| §7 Recuperação avançada de conexão/eventos | Parcial, Prompt 9 | Refresh/GET do pedido disponíveis; replay/ordenação/reconexão avançados não antecipados. |
| §8 Composição, viewports, assets e acessibilidade | Implementado com diferenças documentadas | Frames consultados, SVG original, capturas/medidas, teste de foco/Escape/labels. |
| §9 Compra, recusa, timeout, mudança no checkout e testes UI | Implementado | Seis grupos novos nos dois viewports e regressão anterior preservada. |
| §9 Baselines de pagamento e restante da jornada | Pagamento implementado; conjunto completo pendente | Duas baselines de checkout, sem substituir a auditoria visual final das demais telas. |

## F. Pendências

Não há integração real de carteira, assinatura, blockchain ou gateway, conforme o escopo. Gestão completa de perfil/avatar/senha/carteiras permanece no Prompt 10; replay/reconexão robusta de eventos no Prompt 9. Baselines de toda a jornada, auditorias Lighthouse e deploy público continuam nas etapas de finalização. Não se declara o README inteiro concluído no Prompt 8.

Limitações visuais e do conector estão descritas acima. A exportação da ilustração foi autorizada e concluída; não há asset de agradecimento pendente. Nenhuma falha funcional impeditiva do Prompt 8 ficou identificada. As duas falhas de teste da regressão foram corrigidas e passaram nas reexecuções descritas, cujos relatórios foram preservados separadamente.

Não foi criado commit: `git config user.name` e `git config user.email` continuam ausentes. Não foi inventada identidade. Mensagem sugerida: `feat: implement checkout payments and order receipts`.

## G. Arquivos criados ou alterados nesta etapa

- `src/routes/{checkout.tsx,orders.tsx}` e `src/app/router/index.ts`: páginas e rotas privadas reais.
- `src/features/checkout/{attempt.ts,summary.tsx,checkout.css}`: referência idempotente, rascunho, validação, apresentação e estilos.
- `src/services/api/{checkout.ts,cart.ts}`: serviços privados e contexto da cotação.
- `src/hooks/{use-quote-expiry.ts,use-marketplace-realtime.ts}`: expiração compartilhada e invalidação por resultado.
- `src/routes/cart.tsx`: reutilização do hook de expiração, sem recriar o fluxo anterior.
- `src/features/auth/auth-provider.tsx`: inclusão do recibo no cleanup privado.
- `src/components/layout/{app-shell.tsx,site-header.tsx}`: composição do pagamento/recibo e navegação ativa.
- `src/mocks/http.ts`: cenários existentes também em pedidos/carteiras.
- `public/assets/figma/checkout-thank-you.svg`: ilustração original exportada.
- `tests/data/checkout.test.ts`, `tests/e2e/checkout.spec.ts` e suas duas baselines; ajustes compatíveis em `tests/e2e/{auth.spec.ts,cart.spec.ts}`.
- `README.md`, `ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, este relatório, `docs/figma/{README.md,checkout-assets.json}` e `docs/screenshots/prompt8/`.
