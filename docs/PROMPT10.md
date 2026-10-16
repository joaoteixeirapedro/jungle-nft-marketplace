# Prompt 10 — Conta do colecionador

Implementação baseada no [README oficial](https://github.com/junglegaming/frontend-challenge), em especial §§3–9. Os tamanhos/formatos específicos de campos abaixo pertencem ao contrato da solução, já existente desde o Prompt 3; não são atribuídos ao README. Nenhuma dependência foi adicionada.

## A. Funcionalidades

- `/profile`: dados reais da API; edição de nome de exibição, usuário, e-mail, ENS opcional e apelido da carteira. Validação local/API, conflitos, preservação de rascunho, bloqueio de envios repetidos e feedback após confirmação. Alterações confirmadas atualizam a sessão/header e sobrevivem a refresh.
- Avatar: seleção local, validação de MIME/1 MiB e decodificação, prévia, confirmar/cancelar e remover. A imagem anterior permanece até sucesso. FileReader é cancelado no unmount, sem object URLs ou upload externo. A imagem confirmada aparece no header desktop e na navegação mobile.
- Senha: atual/nova/confirmação, política existente de 8–128 com letra/número, mostrar/ocultar, erros da API e campos limpos no sucesso. Mutation sem variables sensíveis, sem retry e gcTime 0; ref é consumido no início da chamada, request é abortado no unmount. Não persiste senha. A política do domínio mantém esta sessão e revoga as outras.
- `/wallets`: leitura, cadastro do slot vazio e edição de principal/secundária; rede Ethereum/Polygon/Solana, tipo MetaMask/WalletConnect/Coinbase, endereço e metadados do contrato. Unicidade e autorização vêm da API. Não há exclusão ou swap atômico no contrato e essas ações não são simuladas visualmente.
- Sidebar/navegação compartilhada em perfil, carteiras, favoritos e pedidos. Favoritos reutilizam mutation otimista/rollback anteriores. Histórico e recibo reutilizam as páginas e API do Prompt 8, sem duplicar implementações.
- Checkout: compartilha a mesma query de carteiras. Edição cancela cotação antiga, atualiza carteira/sessão e exige reconexão. Seleção explícita válida é preservada; rede incompatível bloqueia compra. O fluxo anterior revalida versão, conexão, disponibilidade e valores antes da confirmação. Alteração de perfil/carteira não recalcula recibos históricos.

## B. Integração

Base `/api`; endpoints usados nesta etapa e na navegação integrada:

| Operação | Endpoints |
| --- | --- |
| Sessão | `POST/GET/DELETE /session`, `POST /session/expire` para demonstração |
| Perfil | `GET/PATCH /profile` |
| Avatar | `PATCH /profile/avatar` com dataUrl/null |
| Senha | `POST /profile/password` |
| Carteiras | `GET/POST /wallets`, `PATCH /wallets/:id` |
| Checkout existente | `POST/DELETE /wallets/:id/connection`, `GET /cart`, `POST /quotes`, `POST /orders` |
| Favoritos existentes | `GET /favorites`, `PUT/DELETE /favorites/:id` |
| Histórico/recibo existentes | `GET /orders`, `GET /orders/:id`, `GET /orders/:id/receipt` |

Queries: `['profile',token]`, `['wallets',token]`, `['session',token]`; favoritos/pedidos/recibos mantêm as chaves anteriores com token/ID. Perfil/carteiras têm staleTime 0, retry false e recuperação explícita. Perfil, carteiras e user da sessão comparam versões para impedir regressão. Perfil e carteiras enviam apenas os campos editados no PATCH. Refetch de carteira combina dados recentes da API com o rascunho local, sem apagar campos em edição. Mutations cancelam leituras anteriores e aplicam a resposta confirmada; carteira invalida também sessão/quote. Callbacks verificam o token capturado. AuthProvider/Axios continuam cancelando requests, limpando queries/mutations privadas e encerrando listeners da conta anterior.

O único banco persiste no MSW/localStorage; token por aba em sessionStorage. Não foram criados estado de domínio paralelo, endpoints, backend ou servidor Socket.IO. Reconnect reconcilia também perfil/carteiras ativos com REST. Cenários existentes de lentidão, fora de ordem, validação, 503/rede e recuperação transitória foram estendidos a perfil/sub-recursos. Reset continua `POST /__mock/reset`.

## C. Referências visuais

- Desktop / Perfil do Colecionador `9:1238` e Desktop / Carteiras `9:1670`, 1440 × 1080: [Figma original](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=9-1238).
- Sidebar 310 px, gap 28 px, duas colunas, inputs 40 px, fonte Roboto Mono e tokens existentes. Carteiras seguem a sequência dos campos do frame.
- Mobile sem frame específico: navegação adaptada e campos empilhados, inputs 48 px/alvos de toque, sem ocultar campos obrigatórios. Verificado em 390, 768 e 1440 px.
- O MCP do original recusou acesso de edição; a cópia retornou limite Starter em get_design_context/get_screenshot. Referências foram inspecionadas no editor, sem alterar metadados de exportação. Não se declara extração MCP integral nem igualdade pixel a pixel.
- Diferenças: operações de perfil/senha têm botões separados, com feedback e informação da conta; ENS opcional não recebe dropdown fictício; ações editoriais fora do escopo foram omitidas; Igual à principal não é oferecido pois contraria a unicidade de endereço/rede. Fixtures autorizadas determinam se a secundária está preenchida. No refinamento solicitado em seguida, o avatar vazio, os ícones do menu, os estados ativo/inativo de perfil/carteiras, o olho da senha e a seta dos seletores foram substituídos pelos exports originais do editor. Origem e dimensões em docs/figma/account-assets.json.
- Referências do editor: `docs/figma/profile-reference.png`, `wallets-reference.png` (viewport ampliado, parte do frame cortada). Capturas reais: `docs/screenshots/prompt10/{profile,wallets,orders}-{390,768,1440}.png`. `verification.json` registra overflow, IDs, erros JavaScript e carregamento/geometria dos assets visíveis.

## D. Verificação

- TypeScript (`tsc -b`): aprovado após o ajuste final de carteiras.
- ESLint com `--max-warnings 0`: aprovado.
- Vite build de produção: aprovado, 570 módulos transformados.
- Domínio (`node --test tests/data/*.test.ts`): **11/11**, incluindo propriedade, conexão e imutabilidade do recibo.
- Suíte completa de produção: **99/100** (9,5 min). Os **86 testes anteriores passaram**. A única falha foi no novo teste desktop de favoritos, que recarregava antes do DELETE terminar; o teste foi corrigido para aguardar a resposta e o estado confirmado. Não foi alterada a implementação de favoritos.
- Após o ajuste final de PATCH/rascunho de carteira e a correção da espera no teste de favoritos, os **14/14 casos da conta passaram** no build final (1,6 min), em desktop e mobile. **Nenhuma falha pendente nos testes executados após as correções.** Os 86 testes anteriores passaram na execução de regressão; não se declara 100/100 em uma única execução completa nem repetição integral após o último ajuste localizado de carteiras.
- Verificação de perfil/carteiras/pedidos nas três larguras: nove telas, sem overflow, imagens quebradas, IDs duplicados ou erros JavaScript. Capturas e geometria em `docs/screenshots/prompt10/verification.json`.

Relatório completo preservado: `playwright-report/production/index.html`, incluindo trace da falha original de sincronização do teste. Relatório da conta no build final: `playwright-report/production-prompt10-final/index.html`.

Novos cenários agrupam os 12 itens prioritários em 7 testes, executados em desktop/mobile. Cobrem perfil/validação/persistência, avatar/prévia/erro/header, senha e política de sessões, carteiras/conflito/checkout/recibo imutável, favoritos/histórico, isolamento/requisição atrasada e expiração. A edição de carteira também recebe uma atualização REST após reconexão enquanto existe rascunho, para verificar preservação dos campos digitados e do dado mais recente da API.

## E. Conformidade com o README

| Requisito do README | Status | Evidência |
| --- | --- | --- |
| §3: edição dos dados, avatar e senha | Implementado | `/profile`; GET/PATCH perfil/avatar e POST senha; testes conta/perfil/avatar/senha |
| §3: cadastro e edição de carteiras principal e secundária | Implementado | `/wallets`, slots e validação pelo domínio, teste de cadastro secundário/edição |
| §3: perfil/carteiras funcionais em mobile mesmo sem frame | Implementado; fidelidade com diferenças | Capturas 390/768/1440; adaptação descrita acima |
| §3: checkout utiliza carteiras cadastradas, rede/conexão e revalidação | Implementado | Query compartilhada, invalidação e teste carteira/checkout |
| §3: favoritos persistentes por usuário | Reutilizado | FavoritesPage e FavoriteButton anteriores, teste de navegação e suites anteriores |
| §3/§5: consulta de pedido/recibo e snapshot histórico | Reutilizado e integrado | OrdersPage/OrderPage; teste de recibo antes/depois de editar perfil/carteira |
| §3: áreas privadas, recuperação/expiração e limpeza ao trocar usuário | Reutilizado e validado | Guard/AuthProvider/Axios; teste de isolamento, request atrasado e expiração |
| §3: formulários validados, erros da API, refresh e senhas sem claro | Implementado | Testes de conflitos/503, persistência e política de senha |
| §4: contratos, estados, invalidação, cancelamento e isolamento | Implementado | Serviços account/checkout/auth, chaves por token e comparações de versão |
| §6: MSW com estado consistente e cenários reproduzíveis | Preservado | Banco/handlers anteriores; extensão pontual de respond para perfil |
| §6/§7: Socket.IO real no cliente, simulado no MSW, reconciliação | Preservado | Controller único e binding anteriores, perfil/carteiras ativos incluídos na reconciliação |
| §8: semântica, labels, feedback, teclado e ausência de overflow | Verificado no escopo | Erros associados, foco em validação e capturas/logs; sem auditoria ampla do Prompt 11 |
| §8: assets e identidade do Figma | Conferido no escopo da conta, com adaptações funcionais documentadas | Dez exports originais obtidos pelo navegador; dimensões e espaçamentos medidos nas propriedades; docs/PROMPT10_VISUAL.md |
| §9: E2E de perfil, avatar, senha e carteiras com validação | Implementado | `tests/e2e/account.spec.ts`, resultado abaixo |

## F. Pendências e limites

- As pendências de ícones, placeholder e espaçamentos da conta foram resolvidas no refinamento pelo navegador. O limite do MCP continua existindo e não foi usado como impedimento para esses ajustes. Não se alega igualdade pixel a pixel da aplicação inteira; permanecem apenas as adaptações funcionais e responsivas explicitadas no relatório visual.
- Exclusão de carteira, swap atômico de papéis e Igual à principal não são pendências de comportamento: não existem no contrato e duplicar endereço é proibido. Slots existentes são editáveis e slots livres podem ser cadastrados.
- Auditoria ampla de acessibilidade/performance/regressão visual pertence ao Prompt 11; documentação final/deploy ao Prompt 12 e não foram antecipados.
- Commit opcional não criado: Git sem user.name/user.email e todo o projeto ainda não rastreado. Nenhuma identidade ou autoria foi inventada.

## G. Arquivos principais

- `src/features/account/{layout,form,profile,wallets}.tsx`, `validation.ts`, `account.css`: layout, componentes e formulários.
- `src/services/api/account.ts`: query/serviços e aceitação/invalidação de respostas.
- `src/routes/account.tsx`, `src/routes/orders.tsx`, `src/app/router/index.ts`: páginas privadas e navegação.
- `src/components/layout/site-header.tsx`: avatar confirmado em desktop/mobile.
- `src/services/api/{auth,checkout}.ts`, `src/services/socket/synchronize.ts`: proteção de versão e reconciliação dos recursos ativos.
- `src/routes/checkout.tsx`: nome acessível do seletor de rede (sem alteração visual).
- `src/mocks/http.ts`: cenários anteriores também abrangem perfil.
- `tests/e2e/account.spec.ts`, `tests/data/account.test.ts`: verificações direcionadas.
- `README.md`, `ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/figma/README.md`, este relatório e capturas/referências da etapa.




Refinamento visual posterior solicitado pelo usuário: [ícones originais, medidas e validação](PROMPT10_VISUAL.md).

