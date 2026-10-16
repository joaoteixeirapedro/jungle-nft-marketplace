# Análise do Figma e planejamento do NFT Marketplace

Etapa 1/12. Consulta: **15/10/2026**, fuso America/Sao_Paulo. Documento de análise e propostas; nenhuma aplicação foi criada.

## Fontes e inventário inicial

- [README oficial da Jungle Gaming](https://github.com/junglegaming/frontend-challenge/blob/main/README.md): acessível e lido integralmente pela web. Fonte de verdade para comportamento e avaliação. Consulta à branch `main`, sem fixar commit; reconferir alterações antes de implementar.
- [Figma — Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1): acessado como visitante pelo navegador público.
- Prompt 1/12 anexado: escopo desta etapa e prazo de dois dias.
- Workspace: `C:\Users\joao\Documents\ChatGPT\desafio jungle gaming`.

Antes da análise, o diretório continha somente `.git`. Branch `master`, sem commits e sem remote configurado. Não há README local, aplicação, `package.json`, lockfile, dependências do projeto, assets ou testes. `rg --files --hidden -g '!.git/**'` não encontrou arquivos. Não foram encontrados arquivos `AGENTS.md` nos diretórios ancestrais verificados até a raiz.

O repositório público apresenta somente `README.md` na raiz: fornece o enunciado, não um starter ou pacote de imagens. Não houve clone, instalação, configuração de remote, mudança de branch ou commit. A única criação desta etapa é este arquivo e a pasta `docs`.

**Legenda:** **R** = requisito do README, com seção indicada; **F** = observado no Figma; **P** = proposta ainda não executada; **?** = não verificado. Nomes de arquivos, rotas e endpoints sugeridos não são exigências do enunciado.

## 1. Resultado do acesso ao Figma

A leitura inicial pela ferramenta web falhou com indicação de URL inacessível. A tentativa seguinte, pelo navegador público, **funcionou sem autenticação**. Foi possível abrir a navegação do arquivo, ler os nomes dos frames e observar os 15 layouts no canvas, usando zoom e deslocamento.

Existe uma página visível chamada **“Marketplace de NFTs GreenMint”**. A marca escrita nas telas é **KURIO/Kurio**. Essa diferença deve ser preservada como observação e confirmada antes de definir a identidade do projeto.

A interface de visitante informa que comentar, editar e inspecionar exigem cadastro. Não houve login, cadastro, tentativa de contornar autenticação ou uso de MCP do Figma. A inspeção foi visual, sem extração programática de propriedades. A etiqueta do frame Desktop / Carteiras confirmou **1440 × 1080 px**; não extrapolar sua altura para as outras telas. Dimensões originais mobile não foram confirmadas.

**Limitações:** não foram extraídos tokens, família de fonte, hexadecimais, medidas internas, auto-layout, conexões de protótipo ou arquivos exportáveis. Avatares de colaboradores e barras do Figma cobriram pequenas áreas; não são elementos do produto. A composição foi observada, sem validar cada detalhe em escala 1:1.

## 2. Inventário de telas identificadas

**15 frames confirmados, correspondentes a 9 telas/fluxos: 9 desktop e 6 mobile.** Nomes abaixo provenientes da árvore do arquivo; descrição proveniente do canvas.

| Tela | Frames confirmados | Composição e finalidade observadas |
| --- | --- | --- |
| Início | `Desktop / Início`; `Mobile / Início` | Desktop: header, hero com NFT, Explorar, filtros laterais, abas, ordenação, grade de três colunas, paginação, destaques e rodapé. Mobile: busca, botão de filtros, hero compacto, duas colunas e navegação inferior. Descoberta e entrada na compra. |
| Detalhes | `Desktop / Detalhes do NFT`; `Mobile / Detalhes do NFT` | Desktop: breadcrumb, miniaturas verticais, imagem grande, título/preço, avaliações, descrição, edição, quantidade, compra/favorito, detalhes e relacionados. Mobile: voltar/favorito, imagem ampla, dados empilhados e ações de compra inferiores. |
| Carrinho | `Desktop / Carrinho de NFTs`; `Mobile / Carrinho de NFTs` | Desktop: linhas com imagem, preço, quantidade/edição, total e remoção; cupom/resumo à direita; relacionados. Mobile: cards de itens, quantidades, cupom, resumo e CTA largo. |
| Pagamento | `Desktop / Pagamento`; `Mobile / Pagamento` | Desktop: dados do colecionador à esquerda, itens/valores à direita e seleção de carteira/rede. Mobile: carteiras Reserva/Principal, trocar carteira, WalletConnect/MetaMask/Coinbase, total e confirmar. |
| Confirmação | `Desktop / Confirmação de Pedido` | Painel central semelhante a recibo/modal, agradecimento, fechar, ID/data/carteira, itens, taxa, total e “Ver no Etherscan”. |
| Login | `Desktop / Login`; `Mobile / Login` | Desktop: modal sobre início, abas Entrar/Criar conta, e-mail/senha, mostrar senha, recuperação e botões sociais. Mobile: página própria, marca, formulário e acesso ao cadastro. |
| Cadastro | `Desktop / Cadastro`; `Mobile / Cadastro` | Modal desktop com usuário, e-mail, senha e confirmação; no mobile, página própria com formulário e retorno ao login. |
| Perfil | `Desktop / Perfil do Colecionador` | Menu lateral, nome de exibição/usuário, e-mail, ENS, apelido da carteira, avatar alterar/remover, senha atual/nova/confirmação e salvar. |
| Carteiras | `Desktop / Carteiras` | Menu lateral, carteira principal com dados, rede/tipo/endereço; carteira secundária vazia, adicionar e opção de igualar à principal. |

Não há frames mobile de perfil, carteiras ou confirmação na árvore observada. Esses fluxos continuam obrigatórios no mobile (**R §3**). Nenhum frame tablet foi identificado.

### Navegação, modais e estados

**F:** header com Início, Mercado, Criadores, Aprenda, busca, carrinho e Entrar; navegação inferior mobile; abas de autenticação; voltar; menu de conta com perfil, carteiras e sair. Também aparecem atividade, ofertas, downloads, suporte, compartilhamento, newsletter, recuperação de senha e botões sociais.

**P:** início → detalhe → carrinho → pagamento → estado do pedido → confirmação. Login preserva destino anterior e carrinho. Perfil/carteiras partem da conta. Login/cadastro podem ter rotas recuperáveis, apresentadas como modal desktop e página mobile. Fechamento de modal deve restaurar foco e contexto.

Não foram testadas conexões entre nós do protótipo. O fluxo proposto combina enunciado e ações visíveis; não representa navegação de protótipo verificada.

**R §3:** editoriais, suporte, atividade, ofertas e downloads ficam fora da entrega. **P:** ações auxiliares indisponíveis devem informar sua limitação. Google/Facebook e recuperação de senha são visíveis, mas não comprovam exigência de OAuth ou envio de e-mail real; não aparentar sucesso funcional nesses controles.

**F — estados especiais:** recibo de sucesso, carteira secundária vazia, aba ativa, seleção de edição/carteira, campo destacado, senha mascarada, badge “RARO”, preço anterior riscado e ações expostas em card. Não foi possível comprovar se as ações de card representam hover, foco ou composição estática.

Não foram identificados frames exclusivos de loading, erro, resultados vazios, expiração, pedido pendente/recusado ou conflitos de preço/estoque. São estados obrigatórios pelo README e deverão seguir o padrão visual existente.

## 3. Identidade visual e design system inicial

| Aspecto | Evidência visual | Pendente |
| --- | --- | --- |
| Cores | Fundo marrom muito escuro; superfícies marrons mais claras; ações/preços em âmbar/laranja; textos claros e secundários terrosos. | Hex, opacidades e estados. Cinza do canvas e azul do banner do Figma não pertencem ao produto. |
| Tipografia | Aparência monoespaçada em títulos, labels, preços e texto; hero em caixa alta e hierarquia clara de escalas. | Família, arquivos, licença, tamanhos, pesos, entrelinha e espaçamento entre letras. Não atribuir uma fonte por semelhança. |
| Grid | Filtros + três colunas no início desktop; mídia/compra no detalhe; resumo lateral em carrinho/pagamento; menu lateral na conta. Mobile com empilhamento e catálogo em duas colunas. | Containers, gutters, margens e comportamento tablet. |
| Formas | Inputs com bordas discretas, separadores, imagens/cards arredondados, CTAs mobile mais arredondados. | Raios e espessuras. Contorno externo do frame mobile não é automaticamente uma moldura de aparelho a implementar. |
| Efeitos | Destaques âmbar para seleção e contraste de superfícies; composição tonal no hero mobile. | Sombras, gradientes e overlays exatos. |
| Imagens | Macacos ilustrados com diferentes roupas/acessórios, fundos claros, retratos no hero/detalhe e miniaturas nas listas. | Arquivos, resolução, recortes e variantes de galeria. |

**P — tokens a preencher, sem inventar valores:** `background`, `surface`, `surface-raised`, `text`, `text-muted`, `primary`, `primary-foreground`, `border`, `focus`, `danger`, `success`; escalas de texto, espaço e raio. Centralizar tema Tailwind e variáveis utilizadas pelos componentes shadcn/ui.

**R §8:** avaliar larguras 390, 768 e 1440 px. São alvos de verificação, não breakpoints extraídos do design. **P:** definir breakpoints pela capacidade do conteúdo, sem assumir que os padrões do Tailwind reproduzem o arquivo. Conferir contraste e foco antes de consolidar o tema; respeitar movimento reduzido no shimmer e nas transições.

## 4. Componentes reutilizáveis

Os nomes são propostas; não existem componentes implementados.

| Grupo | Componentes propostos | Reutilização |
| --- | --- | --- |
| Estrutura | `AppHeader`, `MobileNavigation`, `AccountNavigation`, `Breadcrumbs`, `SiteFooter` | Header nas telas principais desktop; navegação inferior no início mobile; menu em perfil/carteiras; breadcrumbs em detalhe/carrinho/pagamento. Rodapé onde observado, sem acrescentá-lo automaticamente às demais telas. |
| Descoberta | `Hero`, `CatalogToolbar`, `SearchField`, `CatalogFilters`, `NftGrid`, `Pagination` | Início e adaptação de filtros mobile. |
| NFT | `NftCard`, `NftImage`, `EthAmount`, `FavoriteButton`, `EditionSelector`, `QuantityControl`, `RelatedNfts`, `NftGallery` | Catálogo/relacionados; imagem/preço em detalhe, carrinho, pagamento e recibo; quantidade em detalhe/carrinho. |
| Compra | `CartItem`, `CouponForm`, `OrderSummary`, `WalletSelector`, `ConnectionStatus`, `OrderReceipt` | Resumo/cupom em carrinho e pagamento; carteiras no pagamento; recibo de pedido. |
| Conta | `AuthForm`, `AuthDialog`, `ProfileForm`, `AvatarField`, `PasswordFields`, `WalletForm` | Login/cadastro, perfil, carteiras e campos pertinentes do pagamento. Compartilhar campos sem forçar formulários com regras distintas numa abstração única. |
| Primitivos | Button, Input, Label, Select, RadioGroup, Tabs, Dialog, Sheet e Checkbox quando necessário | Componentes shadcn/ui efetivamente utilizados, adaptados ao tema. |
| Estados | Skeletons de card/detalhe/resumo, `EmptyState`, `ErrorState`, feedback acessível | Consultas, mutations, formulários e avisos de alteração de preço/pedido. |

O botão de filtros mobile está desenhado; um drawer acessível é **P**, pois não foi identificado seu estado aberto. Campos precisam associar label e erro; diálogos/drawers precisam controlar foco.

## 5. Assets disponíveis e indisponíveis

| Recurso | Situação real | Próxima ação |
| --- | --- | --- |
| Enunciado | Disponível remotamente; sem cópia local. | Referenciar no README da solução posteriormente. |
| Layouts | 15 frames visualizados no canvas. | Obter exports de referência para comparação. |
| Imagens NFT | Visíveis, sem arquivos locais/exportação verificada. Exemplos lidos: Emerald Ape, Sage Nomad, Neon Vessel, Cosmic Bloom, Violet Nomad, Ivory Baron, Golden Beat e Golden Signal. | Exportar retratos, hero e miniaturas e mapear arquivo ↔ NFT. Nomes/preços desenhados não constituem backend existente. |
| Marca | KURIO visível como wordmark. | Confirmar texto/vetor e obter SVG ou fonte correspondente. |
| Ícones | Busca, carrinho, favorito, voltar, filtros, conta, senha, sociais e carteiras visíveis. | Exportar SVGs e identificar biblioteca original antes de decidir substituições. |
| Ilustrações/badges | Hero, agradecimento, “RARO” e símbolos do rodapé visíveis. | Separar recursos exportáveis de texto/CSS fiel ao original. |
| Fontes | Aparência observada, família/arquivos desconhecidos. | Obter nome, pesos, WOFF2 e licença para uso local. |
| API/fixtures | Sem implementação ou arquivos fornecidos. | Projetar contratos e dados de simulação coerentes com o layout. |

**Não há assets de produto prontos para uso local.** Visualizar uma imagem no canvas não equivale a possuir seu arquivo. Nenhuma imagem aleatória foi escolhida e nenhum asset foi gerado.

### Material necessário para completar a extração

Solicitar exportação `.fig` ou pacote contendo:

1. PNGs completos dos **9 frames desktop e 6 mobile** nomeados na seção 2, na resolução original, com largura/altura e sem barras/avatares do Figma cobrindo conteúdo.
2. Imagens originais dos NFTs/hero/galeria; SVGs de marca, ícones e agradecimento; nomes e correspondência com as telas.
3. Cores com hex/opacidade; família/pesos/fontes; medidas de containers, gaps, paddings, raios e efeitos.
4. Se existirem no arquivo: filtros mobile abertos, menus, estados de campos/cards/botões e conexões de protótipo. Não é necessário inventar estados ausentes.

Esses materiais completam a visualização pública que funcionou. Não é necessário configurar MCP para continuar o planejamento técnico.

## 6. Matriz de requisitos e funcionalidades

Todos os itens **R** da matriz são **P0**. A ordem pode variar; a obrigação permanece.

| Tela/fluxo | Componentes | Interações e origem | Dados | Dependências / prioridade |
| --- | --- | --- | --- | --- |
| Descoberta | Hero, toolbar, filtros, cards, paginação | R §3: combinar busca/filtros/ordenação/página na URL, persistir em refresh/histórico, reiniciar página ao filtrar, descartar respostas obsoletas. F: categorias, preço, rede e abas. | NFTs, filtros, parâmetros e total de resultados. | Router, Query, Axios, REST/MSW; P0. |
| Detalhe | Galeria, edição, quantidade, compra | R §3: acesso direto, inexistente, edição indisponível e limites. F: avaliações e relacionados. | NFT, imagens, edições, estoque e preço. | Router, Query, Axios/MSW; P0. |
| Favoritos | Botão e feedback | R §§3–4: autenticação/persistência. P: escolher esta interação para atualização otimista obrigatória com rollback. Não há tela exclusiva confirmada. | IDs por usuário e resposta da mutation. | Sessão, Query e REST/MSW; P0. |
| Carrinho | Itens, quantidades, cupom, resumo | R §3: persistir, preservar visitante no login, disponibilidade, cupom válido/inválido/expirado e alterações em tempo real. | Itens NFT/edição, quantidades, cupom e cotação. | Mock persistente, Query e Socket.IO; P0. |
| Login/cadastro/sessão | Formulários, modal/página | R §3: cadastro/login/logout, conflito, refresh, expiração/retomada e limpeza de dados privados na troca. | Conta, sessão, credenciais fictícias e erros. | Router protegido, Query, Axios/MSW; P0. |
| Pagamento | Dados, carteiras, resumo, revisão | R §3: validação, conexão/recusa/desconexão, recotação e nova confirmação quando houver mudanças. | Perfil, carteira/rede, quote versionada e conexão. | Sessão, REST/MSW, Query e Socket.IO; P0. |
| Envio do pedido | Confirmar e feedback pendente | R §§3,5: chave idempotente, cliques repetidos e recuperação após timeout; mesma chave/conteúdo recupera pedido, conteúdo diferente conflita. | Tentativa, chave, payload, quote e pedido. | Contratos e persistência do mock; P0. |
| Resultado/recibo | Status e OrderReceipt | R §3: pendente/confirmado/recusado; sucesso só confirmado; snapshot; remover apenas itens/quantidades comprados; preservar em falha. | Pedido, transação simulada e valores congelados. | REST, Query, eventos e guard de rota; P0. |
| Perfil | Dados, avatar e senha | R §3: validar local/API, persistir e não armazenar senha em claro. | Perfil, avatar e resultado de alteração de senha. | Sessão, REST/MSW e invalidação; P0. |
| Carteiras | Menu e WalletForm | R §3: cadastrar/editar principal/secundária e usar no checkout, com erros. | Rede, tipo, endereço e campos do layout por usuário. | Sessão, Query e REST/MSW; P0. |
| Tempo real | Cliente de eventos, avisos e resumo | R §7: eventos de NFT/pedido, versões, duplicatas, reconciliação e isolamento; liberar listeners; terminais não regridem. | Event ID, recurso, versão e escopo de usuário. | `socket.io-client` via MSW e binding compatível; P0. |
| Estados assíncronos | Skeleton, vazio, erro e retry | R §§4,6,8: shimmer, dimensões estáveis, lentidão/falhas reproduzíveis e atualização em background. | Status, erros e cenário. | Query, Axios e MSW; P0. |
| Responsividade/a11y | Layout e primitivos | R §8: teclado, foco, labels/erros, alt, contraste, anúncios, zoom e ausência de overflow. | Estados semânticos e tokens. | Tailwind, shadcn/ui e Playwright; P0. |
| Verificação/entrega | Testes, auditoria, docs e deploy | R §§9–12: E2E/visual, Lighthouse, relatórios, comandos e URL pública reproduzível. | Fixtures, reset, baselines e evidências. | Playwright, Lighthouse, build e host; P0. |

### Conciliação entre comportamento e desenho

- O pagamento mobile mostra sobretudo carteiras. É preciso oferecer os dados e validações exigidos, por exemplo em etapa anterior no mesmo fluxo (**P**).
- Textos/valores estáticos do Figma não autorizam sucesso antecipado: a API decide cotação e confirmação.
- Blockchain, Etherscan e provedores aparecem visualmente; a execução deve ser simulada e identificada como tal, sem integração real.
- Redes/categorias visíveis orientam fixtures; regras de filtros, limites, cupons e validações não definidas são decisões próprias a documentar.
- ENS e indicação aparecem em formulários. Confirmar marcações de obrigatoriedade no export antes de definir o contrato. Não atribuir ao enunciado regex ou tamanho de senha inexistentes.

## 7. Arquitetura sugerida

### Stack e organização

**R §2:** React, TypeScript, TanStack Router, TanStack Query, Axios, REST, Socket.IO, Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse devem participar efetivamente da solução. A stack planejada no prompt é confirmada como obrigatória, incluindo Lighthouse.

**P:** Vite, um único projeto e um gerenciador/lockfile. Confirmar versões compatíveis no Prompt 2. Evitar segundo cliente HTTP, Redux, microfrontends, backend real ou camadas de repositório sem justificativa. Hooks ficam junto das features; criar somente os diretórios usados.

```text
src/
  app/                 # bootstrap, providers, router e início dos mocks
  routes/              # telas, search params e guards
  components/
    ui/                # componentes shadcn/ui utilizados e adaptados
    layout/            # header, menus e footer
    feedback/          # skeletons e estados compartilhados
  features/
    catalog/           # cards, filtros, detalhe, queries e favoritos
    auth/              # formulários, sessão e retomada
    cart/              # itens, cupom e cotação
    checkout/          # revisão, conexão simulada e envio
    orders/            # status e recibo
    account/           # perfil, avatar, senha e carteiras
  services/
    http.ts            # Axios, erros e cancelamento
    realtime.ts        # conexão e encaminhamento de eventos
  contracts/           # DTOs REST, erros e envelopes dos eventos
  lib/                 # precisão ETH e helpers compartilhados
  mocks/
    browser.ts         # ativação antes de consultas/conexões
    handlers/          # REST e Socket.IO na camada de rede
    db.ts              # estado canônico, persistência e reset
    fixtures/          # dados estáveis, ao menos dois usuários
    scenarios/         # falhas, latência e disparos determinísticos
  assets/              # recursos importados
  styles/              # tema e estilos globais
public/                # worker MSW e estáticos quando necessário
tests/e2e/             # fluxos, acessibilidade e regressão visual
tests/e2e/fixtures/    # controle dos cenários pelos mocks
audits/                # configuração e relatórios Lighthouse
docs/                  # análise e contratos documentados
```

Árvore somente proposta, sem pastas de implementação criadas. README da solução e `ARCHITECTURE.md` serão produzidos posteriormente.

### Rotas propostas

| Caminho | Acesso e finalidade |
| --- | --- |
| `/` | Catálogo público e parâmetros de busca/filtros/ordenação/página tipados. |
| `/nfts/$nftId` | Detalhe público; tratar acesso direto e inexistente. |
| `/cart` | Carrinho público, incluindo visitante. |
| `/login`, `/register` | Públicos; retorno interno validado; modal desktop/página mobile. |
| `/checkout` | Privado; sessão, carrinho e cotação recuperados. |
| `/orders/$orderId` | Privado; recuperar pendente/recusado/confirmado. Só confirmado usa recibo de sucesso. |
| `/account/profile`, `/account/wallets` | Privados; perfil e carteiras. |
| rota não encontrada | Recuperação e navegação, também por acesso direto publicado. |

Listagem de favoritos e histórico de pedidos como páginas próprias não são exigências comprovadas. É possível persistir favoritos e recuperar pedidos sem ampliar a quantidade de telas.

### Contratos e serviços

**P:** tipos `Nft`, `NftEdition`, `CatalogParams`, `PageResult<T>`, `Session`, `Profile`, `Wallet`, `CartItem`, `Cart`, `Quote`, `Order`, `ReceiptSnapshot`, `ApiError` e `RealtimeEvent<T>`. União discriminada nos estados de pedido; erros tipados com associação a campos.

| Recursos exigidos (R §5) | Endpoints ilustrativos (P) |
| --- | --- |
| Sessão/conta | `POST /api/accounts`, `POST /api/session`, `GET /api/session`, `DELETE /api/session`; expiração controlada pelo cenário. |
| NFTs | `GET /api/nfts?...`, `GET /api/nfts/:id`. |
| Favoritos | `GET /api/favorites`, `PUT /api/favorites/:id`, `DELETE /api/favorites/:id`. |
| Carrinho | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`. |
| Cotação/cupom | `POST /api/quotes`: itens, carteira/rede e cupom opcional; remover cupom produz nova cotação. |
| Pedidos | `POST /api/orders` com chave idempotente, `GET /api/orders/:id`; recuperar tentativa sem criar outra compra. |
| Perfil/senha | `GET /api/profile`, `PATCH /api/profile`, `PATCH /api/profile/avatar`, `POST /api/profile/password`. |
| Carteiras | `GET /api/wallets`, `POST /api/wallets`, `PATCH /api/wallets/:id`. |

Erros precisam representar validação, 401/403, 404, conflitos e falhas transitórias. Identidade vem da sessão simulada, não de `userId` arbitrário aceito do cliente. Rotas/códigos/corpos exatos serão definidos no contrato compartilhado entre handlers e serviços.

**P — dinheiro:** transportar ETH como string decimal e calcular no mock com inteiros escalados/`BigInt`, convertendo e persistindo como strings nas bordas. Evitar `Number` em cálculos monetários. Quantidades inteiras; cotação da API como autoridade. Biblioteca decimal adicional só se o helper limitado mostrar necessidade.

**P — mocks:** uma base persistida e versionada mantém catálogo, contas, favoritos, carrinhos, carteiras, quotes e pedidos. REST e eventos usam a mesma alteração canônica; reset restaura estado, sessões, versões e tentativas. Componentes, hooks e Axios não contêm respostas fictícias ou atalhos de negócio.

**P — sessão:** somente credenciais fictícias; guardar verificadores derivados com salt, nunca senhas em claro. Restaurar pelo endpoint antes de liberar telas privadas. Separar carrinho visitante e autenticado; documentar merge por NFT/edição, limites e feedback de ajustes. Não transferir o carrinho privado de uma conta para outra.

### Estado assíncrono, cache e hooks

- **P:** Router controla URL; Query controla dados remotos; estado local controla campos, foco e dialogs. Persistência do negócio fica no mock, evitando fontes concorrentes com o cache da UI.
- **P:** `useCatalog`, `useNft`, `useSession`, `useCart`, `useQuote`, `useFavoriteMutation` e `useOrder`, sem abstrações genéricas desnecessárias. Realtime tem um ciclo por sessão, não por card.
- **P:** query keys incluem parâmetros e usuário para dados privados. Logout/troca cancela consultas, remove cache privado e libera subscriptions antes da próxima sessão.
- **P:** `AbortSignal` no Axios e keys por parâmetros impedem resultados antigos de substituir a consulta atual. Favorito otimista guarda snapshot, faz rollback e reconcilia; mutations invalidam os recursos afetados.
- **P inicial:** frescor de 30 s para catálogo/detalhe; sessão/quote/pedido pendente sem janela de frescor. Reconexão/foco refazem recursos ativos; checkout revalida explicitamente. Esses tempos não vêm do README.
- **P:** até duas novas tentativas limitadas para GET transitório; sem retry automático para 4xx ou mutations não idempotentes. Pedido só recupera/reenvia com mesma chave/payload após falha ambígua.
- **P:** eventos com identidade estável, recurso e versão; validar antes de atualizar/invalidar cache. Deduplicar e ignorar antigos; reconectar refaz REST de recursos ativos. Pedidos terminais não regridem, e eventos da sessão anterior não atualizam a próxima.

### Checkout e idempotência

**P:** carrinho → sessão recuperada → carteira/rede simuladas → cotação → revisão → revalidação → criação idempotente → pendente → confirmado/recusado.

Persistir tentativa/chave/contexto antes da criação. Timeout posterior à criação deixa resultado desconhecido, não prova recusa. Recuperar a mesma tentativa após reload/reconexão; só iniciar outra após resolver a anterior. Mudança material de quote exige nova revisão. Desabilitar o botão ajuda, mas não substitui idempotência no mock.

Ao confirmar, gravar snapshot e descontar do carrinho apenas quantidades compradas, uma única vez. Não recalcular recibo pelo catálogo atual. Falhas preservam itens. Consultas e eventos de pedido verificam autorização por usuário.

### Testes e auditorias planejadas

**R §9:** Playwright deve cobrir os 12 grupos: catálogo/URL/histórico; detalhe direto/404; cadastro/sessão/troca; favorito com rollback; carrinho/cupom/persistência; compra confirmada; recusa/clique repetido/timeout; perfil/avatar/senha/carteiras; alteração de preço/estoque; eventos antigos/duplicados/reconexão; teclado/foco/validação; loading lento/erro/retry.

**P:** cada teste parte de cenário/armazenamento isolado; controlar relógio, latência e eventos pelos mocks. E2E REST passa por Axios/MSW; tempo real passa pelo cliente Socket.IO. Versionar baselines estáveis de início, detalhe, carrinho e pagamento, revisadas contra referências. Executar principais fluxos em Chromium desktop/mobile, entregar HTML e traces de falha.

**R §10:** início e detalhe, mobile/desktop, três medições por combinação: **12 execuções Lighthouse**, reportando medianas. Metas: performance ≥90, acessibilidade ≥95, boas práticas ≥95 e SEO ≥90. Registrar LCP/CLS/TBT, relatórios HTML/JSON, configuração, versões/ambiente e causas de metas não atingidas. Não retirar assets/funcionalidades para melhorar pontuações.

**P:** testes pontuais de precisão, merge, idempotência e versões são úteis quando viáveis; não substituem E2E. Nenhum teste foi executado aqui, pois não há aplicação.

## 8. Priorização P0/P1/P2 e prazo

### P0 — entrega obrigatória

Todos os requisitos do README: nove telas/fluxos, mobile/tablet, stack efetiva, contratos, persistência/isolamento, cenários/falhas, atualização otimista, precisão ETH, checkout idempotente, tempo real compatível com Socket.IO, acessibilidade, shimmer, testes E2E/visuais, Lighthouse, documentação e **deploy público**.

**R §11 — eliminatórios:** stack sem uso real; fluxos principais somente visuais; confirmar compra sem resposta da simulação; vazamento entre usuários; eventos simulados diretamente na UI; ausência de E2E executável. Tratar esses riscos desde a primeira fatia implementada.

### P1 — melhorias além do mínimo

**P:** painel de cenários mais confortável que configuração documentada; testes de domínio e navegadores adicionais ao Chromium; CI dos comandos já exigidos; diagnóstico de eventos que facilite depuração sem expor dados privados. Não mover itens obrigatórios para esta categoria.

### P2 — refinamentos opcionais

**P:** animações adicionais não exigidas, gestos/carrosséis avançados, atalhos extras e ferramentas internas de desenvolvimento. Não expandir para páginas fora do escopo ou integrações reais.

### Sequência sugerida para dois dias

Organização estimada para duas jornadas de aproximadamente **10 horas úteis**, sem garantia de conclusão. O escopo é alto para o prazo, especialmente partindo de zero. A ordem abaixo não reduz nenhuma obrigação; um P0 pendente deve ser declarado.

| Janela | Resultado esperado |
| --- | --- |
| Dia 1, primeiras 2 h | Setup no Prompt 2, contratos iniciais e prova REST/MSW + cliente Socket.IO no build/deploy de teste. Obter material visual antes de consolidar tema. |
| Dia 1, próximas 3 h | Base persistente/reset, sessão/isolamento, catálogo/detalhe, estrutura responsiva e primeiro E2E. |
| Dia 1, próximas 3 h | Carrinho/cotação, precisão ETH, merge do visitante e favorito otimista. |
| Dia 1, últimas 2 h | Fluxo vertical de checkout/pedido/recibo e alteração de preço, com polimento ainda pendente. |
| Dia 2, primeiras 3 h | Perfil/carteiras/avatar/senha; expiração; recusa, timeout, reconexão e eventos obsoletos. |
| Dia 2, próximas 3 h | Completar cenários/E2E, revisar visuais/a11y e verificar 390/768/1440. |
| Dia 2, últimas 4 h | Corrigir falhas, auditar performance, finalizar docs/evidências e validar deploy final/checkout limpo. Preservar margem para imprevistos. |

O código aguarda o próximo prompt. Testes e publicação de verificação entram cedo quando a implementação for autorizada; não deixar toda a integração para o fim.

## 9. Riscos e informações pendentes

| Risco | Impacto | Mitigação inicial proposta |
| --- | --- | --- |
| Assets/tokens sem exportação | Fidelidade e execução local incompletas. | Obter pacote da seção 5; não substituir automaticamente. |
| MSW/Socket.IO e versões | WebSocket genérico não reproduz todo o protocolo; risco eliminatório. | Provar handshake, eventos e reconexão com `socket.io-client` em dev e build. |
| Documentação divergente do binding | Snippets podem pertencer a APIs diferentes. | Fixar versão e consultar código/docs correspondentes antes de adotar sintaxe. |
| Mock inconsistente | Divergência REST/eventos/estoque/pedido. | Base canônica, alteração antes de evento e reset determinístico. |
| Timeout/repetição de pedido | Duplicação ou sucesso indevido. | Tentativa persistida, idempotência por usuário, conflito por payload diferente e recuperação do estado. |
| Quote desatualizada | Compra inválida por preço/estoque/taxas. | Versionar, revalidar no handler e exigir nova revisão. |
| ETH em ponto flutuante | Totais incorretos. | Strings e inteiros escalados; snapshot sem recálculo. |
| Expiração/troca de usuário | Vazamento de cache/eventos/pedidos. | Cancelar/limpar recursos privados e testar com dois usuários. |
| Mobile incompleto | Campos/telas podem desaparecer. | Adaptar conta/recibo e dados de checkout, mesmo sem frame específico. |
| Deploy estático | Falha em refresh, worker, socket ou mocks. | Verificar fallback SPA, HTTPS, escopo do worker e ativação dos mocks no primeiro deploy de teste. |
| Baselines/auditorias instáveis | Evidências não reproduzíveis. | Fixar dados/assets/fontes/relógio/cenário e registrar ambiente. |
| Prazo curto | Entrega incompleta apesar do visual. | Fluxo vertical cedo, riscos eliminatórios primeiro e margem de verificação. |

### Evidência técnica do binding

O [repositório oficial de `@mswjs/socket.io-binding`](https://github.com/mswjs/socket.io-binding) descreve protocolo sobre WebSocket com namespace padrão e eventos de texto. A documentação observada limita namespaces customizados, acknowledgements e anexos binários. **P:** eventos JSON no namespace padrão e WebSocket explícito, se validados na versão escolhida; documentar limitações efetivas e ausência de polling caso esse transporte seja adotado.

O [package.json da main consultado](https://github.com/mswjs/socket.io-binding/blob/main/package.json) declara versão `0.2.0` e peers `msw: ^2.10.2` e `@mswjs/interceptors: ^0.43.2`. Isso não confirma versão publicada/instalada ou compatibilidade prática. A leitura raw do README retornou exemplo com `toSocketIo`, enquanto a página principal mostrou `SocketIo`/opção `protocol`. Portanto, a análise não valida uma receita de integração: a prova com versões fixadas é prioridade do Prompt 2.

### Decisões ainda necessárias

- Obter assets, fontes, medidas e confirmar KURIO frente ao nome GreenMint da página.
- Definir regras abertas: validações, merge do carrinho, sessão, arredondamento, cupons, redes e carteiras suportadas.
- Escolher versões/gerenciador e formalizar contratos de quote/idempotência/eventos antes de expandir telas.
- Escolher hospedagem e repositório de entrega. O link fornecido é o enunciado; o workspace não está conectado a ele nem a um repositório de solução.

## 10. Checklist de preparação para o Prompt 2

- [x] Ler o prompt anexado e inspecionar arquivos/Git locais.
- [x] Confirmar ausência de aplicação, dependências e assets.
- [x] Ler README remoto e separar exigências de propostas.
- [x] Acessar Figma público e identificar 15 frames.
- [x] Inspecionar composições e registrar limites/estados ausentes.
- [x] Mapear componentes, fluxos, arquitetura, prioridades e riscos.
- [x] Restringir a etapa a documentação, sem código ou commits.
- [ ] Receber o Prompt 2 antes de implementar.
- [ ] Obter exports/assets/fontes/tokens e dimensões originais.
- [ ] No Prompt 2, escolher versões e validar REST/MSW/Socket.IO numa fatia mínima.
- [ ] Formalizar sessão/carrinho/quote/pedido e reset determinístico.
- [ ] Planejar E2E, build com mocks e rotas diretas no deploy desde o setup.

**Prontidão:** há informação suficiente para iniciar o planejamento técnico e o setup do Prompt 2 quando solicitado. A implementação visual de alta fidelidade ainda depende da extração de assets/propriedades. Próximo passo recomendado: fornecer o Prompt 2 e o pacote visual, resolvendo cedo a compatibilidade MSW/Socket.IO e a idempotência do checkout.

## Atualização na etapa 4 — arquivo local recebido

Em 15/10/2026, o usuário forneceu `Frontend Challenge.fig`. A cópia foi importada para inspeção, liberando `get_design_context` dos frames Desktop / Início (`2:2`) e Mobile / Início (`14:5226`). As limitações de exportação descritas acima registram a situação da etapa 1 e foram resolvidas para a Home. Roboto Mono, paleta, medidas, quatro imagens originais e SVGs foram confirmados. Referências e inventário estão em `docs/figma`; implementação, verificações e ajustes em `docs/PROMPT4.md`. As demais telas continuam nos prompts correspondentes.
