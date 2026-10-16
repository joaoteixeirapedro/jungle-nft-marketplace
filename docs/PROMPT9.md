# Prompt 9 — Tempo real e recuperação

16/10/2026. [README oficial](https://github.com/junglegaming/frontend-challenge/blob/main/README.md) relido integralmente antes das alterações, especialmente §§3–9. A base dos Prompts 2–8 foi inspecionada: MSW REST/WebSocket, binding Socket.IO, eventos versionados, domínio persistido, checkout idempotente e recibos já existiam. Não foram recriados e nenhuma dependência foi adicionada.

## A. Implementação

O mesmo singleton `socket.io-client` permanece em `services/socket/client.ts`. Usa somente WebSocket, sem upgrade/polling, com três tentativas automáticas de reconexão, intervalo fixo de 1 segundo e sem jitter. Depois das tentativas automáticas, a recuperação manual permanece disponível. Não há backend Express/Socket.IO, assinatura, extensão ou pagamento real.

O AppShell é o único proprietário do lifecycle da sincronização, inclusive na rota de diagnóstico. Cards, detalhes, carrinho e pedidos não abrem sockets. O diagnóstico observa o mesmo estado e seus botões controlam essa conexão. Um conflito encontrado ao alternar diagnóstico/marketplace foi corrigido removendo a gestão concorrente dos dois hooks.

`client:ready` envia apenas o token da identidade verificada. O mock associa a subscription e devolve `server:ready` com o contrato anterior. Esse sinal indica disponibilidade do transporte, não autenticação, replay de eventos ou confirmação de pagamento. Só então o sincronizador reconcilia REST. O MSW revalida a sessão antes de cada entrega privada, inclusive no replay; o frontend confere token capturado, userId e lifecycle ativo.

São removidos os listeners exatos de connect, disconnect, connect_error, server:ready, nft.updated e order.updated no cleanup. O socket é desconectado; callbacks/filas antigas ficam impedidos de continuar ao mudar a identidade ou desmontar. O registro do botão de retry também é removido sem apagar um callback de outro lifecycle. O mock limpa conexão e heartbeat no close.

### Identidade, versão e mensagens antigas

Contratos de negócio inalterados: envelope com id, resourceId, version, occurredAt, data e userId para pedidos. A versão do envelope deve corresponder ao recurso, ser inteira positiva e o identificador deve corresponder a data.id. Não se ordenam mensagens pelo horário local.

`EventVersions` guarda IDs processados e maior versão por tipo/recurso durante a subscription, limitado a 1024 entradas em cada estrutura. A comparação também consulta as versões já conhecidas nos caches: detalhe, catálogo/favoritos e linhas do carrinho para NFTs; detalhe/lista para pedidos. Uma versão já refletida em todos esses snapshots pode ser ignorada; um cache recente não esconde a necessidade de atualizar outro ainda defasado. Cada snapshot preserva sua maior versão. ID repetido ou versão já processada igual ou inferior não reaplicam efeitos, não notificam nem disparam novas consultas/mutations. Após descarte por limite, as versões dos snapshots em cache continuam protegendo recursos exibidos. Em refresh, a reconciliação REST reconstitui a autoridade, sem depender dessa memória.

Consultas têm proteção adicional ao receber REST: detalhe/listas preservam o snapshot de maior versão; carrinho rejeita uma resposta mais antiga por versão do carrinho ou NFT das linhas, sem recompor totais na UI. Pedidos terminais não voltam a pendente nem trocam de resultado por resposta contraditória. O snapshot do recibo continua independente do catálogo. Ao receber mudança, leituras afetadas são canceladas imediatamente; continuações assíncronas verificam identidade/lifecycle e versão antes de aplicar. Saltos de versão levam à leitura canônica REST, sem fabricar eventos intermediários.

## B. Integração e reconciliação

O caminho permanece: transação persistida no mock → envelope → binding MSW WebSocket/Socket.IO → cliente Socket.IO → sincronizador → TanStack Query → React. Não há setters/cache chamados pelo simulador ou pelos testes. Como abas da mesma origem compartilham o banco local, BroadcastChannel encaminha os envelopes já confirmados entre seus runtimes MSW. A entrega aos clientes continua passando pelo binding e pela autorização; não há escrita direta no frontend por esse canal e não se cria outra versão ou evento.

`nft.updated` atualiza snapshots públicos existentes quando suficientes, preservando creator/collection exclusivos de NftDetail. Invalida catálogo para recompor filtros/ordenação/paginação pela API, detalhe do NFT e favoritos que contêm o recurso. Só invalida carrinho/cotação quando o NFT está no carrinho ou sua composição ainda não é conhecida. O resumo e seus cálculos continuam inteiramente na API.

`order.updated` da conta corrente cancela/reconsulta o pedido específico e a lista da conta. Terminais também reconciliam carrinho e recibo correspondente. O evento não cria pedido, não liquida pagamento na UI e não reduz estoque localmente. A confirmação resulta do GET autorizado; as transições/reservas/recibos permanecem no domínio anterior. Replays de pendência não reabrem um terminal nem provocam outro envio.

Na reconexão, são marcadas obsoletas as queries de catálogo/NFT e da identidade corrente relacionadas a sessão, favoritos, carrinho e pedidos; somente as **ativas e habilitadas** são reconsultadas. Dados inativos ficam stale para a próxima visita, sem uma varredura de todos os endpoints. Coleções, criadores, perfil, carteiras e recibos imutáveis não são recarregados indiscriminadamente. Após os recursos base, as quotes ativas/habilitadas são revalidadas com os serviços existentes. Consultas já iniciadas são compartilhadas, sem criar loops de refetch.

As keys anteriores foram preservadas, inclusive token, parâmetros do catálogo, fingerprint/contexto da quote e orderId. O processamento assíncrono é serial e observado por uma barreira de sincronização. A conexão pode estar conectada enquanto a REST ainda está recuperando dados; nessa condição não é anunciada consistência nem liberada confirmação. Falha REST mantém o último snapshot e oferece recuperação, sem logout por uma simples queda do socket. Falha de verificação da sessão usa o retry existente do AuthProvider.

### Carrinho, checkout e pedidos pendentes

A interface mostra feedback discreto de indisponibilidade, atualização ou erro, usando paleta/tipografia existentes e região de status sem mudar o foco. Navegação pública permanece acessível. Carrinho/checkout bloqueiam avanço enquanto o transporte não está reconciliado; a revalidação final também confere a barreira imediatamente antes de avançar/enviar. Preço/estoque novos invalidam a revisão como anteriormente: mudanças materiais exigem nova confirmação, estoque insuficiente mantém itens e orienta correção.

Pedidos pendentes continuam com o GET periódico/manual do Prompt 8. A reconexão também reconsulta o detalhe ativo, recuperando uma decisão cujo evento se perdeu. A consulta em erro preserva o último estado conhecido em vez de apagar o pedido. Refresh consulta a mesma identidade de pedido. Nenhuma conexão, evento ou reconciliação executa POST /orders.

Uma tentativa com timeout continua guardando chave e payload exatos por usuário. Se orderId é conhecido, seu detalhe pode ser consultado; quando não é conhecido, o contrato de evento não contém a chave idempotente e não permite correlacionar com segurança qualquer pedido recebido à tentativa. Portanto, o evento invalida as consultas apropriadas e a recuperação explícita anterior repete a mesma chave/corpo. Não se escolhe arbitrariamente um pedido nem se inicia compra ao reconectar. Esse caso foi incluído nos testes de tempo real.

### Controles determinísticos

Os controles de negócio anteriores foram preservados. Adicionado somente recurso de demonstração/teste no namespace MSW existente:

| Endpoint | Comportamento |
| --- | --- |
| GET `/api/__mock/realtime` | held, número de conexões/subscriptions e histórico autorizado dos últimos envelopes. |
| POST `/api/__mock/realtime` `{action:'disconnect',hold:true}` | Fecha conexões com código 4001 e mantém a interrupção; true é o padrão. |
| Mesmo POST com `{action:'disconnect',hold:false}` | Interrompe sem manter bloqueio, permitindo validar reconexão automática. |
| Mesmo POST com `{action:'resume'}` | Libera novas conexões; não chama o cliente/cache diretamente. |
| Mesmo POST com `{action:'replay',eventId,copies:1,delayMs:0}` | Reenvia envelope real já registrado, sem mudar banco, ID ou versão; copies 1..5, atraso 0..5000 ms. |

O histórico é limitado a 256 envelopes, volátil por runtime, e filtrado pela autorização atual. Evento privado de outra conta gera 403 no replay; ID ausente gera 404. POST /__mock/reset limpa histórico/bloqueio além de restaurar o banco; depois de reset, autentique novamente/recarregue para descartar versões/caches do cenário anterior. Refresh mantém o banco e as compras, mas reinicia controles voláteis. Não há garantia de replay do transporte: REST é a recuperação obrigatória.

Para reproduzir: abra um NFT/checkout, use disconnect, altere preço/disponibilidade com PATCH /__mock/nfts/:id, libere com resume e use Tentar reconectar. Para pedido, escolha payment-pending antes de confirmar; desconecte, finalize com POST /__mock/orders/:id/settle, reconecte e observe GET recuperar o resultado sem POST de compra. Cenários slow/out-of-order/server-error continuam configurados pelo controle anterior.

## C. Testes e evidências

TypeScript, lint e build passaram. Testes de domínio/validação: **10/10 aprovados**, incluindo identidade/versão e proteção de estados terminais. Comandos:

```text
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node --test tests/data/*.test.ts
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts --workers=1
```

A regressão completa passou: **86/86 execuções aprovadas**, em **7,9 minutos**, incluindo as duas baselines de pagamento anteriores. Relatório HTML em `playwright-report/production/index.html`. Após um ajuste localizado para que um snapshot recente não oculte outro ainda defasado, TypeScript, lint e build passaram novamente e os **12/12 casos de tempo real passaram no código final**, em **1,7 minuto**, com relatório separado em `playwright-report/production-prompt9-final/index.html`. A suíte completa de 86 ocorreu antes desse último ajuste localizado; os casos afetados foram reexecutados depois, sem repetir desnecessariamente toda a suíte.

Seis grupos novos exercitam desktop/mobile: duplicatas e eventos antigos de NFT, REST atrasada e outra aba; reconexão automática/manual, falha REST e recuperação; checkout desconectado, preço/quote/estoque; pedido confirmado/recusado com evento perdido, replay de pendência/terminal e refresh; troca de conta SPA, autorização, múltiplas reconexões e diagnóstico; timeout com reconexão e recuperação da mesma chave/corpo. Os testes observam UI, requests, API e metadados do simulador; nunca chamam handlers do frontend ou QueryClient.

Inspeção adicional do feedback em build final: capturas `docs/screenshots/prompt9/offline-{390,768,1440}.png` e `recovered-390.png`. `verification.json` registra ausência de overflow nos três viewports, confirmação desabilitada durante a queda, recuperação para ready com botão de revisão habilitado e nenhum erro JavaScript. Não foram alteradas as baselines anteriores; elas passaram na regressão completa.

As execuções dirigidas encontraram sincronização incorreta no teste (navegação antes de MSW/logout terminarem), expectativa de replay após um refresh que havia apagado seu histórico volátil e o conflito real de lifecycle diagnóstico/marketplace. Os testes passaram a preservar a navegação SPA necessária ao cenário, e o código passou a ter um único proprietário de conexão. O caso de troca/diagnóstico foi reexecutado com **2/2 aprovados**; o caso público entre abas, duplicatas/REST, também **2/2**. Os demais novos cenários haviam passado em ambos os viewports. Os dez casos de setup/checkout desktop também passaram antes da regressão final. Não foram adicionados retries de teste nem removidas verificações anteriores.

## D. Conformidade com o README

Paráfrases dos requisitos efetivos do enunciado, com seções para consulta.

| Requisito do README | Status | Evidência |
| --- | --- | --- |
| §2/6 Socket.IO e MSW efetivos | Implementado | Cliente único, binding anterior, WebSocket sem polling; build estático testado. |
| §6 Mocks de rede e eventos configuráveis | Implementado | Controles de queda/replay com envelopes reais e cenários HTTP anteriores. |
| §7 NFT atualiza preço/disponibilidade | Implementado | Caches versionados e REST para detalhe/catálogo/carrinho; teste entre abas. |
| §7 Pedido apresenta confirmação/recusa | Implementado | Evento autorizado provoca GET e interface usa domínio/snapshot reais. |
| §7 Identidade, recurso e versão | Implementado | Contrato preservado, validação e comparação com versões do recurso, sem ocultar caches ainda defasados. |
| §7 Duplicatas e mensagens antigas | Implementado | Ledger limitado, nenhuma nova consulta para replay conhecido; invariantes de versão. |
| §4 Respostas REST obsoletas | Implementado | AbortSignal/cancelamento, callbacks por lifecycle e structuralSharing versionado. |
| §7 Reconexão com REST de recursos ativos | Implementado | server:ready inicia reconciliação de queries ativas/habilitadas e quote. |
| §3/7 Compra não usa cotação antiga | Implementado | Barreira de recuperação, invalidação e revalidação/revisão anteriores preservadas. |
| §3/5/7 Pedido perdido/refresh sem duplicação | Implementado | GET do pedido e recuperação idempotente anterior; sem POST automático. |
| §7 Pedidos terminais | Implementado | Domínio inalterado, proteção de snapshots REST e replay de pendência ignorado. |
| §3/4/7 Sessão e limpeza | Implementado | Autorização MSW, token/userId/lifecycle no cliente, keys e listeners isolados. |
| §8 Feedback acessível sem redesenho | Implementado | Status textual, retry, foco preservado e composição anterior mantida. |
| §9 E2E de tempo real e recuperação | Implementado | Seis grupos novos nos dois viewports; regressão completa 86/86 aprovada. |

## E. Limites e pendências

Mantidos namespace padrão e payloads JSON do binding 0.2.0; rooms, acks/binários e backend real não foram introduzidos. Heartbeat Engine.IO anterior permanece. BroadcastChannel é usado entre abas compatíveis da mesma origem/partição; sem esse recurso, cada runtime recebe eventos locais e recupera consistência por REST/foco/reconexão, sem prometer entrega instantânea entre abas. O mock não simula um servidor compartilhado entre computadores/perfis diferentes.

Não há fila durável de eventos ou promessa de recuperar todas as mensagens perdidas; a garantia é reconciliar o estado autoritativo. Histórico de teste não é log de negócio. Ledger limitado não substitui as versões dos recursos nem a autorização. Dados privados locais continuam inspecionáveis no contexto de uma demonstração, como já documentado no Prompt 3.

Perfil/avatar/senha/gestão de carteiras permanecem no Prompt 10; auditorias gerais e baselines das demais telas no Prompt 11; deploy/entrega no Prompt 12. Nenhuma dessas etapas foi iniciada. Não houve alteração de assets/desenho do Figma nesta etapa; os únicos ajustes visuais são feedback de conexão/recuperação. Não ficou identificada falha funcional impeditiva do Prompt 9; as limitações do ambiente de simulação estão explicitadas acima.

Commit não criado: identidade Git local ausente. Mensagem sugerida: `feat: implement realtime synchronization and socket recovery`.

## F. Arquivos principais

- `src/services/socket/{client.ts,synchronize.ts,state.ts}`: transporte existente, coordenação da sincronização e estado observável.
- `src/hooks/{use-marketplace-realtime.ts,use-realtime-diagnostics.ts}`: lifecycle único e leitura do diagnóstico.
- `src/lib/resource-versions.ts`: versões, duplicatas e proteção de snapshots/terminais.
- `src/services/api/{catalog.ts,cart.ts,checkout.ts,favorites.ts}`: integração das proteções no cache existente.
- `src/components/layout/{app-shell.tsx,realtime-status.tsx}` e `src/styles/globals.css`: propriedade única da conexão e feedback discreto.
- `src/routes/{cart.tsx,checkout.tsx,orders.tsx}`: barreira de recuperação e preservação de pedido em falha de consulta.
- `src/mocks/handlers/{realtime.ts,controls.ts}`, `src/mocks/state/{realtime-runtime.ts,store.ts}`: transporte, controles e encaminhamento entre abas.
- `tests/data/realtime.test.ts`, `tests/e2e/realtime.spec.ts`: dois testes de invariantes e seis grupos E2E.
- `README.md`, `ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, este relatório e `docs/screenshots/prompt9/`.
