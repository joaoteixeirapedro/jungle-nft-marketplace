# Arquitetura — marketplace, dados e fluxos implementados

O README oficial prevalece. A correção mais recente do Prompt 2 determina MSW para REST **e eventos Socket.IO**, sem backend. Esse é o resultado implementado; a instrução anterior de servidor local foi substituída. Não há dependências diretas Express ou `socket.io`, código de servidor ou proxy.

## Inicialização e rotas

Vite + React/TypeScript. Aliases `@/*` no Vite e TypeScript; `strict` e `noUncheckedIndexedAccess` na aplicação, strict também na configuração/testes. Roteamento em código por TanStack Router, com `/`, `/marketplace`, `/nfts/$nftId`, `/dev/diagnostics` e not-found. A SPA funciona por navegação interna e refresh direto; hospedagem futura deve configurar fallback HTML.

O bootstrap aguarda `worker.start()` **antes de importar a aplicação**. Socket.IO/Engine.IO captura o construtor WebSocket durante a importação; apenas `autoConnect: false` não garante que MSW já instalou a interceptação. Não antecipar imports de módulos Socket.IO antes desse bootstrap.

O provider Query envolve as rotas; UI não possui dados fictícios. Somente a rota de diagnóstico adquire a conexão nesta etapa. O hook registra funções de listener estáveis por montagem, remove cada listener e desconecta no cleanup. Isso também suporta a dupla montagem de StrictMode.

## REST e cache

Axios único, base configurável, timeout de 10 s, `withCredentials` e normalização de status/código/erros de campos/detalhes em `ApiError`. O interceptor anexa token Bearer e identidade do visitante de `sessionStorage`; `authApi` oferece cadastro/login/consulta/logout sem UI. `AbortSignal` da query chega ao Axios; cancelamentos são preservados.

QueryClient: `staleTime` 30 s, no máximo duas novas tentativas para falhas de rede/5xx, nenhuma para 4xx; refetch ao voltar à janela, mutations sem retry automático. Futuras queries privadas devem incluir identidade/parâmetros nas keys; sessão, quotes e pedidos precisarão de políticas próprias.

O health original continua inalterado, com latência fixa de 150 ms. A etapa 3 adiciona catálogo/detalhe, coleções/criadores, conta/sessão, perfil/avatar/senha, favoritos, carrinho/cupom, cotação, carteiras/conexão e pedidos/recibo. Todos os contratos, controles e cenários estão em [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md); nenhum dado de negócio foi colocado nos componentes.

O worker oficial é versionado em `public/`, copiado pelo build e ativo por configuração também na demonstração. Requests não tratadas para `/api/*` geram erro do MSW, evitando fallback silencioso; assets/Vite são liberados.

## Socket.IO + MSW

Versões fixadas: MSW `2.15.0`, `@mswjs/socket.io-binding` `0.2.0`, `socket.io-client` `4.8.4`. MSW 3 foi descartado porque o binding publicado exige peer MSW `^2.10.2`; não foi usado `--force` ou `--legacy-peer-deps`.

A API **publicada/instalada** do binding é `toSocketIo(connection)`. Os exemplos da branch main com `SocketIo` e `protocol` não correspondem ao pacote publicado. A implementação foi conferida no README, declarações e fonte instalados.

`ws.link` intercepta uma origem `.test`, sem servidor real. No MSW `2.15.0`, `WebSocketHandler.parse()` normaliza o caminho `/socket.io/` para namespace `/`; por isso o link aponta à raiz da origem, embora o cliente continue usando o caminho de transporte padrão. Essa decisão depende da versão fixada e deve ser reconferida ao atualizar.

O cliente usa exclusivamente `transports: ['websocket']`, sem upgrade/fallback polling. O binding fornece handshake Engine.IO/Socket.IO. Após conectar, o cliente envia `client:ready`; o handler responde `server:ready` pelo binding. A confirmação recebida na UI vem do cliente Socket.IO, sem setters/cache chamados pelos mocks.

