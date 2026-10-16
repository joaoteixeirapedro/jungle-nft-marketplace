# Arquitetura

## Organização

| Diretório | Responsabilidade |
| --- | --- |
| `src/app` | Bootstrap, providers, QueryClient e árvore de rotas |
| `src/routes` | Páginas públicas e privadas |
| `src/components` | Layout e componentes reutilizáveis |
| `src/features` | Catálogo, NFT, favoritos, autenticação, carrinho, compra e conta |
| `src/services` | Transporte Axios, queries tipadas e sincronização Socket.IO |
| `src/mocks` | Handlers de rede, fixtures, domínio e persistência simulada |
| `src/hooks`, `src/lib`, `src/types` | Hooks compartilhados, funções de apoio e contratos |
| `public` | Worker oficial do MSW, imagens, ícones e fontes distribuídos |
| `assets/originals` | Fontes e imagens usadas pelos scripts de otimização |
| `tests` | Testes de domínio, E2E e baselines visuais |
| `docs` | Enunciado, contratos, cenários e evidências de entrega |

Vite usa React e o plugin do Tailwind CSS 4. Os aliases `@/*` estão configurados no Vite e no TypeScript. Aplicação, configurações e testes têm verificação estrita de tipos. `components.json`, variáveis CSS, CVA, `cn` e Radix Slot sustentam os componentes shadcn/ui adaptados ao tema.

## Bootstrap e navegação

O bootstrap aguarda `worker.start()` antes de importar a aplicação. Socket.IO/Engine.IO captura o construtor WebSocket na importação: apenas configurar `autoConnect: false` não garante a interceptação pelo MSW. Os preloads do build antecipam download e compilação, preservando essa ordem de execução.

TanStack Router controla rotas, validação de buscas e proteção em `beforeLoad`. Busca, filtros, ordenação e página pertencem à URL; alterações de filtro reiniciam a paginação. O detalhe preserva uma referência validada ao catálogo. Destinos de autenticação são restritos às rotas locais permitidas.

Login e cadastro abrem sobre a página pública de origem. O route masking exibe `/login` ou `/register` na URL, enquanto o estado tipado `authDialog` mantém a rota real montada, incluindo filtros, edição, quantidade e rolagem. O fundo fica `inert`; fechar restaura o foco ao acionador. Mobile mantém a composição de página inteira do Figma e restaura o contexto ao fechar. Acesso direto à autenticação, sem origem, usa a Home de fundo. Páginas privadas não ficam como fundo após expiração.

Rotas secundárias são carregadas sob demanda. A hospedagem deve servir o fallback da SPA para rotas profundas; `vercel.json` prepara essa configuração. O deploy público continua pendente.

## REST, cache e sessão

Um cliente Axios centraliza base, timeout de 10 segundos, identidade do visitante, token Bearer, cancelamento e normalização de erros em `ApiError`. Os contratos estão em [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md). Componentes não importam fixtures nem mantêm outra implementação das regras de negócio.

TanStack Query gerencia todo o estado remoto:

- Consultas públicas usam parâmetros completos nas chaves; o padrão é `staleTime` de 30 segundos, até duas novas tentativas para rede/5xx e nenhuma para 4xx. Há revalidação ao voltar à janela.
- Sessão, carrinho, cotação, perfil, carteiras e pedidos possuem políticas conservadoras próprias, com revalidação e recuperação explícita. Carrinho/cotações e leituras de checkout/pedidos não têm retry automático. Recibos imutáveis usam `staleTime: Infinity`.
- Chaves privadas incluem a sessão; troca de usuário e logout cancelam requisições, removem caches privados e encerram subscriptions anteriores. Callbacks conferem a identidade antes de gravar respostas.
- `AbortSignal` chega ao Axios; chaves completas e comparação de versões impedem respostas antigas de substituir dados recentes. Mudanças de busca mostram skeletons, sem resultados de outra consulta como placeholder.
- Favoritos aplicam atualização otimista com snapshot e rollback. Mutations não têm retry automático. Operações do carrinho são serializadas e reconciliadas por GET após falhas ambíguas.

