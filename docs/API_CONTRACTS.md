# Contratos da API simulada

Fonte: [README oficial, seções 3 a 7](https://github.com/junglegaming/frontend-challenge). Ele especifica recursos/comportamentos, mas não impõe caminhos, nomes de campos ou envelopes JSON. Os contratos abaixo são as escolhas da solução para cumprir esses requisitos. Tipos compartilhados: `src/types/marketplace.ts` e `src/types/diagnostics.ts`.

Tudo é interceptado pelo **MSW no navegador**, inclusive Socket.IO. Não há backend separado. Os handlers compartilham o mesmo estado entre todas as telas e os controles de teste.

## Convenções e autenticação

- Base padrão `/api`, configurável por `VITE_API_BASE_URL`.
- JSON em requests/responses. Recursos singulares são retornados diretamente; listas usam `{items}` e o catálogo adiciona `pagination`.
- `Authorization: Bearer <token>` nos recursos privados. Tokens não são identidade escolhida pelo chamador: sessão válida resolve o usuário proprietário.
- `X-Guest-Id`: identificador estável do visitante, obrigatório para carrinho/cotação anônimos, de 1 a 80 caracteres alfanuméricos, `_` ou `-`.
- O cliente Axios anexa o visitante e o token da sessão automaticamente. Credenciais do cliente ficam em `sessionStorage`, separadas por aba e preservadas no refresh. `authApi` fornece login, cadastro, consulta e logout sem criar interface.
- Todos os campos `*Eth` são **strings decimais**, nunca números. Aceitam até 18 casas; a resposta é normalizada (`"0.0"`, `"1.19"`). Cálculos internos usam `BigInt` em wei; BigInt nunca trafega em JSON.
- Quantidades são inteiros de 1 a 999 nas operações de carrinho, limitados também pelo estoque. Remoção é explícita por DELETE, não quantidade zero.
- Erros: `{code, message, fieldErrors?, details?}`. O cliente Axios preserva código, status, erros de campos e detalhes em `ApiError`.

Status usados: 400 corpo/header obrigatório inválido; 401 sessão ausente/inválida/expirada; 403 recurso de outra conta; 404 recurso inexistente; 409 conflito de estoque/cotação/idempotência; 422 validação; 503 falha transitória; 507 persistência indisponível. Logout e desconexão de carteira respondem 204 sem corpo.

## Fixtures e regras demonstrativas

- **30 NFTs**, com IDs `nft-001` a `nft-030`; **90 edições**, rotuladas `1/1`, `1/10`, `1/50`, com preço e disponibilidade próprios. `nft-008`, `nft-016` e `nft-024` estão integralmente esgotados.
- Três coleções e três criadores fictícios; sete categorias e redes `ethereum`, `polygon`, `solana`.
- Nomes conhecidos do layout nos oito primeiros itens. Os demais nomes são dados fictícios de demonstração. `image.src` aponta aos assets oficiais locais extraídos do `.fig`; bancos antigos com imagem ausente recebem apenas esse metadado, preservando o estado de negócio. O tipo continua aceitando `null` para representar imagem indisponível.
- Contas `alice@example.test` e `bruno@example.test`, ambas com a senha fictícia **`Demo#2026`**. Verificadores PBKDF2/SHA-256 com salt e 100.000 iterações; nenhuma senha em claro é gravada no banco.
- Uma sessão de exemplo já expirada: token `expired-demo-session`. Não existe login automático.
- Favoritos/carrinhos diferentes por conta; Alice tem carteiras principal e reserva, Bruno tem principal. Endereços são fictícios, sem chaves privadas ou operações reais.
- Um pedido histórico confirmado de Alice: `order-demo-alice`, com recibo/transação simulados e snapshot fixo.
- Cupom `WELCOME10`: desconto de 10%, válido até 01/01/2030 UTC. `EXPIRED`: cupom expirado em 2020. Desconto arredondado uma vez para baixo em wei.
- Taxas de rede demonstrativas: Ethereum `"0.016"`, Polygon `"0.002"`, Solana `"0.001"`. Não são estimativas de mercados reais nem parâmetros impostos pelo README.
- Sessão: 30 minutos; cotação: 5 minutos. IDs de entidades/eventos sequenciais; fixtures e latências fixas. Tokens/salts opacos são gerados por Web Crypto e não fazem parte das expectativas determinísticas dos testes.

## Descoberta

| Método/caminho | Contrato |
| --- | --- |
| `GET /health` | Diagnóstico original: `{status:"ok", service:"nft-marketplace-mock"}`. |
| `GET /nfts` | Retorna `{items:Nft[], pagination:{page,pageSize,totalItems,totalPages}}`. |
| `GET /nfts/:id` | `NftDetail`, com edições, creator e collection; 404 para inexistente. |
| `GET /collections` | `{items:Collection[]}`. |
| `GET /creators` | `{items:Creator[]}`. |

Parâmetros combináveis do catálogo:

| Parâmetro | Valores |
| --- | --- |
| `q` | Texto até 120 caracteres; busca sem distinguir caixa/acentos em nome, descrição, criador e coleção. |
| `category` | `art`, `photography`, `music`, `3d`, `collectibles`, `generative`, `gaming`; lista por vírgula ou parâmetro repetido. |
| `network` | `ethereum`, `polygon`, `solana`; lista por vírgula ou parâmetro repetido. |
| `collectionId`, `creatorId` | Igualdade por identificador. |
| `minPrice`, `maxPrice` | Strings decimais ETH, comparadas sem ponto flutuante com o menor preço das edições. |
| `available` | `true` ou `false`, conforme disponibilidade agregada do NFT. |
| `sort` | `recent` (default), `price-asc`, `price-desc`, `name`; desempate estável por ID. |
| `page`, `pageSize` | Inteiros; defaults 1 e 9. Page size máximo 100. Página além do fim retorna lista vazia com os mesmos totais. |

Exemplo: `/api/nfts?category=art&network=ethereum&minPrice=1&maxPrice=6&sort=price-asc&page=1&pageSize=1` tem dois resultados distribuídos em duas páginas.

## Conta, sessão e perfil

| Método/caminho | Entrada e resultado |
| --- | --- |
| `POST /accounts` | `{username,email,password,confirmPassword}` → 201 `SessionResponse`; cadastro já cria sessão. E-mail/username duplicados: 409. |
| `POST /session` | `{email,password}` → `SessionResponse`; credenciais incorretas: 401. |
| `GET /session` | Privado → `{token,user,expiresAt,connection}`. Recupera inclusive carteira/rede conectada após refresh. |
| `DELETE /session` | Revoga o token informado; idempotente, inclusive se já expirado. |
| `POST /session/expire` | Expira explicitamente a sessão corrente para demonstração; contexto de carrinho/pedido continua no banco. |
| `GET /profile` | Privado → `Profile`. |
| `PATCH /profile` | Privado; campos parciais `username,email,displayName,ens,walletAlias`; preserva ID e incrementa versão. |
| `PATCH /profile/avatar` | `{dataUrl:string|null}`; PNG/JPEG/WebP em base64, máximo 1 MiB; `null` remove. |
| `POST /profile/password` | `{currentPassword,newPassword,confirmPassword}`; valida senha atual e confirmação; revoga outras sessões da conta. |

Validações da solução: username com 3–32 letras/números/`_`, e-mail normalizado, senha de 8–128 caracteres com letra e número, nomes até 80 caracteres. São escolhas demonstrativas documentadas, não regras de tamanho extraídas do README. Verificadores e detalhes internos de sessão nunca são incluídos no perfil público.

Ao autenticar/cadastrar, o carrinho visitante é incorporado por NFT + edição e consumido uma única vez. Quantidades são somadas respeitando estoque/limite; a resposta inclui `cartMerge:{merged,adjustments}` para informar qualquer ajuste de quantidade. Carrinhos privados de usuários diferentes nunca são mesclados entre si. Uma sessão anterior informada na nova autenticação é revogada.

## Favoritos, carrinho e cotação

| Método/caminho | Entrada e resultado |
| --- | --- |
| `GET /favorites` | Privado → `{items:Nft[]}` da conta. |
| `PUT /favorites/:id` | Privado; inclusão idempotente, sem corpo obrigatório. |
| `DELETE /favorites/:id` | Privado; remoção idempotente. |
| `GET /cart` | Conta atual ou visitante → `Cart` hidratado pelo catálogo atual, com itens, totais e `issues`. |
| `DELETE /cart` | Esvazia itens/cupom do próprio carrinho. |
| `POST /cart/items` | `{nftId,editionId,quantity}`; soma a quantidade se o item já existe. |
| `PATCH /cart/items/:id` | `{quantity}` substitui a quantidade. |
| `DELETE /cart/items/:id` | Remove somente o item do próprio carrinho. |
| `PUT /cart/coupon` | `{code}` aplica cupom válido; erro não substitui o anterior. |
| `DELETE /cart/coupon` | Remove cupom e recalcula. |
| `POST /quotes` | `{network?,walletId?}` → 201 `Quote` com itens, subtotal/desconto/taxa/total, contexto e expiração. |

ID da linha: `nftId:editionId`, devendo ser codificado na URL. Carteiras em quotes exigem autenticação/propriedade e rede compatível; visitantes podem obter resumo/cotação sem carteira. Para criar pedido, é obrigatória uma nova cotação autenticada, associada à carteira selecionada.

O carrinho não reserva estoque. Preço/estoque são lidos da mesma entidade usada em catálogo/detalhe. Mudanças não descartam itens silenciosamente: `GET /cart` informa conflitos em `issues`; cotação bloqueia estoque insuficiente e cupons inválidos/expirados. O resumo sem contexto de carteira usa a taxa Ethereum; a cotação final com a rede selecionada é a referência para checkout.

Fórmula exata: `subtotal - desconto + taxa`. Cotação registra versão do carrinho, edições/preços/disponibilidade, carteira/rede/versão, cupom e taxas. Nenhum preço ou total enviado pelo cliente substitui os valores calculados pela API.

## Carteiras e seleção de rede

| Método/caminho | Entrada e resultado |
| --- | --- |
| `GET /wallets` | Privado → `{items:Wallet[]}`. |
| `POST /wallets` | `WalletInput` → 201; uma principal e uma secundária por conta. |
| `PATCH /wallets/:id` | Campos parciais; valida o resultado inteiro; editar invalida conexões com a versão anterior. |
| `POST /wallets/:id/connection` | `{network}` → `WalletConnection`; rede diferente: 422; cenário de recusa: 409. |
| `DELETE /wallets/:id/connection` | Desconecta a carteira da sessão corrente. |

`WalletInput`: `role`, `displayName`, `alias`, `profileName`, `email`, `network`, `type`, `address`, `referralCode`; opcionais `ens`, `secondaryAddress`. Roles `primary|secondary`; tipos `metamask|walletconnect|coinbase`. Endereços EVM têm `0x` + 40 hex; Solana usa formato base58 com 32–44 caracteres. São validações de formato, sem consulta a blockchain. Seleção/conexão é uma simulação persistida por sessão, nunca uma extensão real.

## Pedidos, idempotência e recibo

| Método/caminho | Entrada e resultado |
| --- | --- |
| `POST /orders` | Privado; header `Idempotency-Key` e `CreateOrderRequest` → 201 novo pedido pendente, ou 200 ao recuperar o existente. Header `Idempotency-Replayed` identifica a repetição. |
| `GET /orders` | Privado → `{items:Order[]}` apenas da conta. |
| `GET /orders/:id` | Privado → estado atual do próprio pedido; outro usuário: 403. |
| `GET /orders/:id/receipt` | Somente confirmado; pendente/recusado: 409 `ORDER_NOT_CONFIRMED`. |

Exemplo de corpo de criação:

```json
{
  "quoteId": "quote-123",
  "walletId": "wallet-alice-primary",
  "network": "ethereum",
  "collector": {
    "displayName": "Alice Colecionadora",
    "username": "alice",
    "email": "alice@example.test",
    "profileName": "alice"
  }
}
```

`collector` também aceita `ens`, `referralCode`, `secondaryAddress`, `notes`. A chave aceita 1–128 caracteres alfanuméricos, `_`, `.`, `:`, `-` e é isolada por usuário. O fingerprint compara os campos aceitos/normalizados do corpo em ordem canônica; ordem das propriedades JSON não cria uma nova tentativa.

Antes de reservar, a API verifica sessão, carteira/conexão/rede, propriedade/expiração da quote, carrinho, preços, disponibilidade, cupom e taxas. Mudança gera 409/422 apropriado: é preciso obter e revisar nova cotação. Uma tentativa já registrada é recuperada **antes** dessas verificações, sem duplicar reserva ou compra. Reutilizar chave com conteúdo diferente resulta em 409 `IDEMPOTENCY_CONFLICT`.

Estados: `pending`, `confirmed`, `declined`. Um novo pedido reserva unidades atomicamente; confirmação transforma reserva em venda, recusa libera a reserva. Somente confirmação remove do carrinho as quantidades compradas, preservando acréscimos posteriores. Status terminais não regridem. Recibo congela itens, valores, carteira e colecionador; mudanças posteriores não o recalculam. Transação começa por `simulated-tx-` e o recibo declara `simulated:true`.

No cenário padrão, o pedido é confirmado após 1 s. Decisão/prazo ficam persistidos; refresh restaura o agendamento e GET reconcilia decisões já vencidas. A simulação não depende de uma Promise em memória sobrevivendo à página. O cenário pendente mantém o estado até um comando explícito de finalização.

## Cenários controláveis

Não há falhas aleatórias. Controles pertencem aos mocks habilitados e são ferramentas públicas de demonstração/teste, não endpoints de um backend real. Não retornam o banco nem senhas/tokens de outras contas.

| Método/caminho | Uso |
| --- | --- |
| `POST /__mock/reset` | `{scenario?:string}`; restaura integralmente fixtures, sessões, carrinhos, perfil, carteiras, pedidos, quotes, idempotência, relógio e contadores; cancela agendamentos antigos. Default `default`. |
| `GET /__mock/status` | Nome do cenário, relógio, contadores e totais das fixtures. |
| `PUT /__mock/scenario` | `{scenario:string}`; troca cenário e zera contadores, preservando o restante do estado. Alterações de preço/estoque já aplicadas não são desfeitas ao voltar a `default`; use reset. |
| `POST /__mock/clock` | `{advanceMs:integer}`; avança relógio simulado e processa finalizações vencidas. Tempo natural continua correndo; testes também podem controlar Date/relógio do navegador. |
| `PATCH /__mock/nfts/:id` | `{editionId,priceEth?,availableQuantity?}`; altera a fonte canônica e emite `nft.updated`. |
| `POST /__mock/orders/:id/settle` | `{status:"confirmed"|"declined"}`; finaliza e emite eventos. Repetir o mesmo terminal é idempotente; terminal oposto gera conflito. |

| Cenário | Efeito reproduzível |
| --- | --- |
| `default` | Respostas normais e confirmação em 1 s. |
| `empty` | Catálogo vazio sem apagar fixtures. |
| `slow` | Respostas de negócio atrasadas em 800 ms. |
| `out-of-order` | GET /nfts alterna 600/20 ms; snapshots/respostas podem chegar em ordem inversa. |
| `server-error` | GET /nfts responde 503. |
| `network-error` | GET /nfts falha na rede por `HttpResponse.error()`. |
| `transient-error` | Primeiro GET /nfts falha 503, os seguintes recuperam. |
| `unauthorized` | Operações privadas exigem nova autorização e retornam 401 enquanto ativo. |
| `session-expired` | Expira sessões existentes; ativar após login. Novo login pode criar nova sessão. |
| `validation-error` | POST/PUT/PATCH de negócio retornam 422 com erros de campo. |
| `coupon-invalid`, `coupon-expired` | Cupom informado/aplicado falha com o código correspondente. |
| `price-changed` | Define nft-001-ed-10 como `"1.49"`, incrementa versão e emite evento. |
| `sold-out`, `stock-conflict` | Zera disponibilidade de nft-001-ed-10; não apaga o carrinho e gera conflito na cotação. |
| `order-timeout` | Cria/reserva de verdade, mas atrasa a primeira resposta por 15 s, excedendo o timeout Axios de 10 s. Retry com a mesma chave recupera imediatamente o mesmo pedido. |
| `payment-confirmed` | Novos pedidos confirmam em 1 s. |
| `payment-declined` | Novos pedidos são recusados em 1 s e liberam reservas. |
| `payment-pending` | Novos pedidos permanecem pendentes até comando de finalização. |
| `wallet-refused` | Tentativa de conexão da carteira é recusada. |

O health original permanece independente dos cenários de negócio. Latência e contadores são configurados antes da resposta; gravações confirmadas não são revertidas só porque o chamador cancelou a espera.

Exemplo no console da aplicação, depois de MSW iniciar:

```js
await fetch('/api/__mock/reset', { method: 'POST' })
await fetch('/api/__mock/scenario', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'out-of-order' })
})
```

Após reset, autentique novamente ou limpe o token local/recarregue para não reutilizar uma sessão revogada. Como uma aplicação de demonstração armazena o mock no próprio navegador, seus dados são inspecionáveis pelas ferramentas de desenvolvimento e não constituem um sistema de autenticação de produção.

## Eventos e persistência

- `nft.updated`: envelope com `id`, `resourceId`, `version`, `occurredAt`, `data:Nft`.
- `order.updated`: mesmo envelope, mais `userId`, com `data:Order`; emitido somente para conexão associada a sessão ativa desse usuário.
- Após handshake, `client:ready` aceita `{sessionToken?:string|null}` e mantém o diagnóstico `server:ready`. Não confundir o SID fixo do binding com identidade de usuário/evento.
- Eventos só são publicados após persistir a transação. Os handlers não chamam React setters ou Query cache. Logout/expiração revoga a autorização de eventos privados mesmo que o socket continue aberto.
- Banco único em `localStorage` (`jungle-marketplace.mock.v1`); sem BigInt ou senha em claro serializados. Transações síncronas sob Web Locks no navegador serializam acesso entre abas. Sem Web Locks, há fila por contexto; esse fallback não oferece exclusão entre abas. Node usa armazenamento/fila em memória nos testes de domínio.

As regras de deduplicação, reconciliação, sessão e cache estão em [ARCHITECTURE.md](../ARCHITECTURE.md). A reprodução dos cenários está em [API_SIMULADA.md](API_SIMULADA.md).

## Integração de detalhes e favoritos

A UI de detalhes usa os contratos existentes, sem novos endpoints ou campos de negócio. `NftDetail.image` continua sendo a imagem real singular; não há galeria artificial. Favoritos usam GET/PUT/DELETE por sessão, persistindo no mesmo banco. A sessão do cliente tornou-se observável para invalidar dados privados; callbacks antigos não atualizam o cache da conta seguinte. Os cenários `server-error`, `network-error`, `transient-error`, `slow` e `out-of-order` de leitura de NFTs cobrem também `GET /nfts/:id`; `validation-error` existente pode testar rollback de adição aos favoritos. Controles de preço/estoque emitem o mesmo `nft.updated`, agora refletido na UI. Quantidades compartilham os limites 1..999 definidos em `src/lib/quantity.ts`.

## Autenticação visual e sessão

GET de sessão é a referência global de identidade. Token continua em sessionStorage; login e cadastro retornam SessionResponse e autenticam, logout envia DELETE. O cliente valida a resposta, separa 401 de 403/5xx/rede e não persiste senhas ou outra cópia do perfil. Queries/mutations privadas são segregadas por sessão e canceladas/limpas na troca; os mesmos endpoints e contratos de negócio permanecem válidos.

Os cenários network-error, server-error e transient-error passam também a cobrir /session e /accounts. malformed-session devolve uma resposta incompatível controlada para testar a rejeição pelo cliente, antes de criar sessão/conta. POST /session/expire continua disponível para expiração reproduzível; GET /session detecta a revogação após refresh. Em falha de logout a API não confirma a revogação, o cliente encerra localmente e informa essa limitação. Ver [arquitetura](../ARCHITECTURE.md) para a política de sessão.

## Carrinho visual

Os contratos anteriores foram preservados. A interface utiliza GET /cart, POST /cart/items, PATCH/DELETE /cart/items/:id, PUT/DELETE /cart/coupon e POST /quotes. IDs de linha são codificados na URL; a edição/quantidade escolhida vem do detalhe, não de um valor padrão do serviço. Imagem e coleção são consultadas em /nfts/:id, pois CartLine não duplica esses metadados.

server-error, network-error e transient-error cobrem agora também /cart (incluindo subrecursos e DELETE) e /quotes; out-of-order alterna suas respostas em 600/20 ms. slow permanece 800 ms; validation-error já rejeita POST/PUT/PATCH. Nenhum contrato de cupom/taxa/expiração foi criado na UI. WELCOME10/EXPIRED, limite de quantidade e rede de referência são as regras preexistentes do domínio.

Cancelamento HTTP após commit não desfaz a transação. A interface não repete automaticamente adição: reconcilia GET e orienta revisar os itens em caso de resposta perdida. Quotes são leituras validadas por POST e podem ser refeitas; não criam pedido/reserva. Cotação anterior não é reutilizada após mudança de identidade. nft.updated cancela as consultas de quote e invalida o carrinho pelo mesmo cliente Socket.IO já configurado.

## Checkout visual

Os contratos de pedidos, carteiras e quotes acima foram reutilizados sem novos campos obrigatórios. O checkout envia `{walletId,network}` em POST /quotes, revalida sessão, carteira, carrinho e cotação antes do envio, e usa CreateOrderRequest em POST /orders com Idempotency-Key. GET /orders, GET /orders/:id e GET /orders/:id/receipt sustentam consulta e resultado histórico. POST/DELETE /wallets/:id/connection simulam conexão e desconexão, sem extensão ou assinatura.

A mesma chave e o mesmo corpo são preservados em sessionStorage por user.id antes do primeiro envio. Falhas ambíguas não geram nova chave; a recuperação explícita repete o POST idempotente existente. Pedidos e recibos continuam autoritativos no banco MSW. Refresh ou login não criam outra compra automaticamente. A UI só mostra o recibo quando o estado retornado é confirmed; pending é consultado por evento/GET e declined preserva o carrinho.

server-error, network-error, transient-error e out-of-order passam a cobrir também /wallets e /orders, incluindo conexão e recibo. A política de latência, commit, timeout e replay do domínio não mudou. Não há handlers de negócio duplicados ou backend separado. Ver [arquitetura](../ARCHITECTURE.md) para recuperação e limites.

## Tempo real, replay e recuperação

Os envelopes nft.updated/order.updated acima não mudaram. Preservados id, resourceId, version, occurredAt, data e userId privado. A UI rejeita ID repetido e versão igual/inferior ao conhecido, cancela leituras afetadas e protege snapshots REST por versão. Pedidos terminais não regridem; recibos continuam imutáveis. Depois de server:ready, reconexão consulta recursos ativos e revalida quotes com os mesmos endpoints. server:ready não é autenticação/resultado de pagamento/replay automático. Não há POST /orders durante reconexão/refresh/evento.

Novos controles somente no namespace de simulação: GET /__mock/realtime retorna held, connections, subscriptions e events autorizados; POST aceita action disconnect (hold boolean padrão true), resume ou replay (eventId, copies 1..5, delayMs 0..5000). Replay reenvia o envelope original pelo binding; não grava no domínio nem altera ID/versão. Evento ausente retorna 404 EVENT_NOT_FOUND; privado não autorizado, 403 FORBIDDEN. Os controles são voláteis por runtime e o histórico tem limite 256; reset limpa histórico/bloqueio, e refresh reinicia o runtime sem perder o banco/pedidos. Não são endpoints novos de negócio nem API de produção.

Abas compatíveis da mesma origem encaminham os envelopes confirmados entre seus mocks via BroadcastChannel, mantendo a autorização antes da entrega Socket.IO. Sem esse recurso, dados ainda se reconciliam por REST/foco/reconexão. Autorização de pedidos é revalidada em cada entrega/replay. Não há rooms, binários, acks ou servidor real acrescentados. Ver [cenários](API_SIMULADA.md) para reprodução e limites.

## Integração da conta

Os contratos anteriores são mantidos. GET/PATCH /profile, PATCH /profile/avatar, POST /profile/password e GET/POST/PATCH /wallets passam a atender às telas completas. Perfil envia somente os campos editados; senha responde {status:'ok'}, mantém a sessão atual e revoga outras. Avatar null remove, PNG/JPEG/WebP base64 até 1.048.576 bytes; a UI também verifica se a imagem pode ser decodificada. Sem upload remoto, dimensões mínimas ou formatos adicionais inventados.

WalletInput exige displayName/alias/profileName/referralCode (1–80), email válido, papel primary/secondary, tipo metamask/walletconnect/coinbase, rede ethereum/polygon/solana e address compatível. ens (até 255) e secondaryAddress (até 80) aceitam null. EVM exige 0x + 40 hex; Solana, 32–44 caracteres base58. Há um slot por papel e unicidade de endereço/rede por usuário; endereços EVM ignoram caixa. PATCH valida a carteira inteira, incrementa versão e encerra conexões que a referenciam. Não há DELETE nem swap de papéis; não se cria uma segunda carteira com o mesmo endereço/rede.

O mesmo respond aplica server-error/network-error/transient-error/out-of-order também a /profile e sub-recursos. A restauração usa POST /__mock/reset, sem outra fonte de dados. Tempo real continua MSW + binding Socket.IO: contratos nft.updated/order.updated preservados; mudanças de conta são reconciliadas por REST após mutation/foco/reconexão, sem inventar eventos.