O binding anuncia heartbeat, mas não agenda ping. O handler envia ping Engine.IO (`2`) a cada 20 s e limpa o intervalo no fechamento; o próprio cliente responde pong. O restante do enquadramento/protocolo é responsabilidade do binding, não uma implementação própria de WebSocket puro.

Limitações: apenas namespace padrão e payloads JSON/texto nesta etapa; rooms, acknowledgements e binários não foram utilizados ou validados. O binding usa um SID fixo de diagnóstico; não usar esse SID como identidade de usuário ou de evento. `connectionId` vem do cliente interceptado MSW. `connectedAt` é fixture fixa, não horário real.

Reconexão automática limitada a três tentativas. A etapa 3 adiciona `nft.updated` e `order.updated`, com ID, recurso, versão e snapshot canônico. O mock publica depois de persistir a transação; não chama setters/cache da interface. Conexão informa token em `client:ready`; o mock revalida a sessão ao entregar cada evento privado. Logout/expiração bloqueiam entregas mesmo com socket aberto. O teste usa clientes Socket.IO de Alice/Bruno e confirma isolamento. Deduplicação/ordenação e reconciliação avançada no frontend aguardam o Prompt 9.

## Estado canônico e regras de negócio

`mocks/state/store.ts` lê/escreve um único banco JSON em localStorage, com versão de schema, fixtures, usuários, sessões, favoritos, carrinhos, carteiras, quotes, pedidos e tentativas idempotentes. Web Locks serializa transações síncronas entre abas em navegadores compatíveis; no fallback há fila por contexto. Sem Web Locks, exclusão entre abas não é garantida. Node usa memória/fila nos testes. Erros de persistência são retornados, sem publicar eventos de uma gravação falha; dados corrompidos podem ser restaurados pelo controle de reset, sem impedir o bootstrap do worker.

Fixtures determinísticas: 30 NFTs, 90 edições, três coleções/criadores, duas contas, favoritos/carrinhos/carteiras diferentes, sessão expirada e pedido histórico com recibo simulado. A etapa 4 associa imagens oficiais do `.fig` aos NFTs; `snapshot()` preenche somente imagens ausentes em bancos anteriores, preservando o estado de negócio. Novos cenários/reset usam cronologia fixa que apresenta os primeiros NFTs do design como recentes. Preços/taxas continuam strings; cálculos inteiros em wei, desconto em basis points e arredondamento único para baixo. Nenhuma senha em claro é persistida: PBKDF2/SHA-256, salt e 100.000 iterações. Isso é simulação no próprio navegador, não autenticação de produção.

Catálogo, detalhe e carrinho derivam preço/disponibilidade das mesmas edições: `disponível = supply - sold - reserved`. Carrinho não reserva; criar pedido reserva atomicamente, confirmar transforma em venda e recusar libera. Confirmação remove somente as quantidades compradas. Login/cadastro incorpora o carrinho visitante uma única vez; clipping por estoque/limite é informado em `cartMerge.adjustments`. Nunca mescla carrinhos de duas contas privadas.

Quotes imutáveis duram 5 min e registram itens, versões, contexto de carteira, cupom e valores. Pedidos revalidam tudo antes de criar. Mesma chave e corpo normalizado recuperam o mesmo pedido, inclusive após timeout/refresh; conteúdo diferente conflita. Reserva, registro da tentativa e pedido são persistidos numa transação. Estados terminais não regridem. Recibo é snapshot e não é recalculado a partir do catálogo atual.

Pedidos guardam decisão e prazo. O runtime restaura timers após refresh; GET processa decisões vencidas. Timers são cancelados no reset completo. Cenários de erro/latência usam contadores fixos, com respostas fora de ordem e recuperação transitória reproduzíveis. Controles avançam relógio, alteram preço/disponibilidade e finalizam pedidos pela mesma lógica de negócio. Nenhum servidor real é necessário.

O frontend possui descoberta pública, mas ainda não tem queries privadas. Quando forem criadas, devem incluir identidade nas keys, limpar/cancelar cache privado e subscriptions ao trocar sessão e apresentar nova revisão de cotação. Autorização/isolamento da API e eventos já existem; guards, formulários e políticas de cache privado ainda serão integrados.