A sessão dura 30 minutos e seu token fica no `sessionStorage`, assim como a identidade do visitante. O perfil vem da API. Senhas não são persistidas em claro: o domínio usa PBKDF2/SHA-256 com salt e 100.000 iterações. Inputs de senha usam referências transitórias, não variáveis persistentes de mutations.

Respostas 401 iniciam recuperação da sessão; 403 informa falta de permissão sem efetuar logout. Erros transitórios preservam a sessão. Logout tenta revogar o token na API; se a confirmação falhar, encerra a sessão local e informa a limitação. Essa autenticação pertence à simulação no navegador e não oferece segurança de backend.

## Estado simulado e compra

MSW intercepta REST e eventos no navegador, inclusive no build de demonstração. O worker oficial fica em `public/mockServiceWorker.js`. Requisições desconhecidas para `/api/*` geram erro; arquivos estáticos são liberados. Não há servidor Express, Socket.IO real ou proxy de backend.

O banco canônico em `localStorage` (`jungle-marketplace.mock.v1`) contém catálogo, contas, sessões, favoritos, carrinhos, carteiras, cotações, pedidos e registros de idempotência. Handlers compartilham o mesmo domínio e publicam eventos somente após persistir a transação. Web Locks serializa alterações entre abas; sem essa API, o fallback é uma fila por contexto e não garante exclusão entre abas. Testes de domínio usam memória.

As fixtures incluem 30 NFTs, 90 edições, três coleções/criadores, duas contas e recibo histórico. Reset restaura o banco, os contadores, o relógio e os agendamentos. [Cenários e controles](docs/API_SIMULADA.md) são determinísticos. Migrações de metadados de imagem preservam preços, estoque, contas e pedidos existentes.

Valores ETH trafegam como strings decimais de até 18 casas. Os cálculos usam `BigInt` em wei; o desconto arredonda uma vez para baixo. Quantidades inteiras vão de 1 a 999, também limitadas pelo estoque. Catálogo, detalhe e carrinho derivam disponibilidade das mesmas edições: `supply - sold - reserved`.

O carrinho não reserva estoque. A autenticação incorpora uma vez o carrinho do visitante à conta, informando ajustes de quantidade. Cotações imutáveis duram cinco minutos e incluem itens, versões, cupom, taxas e contexto de carteira/rede. O checkout revalida esses recursos e exige novo aceite se os valores mudarem.

Antes do primeiro envio, `sessionStorage` guarda por usuário a chave de idempotência e o corpo exatos da tentativa. A criação reserva estoque e registra pedido/tentativa na mesma transação. Repetir chave e conteúdo recupera o pedido; reutilizar a chave com outro corpo retorna conflito. Timeout, rede ou cancelamento após commit não autorizam outra compra: a recuperação explícita reenvia a mesma tentativa.

Pedidos são `pending`, `confirmed` ou `declined`; estados terminais não regridem. O runtime restaura agendamentos após refresh e GET reconcilia decisões vencidas. Pedidos pendentes também são consultados a cada dois segundos. Confirmação converte reserva em venda e remove apenas as quantidades compradas do carrinho; recusa libera a reserva e preserva os itens. Recibos usam o snapshot do pedido, sem recalcular pelo catálogo atual. Reconexão e refresh não criam compras automaticamente.

Perfil e carteiras enviam somente campos alterados; revalidação não apaga rascunhos. Avatar permite PNG/JPEG/WebP decodificável até 1 MiB. Alteração de senha preserva a sessão atual e revoga as demais. Cada usuário tem um slot de carteira principal e um secundário; editar a carteira encerra sua conexão anterior e exige reconexão no checkout.

## Socket.IO e reconciliação

MSW 2.15.0, `@mswjs/socket.io-binding` 0.2.0 e Socket.IO Client 4.8.4 estão fixados no lockfile. O binding instalado usa `toSocketIo(connection)` e fornece os handshakes Engine.IO/Socket.IO. `ws.link` intercepta a origem reservada `.test`; nessa versão, o MSW normaliza `/socket.io/` para o namespace `/`, por isso o link aponta à raiz da origem.

O transporte é exclusivamente `websocket`, sem polling ou upgrade. Depois de conectar, o cliente envia `client:ready` com a sessão e recebe `server:ready`. O handler fornece pings Engine.IO a cada 20 segundos porque o binding anuncia heartbeat sem agendá-lo. O intervalo é removido ao fechar a conexão.