## Componentes, estilo e dependências

Tailwind 4 pelo plugin Vite, sem configuração antiga de Tailwind 3/PostCSS. shadcn/ui manual com `components.json`, CSS variables, helper `cn`, CVA e Radix Slot. Button é usado na página de diagnóstico. CLI é ferramenta sob demanda, não runtime. A resolução do registro foi verificada por dry run.

O `.fig` fornecido pelo usuário foi importado como cópia de trabalho e liberou o contexto de alta fidelidade dos frames `2:2` e `14:5226`. Tema confirmado do design: fundo `#140D0A`, superfície `#241612`, âmbar `#D28A4C`, texto `#F5F1EB` e secundário `#CFB28C`. Roboto Mono 400/500/700 é local, com licença OFL. PNGs/SVGs oficiais estão em `public/assets/figma`; não há URLs temporárias de imagens/fontes em runtime. A skill de design-to-code foi aplicada e os componentes existentes foram adaptados, sem biblioteca nova. Ver referências e inventário em `docs/figma`.

## Verificação e entrega

Cinco testes de domínio no runner Node validam precisão, catálogo, idempotência concorrente, cotação/estoque/recusa, snapshot e credenciais/merge. Seis grupos Playwright de API exercitam MSW no navegador, incluindo refresh, isolamento, falhas, timeout e eventos reais do cliente Socket.IO. São executados uma vez em desktop; quatro testes de setup e seis de catálogo são executados em desktop/mobile. Total: 26 execuções Playwright no build estático. Cada teste tem estado isolado/reset determinístico e relatórios próprios por ambiente. Os futuros E2E das jornadas completas de compra/conta continuam pendentes.

## Descoberta funcional — Prompt 4

Rotas `/` e `/marketplace` compartilham `Catalog`, filtros e cards. `/nfts/$nftId` somente consulta o recurso e trata 404; não antecipa edição, favoritos ou compra. A Home reproduz hero, destaque lateral, promoções, Diário da Cunhagem e rodapé que estão no design. No mobile, utiliza busca superior, hero compacto, duas colunas deslocadas e navegação inferior. Slots curatoriais da Home consultam NFTs existentes pela API; metadados de NFT não são duplicados na UI. Editorial, newsletter, sociais e futuros fluxos apresentam diálogo de indisponibilidade, sem confirmações falsas ou envio externo.

TanStack Router valida os parâmetros `q`, `category`, `network`, `collectionId`, `creatorId`, `minPrice`, `maxPrice`, `available`, `sort` e `page`. Defaults são `recent` e página 1, omitidos na URL por middleware. Entradas desconhecidas/inválidas são ignoradas pelo estado validado; intervalo monetário invertido é descartado. O campo de preço valida via BigInt e informa erro antes de navegar. Mudanças de filtro/busca/ordenação reiniciam a página. O total retornado pelo servidor limita links diretos com página inexistente e substitui a entrada de histórico ao corrigir a página.

Queries públicas: `['catalog', params]`, `['collections']`, `['creators']` e `['nft', id]`. A listagem sempre envia página/tamanho 9 e todos os filtros ao Axios; não pagina localmente. Hero e destaque usam as queries de detalhe dos IDs selecionados pela curadoria, deduplicadas pelo cache. Não importa fixtures na UI nem duplica contratos. Valores ETH são apresentados por troca do separador decimal da string, sem conversão para Number. Os sliders trabalham com inteiros limitados (centésimos) e BigInt; os campos monetários preservam a precisão completa do contrato.

Busca usa debounce de 300 ms e submissão imediata. O rascunho é local somente enquanto se digita; navegação/URL restaura seu valor e cancela o timer. Não há efeito de busca ou sincronização bidirecional: TanStack Query consome os parâmetros da rota. Query keys completas e AbortSignal impedem respostas antigas de substituir a combinação atual. Não se utiliza placeholderData de outra busca; uma nova chave mostra skeletons, enquanto revalidação da mesma chave mantém resultados com aviso de atualização. Falha tem retry explícito e resultados vazios podem limpar busca/filtros. Controles de cenário exigem reload/refetch após alteração para invalidar o cache público de 30 s.

Desktop mantém filtros laterais; mobile reúne filtros, ordenação e contagem em dialog modal nativo com showModal/close, foco inicial, conteúdo externo inerte e restauração de foco/Escape. Isso evita outra dependência para o painel. Botões têm alvo de pelo menos 44 px; o CTA compacto do hero mobile usa área estendida. Skeletons preservam proporções e respeitam movimento reduzido. A interface foi comparada com os frames oficiais e inspecionada em 390, 414, 768 e 1440 px e numa viewport equivalente a zoom de 200%, sem overflow horizontal. Referências estão em `docs/figma` e capturas em `docs/screenshots/prompt4`; as diferenças funcionais/de conteúdo estão documentadas no relatório, sem alegação de igualdade de pixels com dados diferentes.

Nenhum contrato, handler de negócio ou protocolo Socket.IO foi alterado. As alterações de fixture/persistência se limitam a metadados visuais, associação de imagens e preenchimento de imagens ausentes. O catálogo ainda não assina eventos de negócio; a integração e os testes REST/Socket.IO da etapa 3 permanecem ativos. A integração visual/reconciliação de eventos e os fluxos futuros serão adicionados nos prompts correspondentes. Nenhuma dependência instalada nesta etapa.

Deploy futuro somente de `dist/`, HTTPS e fallback SPA. `vite preview` é para validação local. A etapa 3 não inclui interfaces completas, deploy público ou Lighthouse. Não foram adicionadas dependências para a camada de dados; testes unitários usam Node nativo. Dependências existentes continuam fixadas no lockfile; Node mínimo 24.

## Prompt 5 — detalhes e favoritos

A etapa 5 substitui o placeholder de detalhes por API por ID, imagem ampliável, edições dinâmicas, quantidade validada, estoque, atributos e relacionados por coleção. Favoritos dos cards e detalhes compartilham Query e mutation, com chave por sessão, snapshot/rollback, reconciliação API e bloqueio de operações simultâneas. O token existente agora é observável; mudança de sessão cancela/remove caches privados anteriores, e callbacks antigos não escrevem no cache ativo. Não existe login automático ou formulário provisório.

A conexão Socket.IO pública aplica `nft.updated`, cancela leituras antigas e revalida detalhe, catálogo e favoritos; metadados do detalhe são preservados e versões anteriores não substituem dados mais recentes. MSW e binding continuam responsáveis por todo o protocolo. Não há backend real, polling ou replay avançado. Os cenários de leitura de NFTs também cobrem os detalhes. Quantidade compartilha limites 1..999 com os handlers e o merge; valores ETH continuam BigInt/strings.

O `returnTo` das rotas de detalhes só aceita a Home ou o mercado locais; suas buscas são revalidadas no retorno. Mantém origem e filtros/página após refresh. A página mobile tem barra de compra própria e não renderiza a navegação inferior global. Imagens reais são dinâmicas; Figma com miniaturas duplicadas é reduzido a uma imagem ampliável. Ratings, contratos e royalties não fornecidos pela API não são inventados.

Ver docs/PROMPT5.md para matriz de conformidade, limites visuais e casos de teste. Autenticação visual, carrinho/checkout e recuperação avançada de eventos permanecem nas etapas seguintes. Nenhuma dependência foi adicionada.

## Prompt 6 — sessão e autorização

A identidade global vem de uma única query `session`, chaveada pelo token em sessionStorage. O AuthProvider separa verificação, autenticação, visitante, erro transitório e saída. Guarda de rota `beforeLoad` compartilha Query/Axios; áreas privadas aguardam confirmação. Login e cadastro atualizam o cache a partir da resposta validada, sem outro usuário persistido. Auth mutations não armazenam senhas em variables; abort ao sair impede que respostas canceladas gravem token.