AppShell mantém um único ciclo de conexão, com listeners específicos e cleanup por sessão. `nft.updated` e `order.updated` carregam ID, recurso, versão, data e snapshot; pedidos também carregam `userId`. O mock revalida a autorização de cada entrega privada. O SID fixo do binding não representa identidade de usuário ou evento.

O cliente rejeita IDs repetidos e versões iguais/inferiores às conhecidas, incluindo snapshots REST. O registro de versões é limitado a 1.024 entradas e reiniciado por identidade. Eventos aceitos cancelam leituras afetadas e revalidam dependências; a confirmação de pedido é consultada por REST autorizado.

Reconexão tem até três tentativas, com atraso fixo de um segundo e sem jitter. Após `server:ready`, consultas ativas são reconciliadas por REST, seguidas de cotações. A compra fica bloqueada enquanto os dados financeiros não estiverem reconciliados. Há retry manual e feedback que não desloca o foco.

Controles de desconexão e replay exercitam o cliente Socket.IO real. Replay usa o envelope original, não altera o domínio e tem autorização; o histórico do mock é limitado a 256 eventos. BroadcastChannel encaminha eventos entre abas da mesma origem, ainda passando pelo binding e pelo filtro da sessão. Não conecta computadores ou perfis distintos. Sem BroadcastChannel, permanece a recuperação por REST/foco/reconexão. Rooms, acknowledgements e payloads binários não foram usados ou validados.

## Figma, acessibilidade e assets

Referências e inventários originais ficam em [docs/figma](docs/figma/README.md). Roboto Mono, paleta, artes e ícones são locais. Artes WebP têm variantes de 320, 640 e 1254 pixels; a versão completa foi comparada em RGBA com o PNG original. Fontes WOFF2 preservam métricas e contornos; os TTF originais e a licença OFL permanecem disponíveis. Python é necessário apenas para a manutenção opcional das fontes, não para executar ou compilar a aplicação.

Adaptações funcionais do layout:

- O contrato oferece uma imagem por NFT; a galeria tem miniatura e ampliação, sem duplicar artificialmente a imagem em quatro posições. Ratings, royalties e contratos blockchain ausentes na API não são fabricados.
- Dados reais das fixtures, validações, estoque, cotação, feedback e revisão ampliam a altura das telas. No mobile, detalhes da compra podem ser expandidos. Perfil, carteiras e recibo foram adaptados onde não há frame mobile específico.
- Perfil e senha têm salvamentos separados. ENS é texto opcional; não há dropdown decorativo. A opção de copiar a carteira principal para a secundária não foi implementada porque viola a unicidade de endereço/rede. O contrato não oferece exclusão ou troca atômica de papéis de carteira.
- Ações editoriais, sociais, recuperação de senha e OAuth fora do escopo informam indisponibilidade; não aparentam sucesso. Referências de transação são explicitamente simuladas.
- Diálogos e drawer usam controle nativo de foco, Escape e retorno ao acionador. Alvos de toque foram ampliados; campos têm labels/erros associados. Skeletons preservam dimensões e respeitam movimento reduzido.

O acesso ao contexto automatizado do Figma teve limitações de permissão/quota; parte da revisão ocorreu pelo editor no navegador. Não se declara correspondência integral de pixels com todos os frames nem certificação WCAG. Baselines comparam a aplicação; axe e teclado verificam aspectos complementares.

## Verificação e limites

As suítes existentes cobrem domínio, REST/MSW, transporte Socket.IO, compra, conta, isolamento, erros e recuperação em Chromium desktop/mobile. Oito baselines de início, detalhe, carrinho e pagamento são versionadas junto dos testes. Relatórios finais, ambiente Lighthouse e pendências estão em [docs/DELIVERY.md](docs/DELIVERY.md).

O deploy público exigido pelo enunciado ainda está pendente. As últimas medições Lighthouse ficaram abaixo da meta de performance na Home e no detalhe mobile; métricas e causas permanecem documentadas. Os relatórios Lighthouse identificam o build medido e não representam uma nova medição de alterações posteriores.