401 de request privado invalida somente seu token de origem, centraliza a recuperação e conserva destino seguro. 403 não provoca logout. Falha transitória preserva a sessão e permite revalidar. Logout sempre tenta DELETE; se falhar, encerra localmente e informa a ausência de confirmação da revogação remota. A sessão remota pode expirar naturalmente. Requests Axios, queries, mutations e subscriptions anteriores são cancelados/removidos ou descartados quando muda a conta.

Socket.IO reconecta com a identidade verificada; todos os listeners da conexão anterior são liberados. Eventos privados conferem token e userId antes de invalidar as queries correspondentes. Recuperação/replay avançados ficam no Prompt 9. Checkout guarda somente contexto de navegação e exige futura revalidação/confirmacão, sem compra automática.

Figma: login/cadastro desktop como modal nativo sobre a Home existente e mobile como formulário de página inteira. Fundo reutilizado fica inert. Diferenças de conteúdo, foco e áreas de toque são explícitas em docs/PROMPT6.md. Perfil/carteiras/pedidos/checkout têm apenas entradas protegidas com resumos reais e aviso de etapa pendente, sem interfaces falsas. Nenhuma dependência foi adicionada.

## Prompt 7 — carrinho e cotação

`/cart` é público. Compra no detalhe envia a seleção existente ao POST e navega somente após confirmação. A chave de query é `['cart', token]`, com null para visitante; guestId continua no header existente. O header soma quantidades reais. AuthProvider e Axios cancelam/limpam as requisições da identidade anterior, incluindo carrinho e quotes de visitante. Rascunhos, feedback e aceites locais são remontados ao mudar a identidade. O banco MSW continua sendo a única persistência dos itens; merge é exclusivamente a regra existente de login/cadastro.

Mutations têm scope serial por carrinho, sem retry e com bloqueio de envio duplicado. Cancelam leituras/cotações anteriores, aplicam a resposta confirmada e reconsultam GET inclusive em falha ambígua. O rascunho de quantidade não representa estado persistido; enquanto diverge da quantidade confirmada, o avanço fica bloqueado. GET/quote têm staleTime 0, retry false e recuperação explícita. Erros de revalidação preservam e identificam a última versão confirmada.

Quotes usam chaves por identidade e assinatura completa de itens/versões/preços/disponibilidade/cupom, incluindo alterações que não incrementam cart.version. Valores financeiros são strings da resposta, sem cálculo paralelo. O prazo é expiresAt. Mutation ou nft.updated invalidam a cotação e o avanço; mudanças exigem revisão e aceite. Continuar reconsulta carrinho e quote, compara snapshots e só navega com consistência. Essa revalidação também usa Query/AbortSignal para cancelamento por evento. Visitante autentica e retorna ao carrinho para obter cotação da nova identidade. Não são criados pedidos nem selecionadas carteiras; P8 fará a revisão final com contexto de rede/carteira e validação transacional do pedido.

Mesmo socket.io-client/WebSocket/binding MSW, sem serviço adicional. `mocks/http.ts` estende falhas/latência/fora de ordem determinísticos aos endpoints já existentes. Não há nova fonte de estoque, taxa, cupom ou dados hardcoded na UI.

Figma desktop 11:1278 e mobile 16:360 foram consultados no editor após limite do MCP. Composição e assets oficiais são reutilizados. Cards/resumo crescem para apresentar campos e mensagens funcionais. Após autorização expressa do usuário, foi adicionada somente a configuração de exportação SVG ao ícone original Iconly/Curved/Delete; cart-delete.svg mantém 24 × 24 e a ação tem alvo de pelo menos 44 px e nome acessível. O desenho não foi alterado. Não se declara comparação pixel a pixel ou extração integral pelo conector bloqueado; os ajustes estão em docs/PROMPT7.md. Não houve substituição por biblioteca ou imagem gerada. Skeletons respeitam reduced motion. Nenhuma dependência adicionada, sem avanço ao P8.

## Checkout e pedidos — Prompt 8

Checkout, histórico mínimo e detalhe/recibo têm páginas próprias protegidas. A seleção usa somente GET /wallets; conexão, recusa e desconexão passam pelos endpoints anteriores. Dados de colecionador são validados pelos limites do contrato. O resumo usa Quote e não recalcula dinheiro. POST /quotes recebe contexto de carteira/rede; a revisão final refaz GETs e quote e compara o snapshot aceito antes de enviar CreateOrderRequest.

Query keys incluem token e pedido; quote inclui fingerprint e contexto. Leituras de checkout/pedido não têm retry automático; recibos imutáveis têm staleTime Infinity. Criação é mutation sem retry, protegida contra cliques concorrentes. Antes do POST, sessionStorage persiste por user.id a chave idempotente e corpo exatos. Timeout, 401, rede, cancelamento e 5xx mantêm a referência até recuperação explícita com a mesma requisição. Não há pedido/recibo/resultado paralelo em storage da interface. Resultado terminal da API limpa a referência associada, e o banco MSW continua preservando a compra após refresh.

Axios e cleanup de autenticação existentes cancelam/descartam consultas da identidade anterior, incluindo recibos. Eventos nft.updated bloqueiam quotes antigas; order.updated só da sessão corrente invalida pedido e, ao terminar, carrinho/recibo. O detalhe pending também consulta GET a cada 2 segundos e oferece verificação manual; confirmed/declined não são aprovados pelo frontend. Estoque/reserva/baixa continuam exclusivamente no domínio existente. Reconciliação após criação/resultado invalida pedidos, carrinho, quote, catálogo e detalhes afetados, sem substituir uma versão mais recente do detalhe por resposta de criação antiga.

Frames de pagamento desktop/mobile e confirmação desktop foram consultados diretamente no editor após o conector informar quota Starter. Com autorização expressa, o SVG original thank-you 1 foi exportado sem mudar seu desenho e mantém 80 x 80. Paleta, fonte e estrutura existentes foram preservadas. Ações reais de revisão, conexão, expiração, erros e campos de snapshot exigem mais altura que o desenho; no mobile dados/itens são expansíveis. Somente carteiras autorizadas são mostradas e a identificação de provedor é tipográfica. Recibo é adaptado ao mobile; Etherscan informa que a referência é simulada. Capturas e detalhes em docs/PROMPT8.md e docs/screenshots/prompt8.

server-error/network-error/transient-error/out-of-order abrangem agora carteiras/pedidos, reutilizando o mesmo respond. Não foram criados servidor, contrato paralelo ou dependências. Os cenários anteriores de timeout pós-commit, pagamento pendente/recusado/confirmado e recusa de carteira são utilizados pela UI. Prompt 9 continua responsável por reconexão/replay/ordenação avançados; Prompt 10 pela edição completa de conta/carteiras. Baselines de pagamento foram adicionadas; auditoria visual da jornada completa, Lighthouse e deploy seguem as etapas finais.

## Tempo real robusto — Prompt 9

Este bloco substitui as notas anteriores de que recuperação/ordenação seriam futuras. AppShell é o único proprietário de synchronizeMarketplace, inclusive no diagnóstico. Mantém o singleton do cliente, namespace padrão e WebSocket/binding existentes. Connect envia a subscription verificada; server:ready apenas sinaliza disponibilidade do transporte. Três tentativas com atraso fixo de 1 segundo e sem jitter evitam falhas aleatórias nos cenários. O botão de retry reconecta ou repete a reconciliação REST; erro de sessão usa o AuthProvider existente.

EventVersions considera identidade estável e maior versão por tipo/recurso, comparada também aos snapshots em cache. IDs/versões são limitados a 1024 entradas; reset de identidade descarta esse contexto privado. Eventos repetidos ou antigos não invalidam recursos nem repetem anúncios. Eventos aceitos cancelam leituras afetadas e revalidam somente suas dependências. NFTs atualizam snapshots públicos suficientes, preservando metadados de detalhe; pedidos são confirmados por GET autorizado. Structural sharing impede REST antiga de substituir versões recentes; terminais não reabrem. Recibos não são recalculados pelo catálogo.

Reconexão marca recursos relevantes stale e reconsulta apenas queries ativas/habilitadas (catálogo, detalhe, sessão, favoritos, carrinho, pedidos atuais). Depois revalida quotes ativas. Não busca todos os NFTs/pedidos ou recursos inativos. O Prompt 10 inclui perfil/carteiras ativos nesta reconciliação. Dados confirmados permanecem visíveis, feedback não altera foco e a compra aguarda a barreira de recuperação e revalidação final. Filas assíncronas conferem lifecycle/token e descartam continuações privadas anteriores. Cleanup remove listeners específicos e desconecta o socket; o diagnóstico não mantém outro lifecycle concorrente.

Os controles MSW /__mock/realtime fecham conexões, seguram/liberam transporte e reenviam envelopes reais do histórico limitado a 256. Replay não muda domínio ou versões e continua autorizado. O mock registra somente eventos após persistir. BroadcastChannel encaminha esses envelopes entre runtimes de abas da mesma origem, sem chamar setters/cache e sem retransmitir em loop. O socket destinatário ainda passa pelo binding e filtro de sessão. Em navegadores sem BroadcastChannel, eventos locais e recuperação REST permanecem; não é um servidor entre computadores/perfis distintos.

Não há POST de compra em reconexão, evento ou refresh. Tentativas ambíguas conservam a chave/corpo do Prompt 8; como o envelope de pedido não tem chave idempotente, não se associa um pedido arbitrário à tentativa desconhecida. O resultado é recuperado explicitamente pela mesma operação. Testes de reconexão/pendência/timeout validam ausência de duplicação. Detalhes, cenários, limites e resultados em docs/PROMPT9.md. Prompt 10 e auditorias/deploy futuros não foram iniciados.

## Conta completa — Prompt 10

Este bloco atualiza as notas de etapas futuras dos Prompts 6–9. As rotas privadas /profile e /wallets agora contêm formulários reais e a navegação compartilhada também envolve favoritos/histórico. Somente campos permitidos são enviados. Perfil e carteira usam PATCH parcial dos campos editados; refetch não remonta nem apaga rascunho da carteira. Não há import de fixtures nem nova persistência da UI: GET/PATCH/POST passam pelo Axios e handlers MSW anteriores.

Perfil usa ['profile',token]; carteiras reutilizam ['wallets',token] do checkout. Mutation confirma o snapshot, cancela leituras anteriores, atualiza cache versionado e a sessão, descartando callbacks se o token mudou. Sessão/perfil/carteiras impedem regressões de versão. Após erro de atualização, rascunhos continuam editáveis; falha de refetch com snapshot preserva os formulários. Mutations não têm retries e bloqueiam submissões concorrentes do mesmo recurso. Avatar tem FileReader cancelável, decode antes da prévia e nenhum object URL persistente. Senhas não são colocadas em variables de mutation; ref transitório é consumido antes do POST, campos são limpos no sucesso e requests abortam no unmount/troca de sessão. A API preserva a sessão atual e revoga as demais.

Editar carteira encerra conexões com sua versão anterior no domínio. A UI cancela e invalida quote/sessão/carteiras e requer reconexão. Não sobrescreve seleção explícita válida do checkout; contexto incompatível bloqueia compra. A revalidação final existente impede envio com versão antiga. Recibos não são invalidados ou recalculados após perfil/carteira. A reconciliação REST do socket inclui agora queries ativas de perfil/carteiras, sem adicionar eventos ou um segundo socket.

Não existe DELETE /wallets nem operação atômica para trocar primary/secondary: cada slot permite cadastro quando vazio e edição. A opção visual Igual à principal não foi implementada porque conflita com a unicidade do endereço. ENS é opcional/nulo no domínio, sem dropdown decorativo de sufixo. Frames desktop 9:1238 e 9:1670 foram inspecionados no editor; o MCP recusou o original por acesso e a cópia por quota Starter. Sidebar, colunas, fonte e paleta seguem as referências; não há alegação de fidelidade pixel a pixel. Links fora do escopo foram omitidos; salvamentos de perfil/senha são separados para evitar sucesso parcial ambíguo. Após o refinamento pelo navegador, avatar vazio e ícones da navegação/controles usam exports originais do Figma; perfil/carteiras têm variantes ativa/inativa. Dez arquivos mantêm dimensões nativas, sem recoloração ou redesenho. Mobile, sem frame específico, empilha os formulários e mostra navegação com alvos de toque. Referências/capturas e validações constam em docs/PROMPT10.md. Sem dependências novas, blockchain, backend, auditoria ampla ou deploy nesta etapa.




## Correções da auditoria — Prompt 11

A auditoria não alterou contratos, regras de compra, persistência ou transporte dos mocks. Corrigiu o foco cíclico no drawer de filtros (Tab/Shift+Tab nos extremos), a posição dos quatro links ao redor do botão central mobile e o link protegido de perfil no rodapé.

Acessibilidade: os cards deixam o conteúdo nativo fornecer seu nome acessível, sem um aria-label que oculte preço/estado; breadcrumb e item do perfil incluem os respectivos textos visíveis. O avatar vazio tem papel de imagem, a informação de rede usa dt/dd válidos e o link de diagnóstico pertence a uma navegação nomeada. Os assets e sua geometria original foram preservados.

Oito baselines desktop/mobile de início, detalhe, carrinho e pagamento ficam junto das suites existentes. Apenas horário/ID da cotação são mascarados. Scans axe são exclusivamente de teste, sem exclusões para silenciar achados; teclado e foco também são exercitados. Limitações visuais, peso dos PNGs, resultados e requisitos ainda dependentes de Lighthouse/deploy estão discriminados em docs/PROMPT11.md. Baseline da aplicação não equivale a igualdade com um frame do Figma.

## Otimização e entrega — Prompt 12

As artes oficiais receberam WebP lossless em 1254 px e variantes de 320/640 px, sem alterar os PNGs recuperáveis em `assets/originals/figma`. A igualdade RGBA das quatro versões completas foi verificada por Sharp e canvas do Chromium. As variantes menores passam por redimensionamento Lanczos3 e codificação sem perda; não são declaradas pixel a pixel iguais ao arquivo de 1254 px. Hero mantém prioridade alta, imagens secundárias usam lazy loading e a ampliação usa a resolução completa. URLs legadas conhecidas no banco persistido são migradas sem reset de estoque, usuário ou pedidos; URLs customizadas são preservadas.

Roboto Mono foi convertida para WOFF2 mantendo mapas, métricas e contornos. Fontes originais, licença e um conversor opcional foram preservados; Python não participa do build. Os SVGs originais e pequenos PNGs não foram rasterizados nem redesenhados. Metadados de dimensões evitam a indefinição inicial de ícones; CSS continua controlando os tamanhos de exibição.

Router carrega detalhe, autenticação, carrinho, conta, checkout, pedidos e diagnóstico sob demanda. Estilos dos favoritos são compartilhados, pois também são necessários em acesso direto à conta. A Home permanece no shell para o fundo dos diálogos de autenticação. Preloads de módulos somente antecipam download/compilação; a execução do módulo com Socket.IO continua depois de `worker.start()`. Tailwind procura classes apenas em `src`, impedindo que relatórios Lighthouse/HTML inflem o CSS.

O MSW deixa assets estáticos passarem pelo primeiro handler, evitando testar cada arquivo contra todos os handlers de domínio. Nenhum endpoint REST ou evento foi removido. A primeira reconciliação é anunciada sem inserir/remover um banner que desloca todo o conteúdo; falhas e recuperação continuam visíveis. A área principal do detalhe reserva altura durante o carregamento, mantendo o rodapé fora da viewport até o conteúdo aparecer.

Não houve memoização indiscriminada, remoção de revalidações ou aumento artificial de cache privado. Cart/quote/perfil/carteiras continuam com políticas conservadoras; recibos são imutáveis; o socket único, cleanup, versões e recuperação REST permanecem cobertos pelos E2E.

Condições, resultados Lighthouse e limites da comparação visual estão em `docs/DELIVERY.md`. A publicação Vercel está configurada, porém foi adiada explicitamente pelo usuário para avaliar o build local. Portanto não há verificação pública nem alegação de entrega publicada.
