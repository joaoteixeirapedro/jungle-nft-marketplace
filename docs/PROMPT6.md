# Prompt 6 — Autenticação, sessões e proteção de rotas

## Implementação

Fontes: README oficial completo, frames Figma da cópia do `.fig` fornecido e contratos da etapa 3. Não foi criado backend, outra persistência ou dependência.

- `/login` e `/register`: formulários reais com Axios/TanStack Query, labels, validação associada, foco no primeiro erro, mostrar/ocultar senha, loading, bloqueio de envio duplicado, conflito 409 e mensagens distintas para credenciais/validação/rede/resposta inesperada. O e-mail é preservado nas falhas. Cadastro autentica automaticamente porque a API existente retorna `SessionResponse`.
- Regras da API: username com 3–32 letras/números/underscore, normalizado para minúsculas; e-mail válido até 254 caracteres; cadastro com senha de 8–128 caracteres contendo letra e número, com confirmação. Login aceita a senha fornecida e deixa a verificação para a API. Nenhum requisito arbitrário de senha foi adicionado.
- Formulários abortam requests ao sair; um resultado de login cancelado ou de sessão anterior não grava token. Dados do formulário são capturados antes de desabilitar os campos e a referência temporária é liberada no envio. As variables da mutation não armazenam credenciais; mutation usa `gcTime: 0`. Senhas não vão a URL, logs, storage ou cache de credenciais.
- `AuthProvider` possui uma única query global de sessão. Identidade é derivada da API e do token existente em `sessionStorage`, sem contexto com outra cópia persistida do usuário. Estados: checking, authenticated, anonymous, error e signing-out. GET de sessão recupera o usuário após refresh. Resposta malformada não autentica.
- Inicialização e guard compartilham a mesma Query. Header mostra verificação, sem declarar visitante enquanto a sessão está pendente. Conteúdo privado só monta após confirmação. Falha temporária mantém o token, bloqueia a área privada e permite retry; não significa logout.
- Layout protegido pelo `beforeLoad` do TanStack Router para `/favorites`, `/profile`, `/wallets`, `/orders`, `/orders/$orderId` e `/checkout`. Entrada direta e refresh seguem a mesma proteção. Nenhum recurso privado é consultado quando não há token.
- Retorno ao destino interno validado, conservando path, busca e fragmento. São rejeitados URLs externos, barras invertidas, controles, auth loops e rotas desconhecidas. Parâmetros sensíveis são removidos. Cancelar login de uma área privada retorna ao mercado, evitando ciclo de redirecionamento.
- Favorito de visitante abre o login e retorna ao contexto anterior. Não há mutation automática após autenticação: o usuário confirma no botão. Favoritos continuam otimistas, com rollback, cache e persistência por conta; `/favorites` permite consultar/remover os próprios itens.
- `401` privado invalida somente a sessão que originou o request. Erros concorrentes produzem uma transição central, com login e aviso único de expiração/invalidez. `403` mostra falta de permissão sem logout. Credenciais erradas no login não são tratadas como expiração de outra sessão.
- Há consulta periódica de sessão a cada 30 s, revalidação ao focar a janela e timer até `expiresAt`. Na simulação, expiração pelo relógio do mock também é detectada pela próxima consulta/operação. O destino é conservado, mas nenhuma cotação, compra ou pedido é aprovado automaticamente.
- Logout envia DELETE à API e exige o status 204 definido no contrato antes de considerar a revogação confirmada. Limpa token, leituras/mutations privadas e inscrições. Na falha de rede/503 ou resposta inesperada, encerra a sessão local e informa que a API não confirmou a revogação; a sessão remota simulada pode permanecer até expirar. O cenário de sucesso comprova a revogação remota.
- Troca de conta cancela queries e requests Axios da identidade anterior, remove cache privado e registros de mutations antigas, e descarta respostas atrasadas. Queries públicas continuam reutilizáveis. Recursos privados têm o token na query key.
- Socket.IO existente, somente WebSocket/MSW/binding: a conexão é renovada ao mudar a identidade verificada e seus listeners são removidos. `client:ready` recebe o token atual. `order.updated` só invalida recursos quando token e userId correspondem à sessão ativa. Não foram implementados replay ou reconciliação avançada do Prompt 9.

## Integração e política de cache

| Operação | Endpoint existente |
| --- | --- |
| Cadastro | `POST /api/accounts` |
| Login / consulta / logout | `POST`, `GET`, `DELETE /api/session` |
| Expiração determinística | `POST /api/session/expire` |
| Favoritos | `GET /api/favorites`, `PUT/DELETE /api/favorites/:id` |
| Entradas privadas mínimas | `GET /api/profile`, `/wallets`, `/orders`, `/orders/:id`, `/cart` |

Sessão: `['session', token]`, staleTime 15 s, sem retry automático, refetch no foco e intervalo 30 s. Demais queries mantêm a política existente: staleTime 30 s, retry limitado para falhas de rede/5xx, sem retry de 4xx. Mutations não repetem automaticamente. Query functions consomem AbortSignal; Axios também cancela requests privados ao mudar token. Callbacks de favoritos conferem a identidade antes de reconciliar.

Os cenários existentes de rede, 503 e falha transitória também cobrem `/session` e `/accounts`. Foi adicionado somente `malformed-session` para validar uma resposta inesperada sem autenticar ou persistir token inválido. Controles/reset continuam determinísticos e centralizados no MSW.

## Figma e acessibilidade

- Desktop Login `9:115`, Cadastro `9:1022`, ambos 1440 × 1981; mobile Login `16:1022`, Cadastro `16:1228`, 414 × 896.
- Desktop: painel 500 px, login 600 px de altura/top 160 px, cadastro 656 px/top 158 px, margens internas, tabs, divisores, botões e borda inferior dourada. O fundo reutiliza a Home/API existente e fica inert, sem duplicar o catálogo para imitar dados estáticos do protótipo.
- Mobile: página inteira, padding 28 px, wordmark 32 px, formulário e campos 50 px, CTA 60 px, senha visível opcional e navegação entre login/cadastro. Diálogo rola em viewport curto e não corta campos pelo teclado.
- Native dialog controla foco/Escape; fechar volta ao contexto público e tenta restaurar foco em um acionador visível. Foco inicial, áreas de toque e fechamento mobile são ajustes funcionais explícitos. Labels dos campos são visualmente ocultos, mantendo os placeholders do Figma.
- Logos Google/Facebook, olho, fechar e divisores são exports oficiais locais; as partes do Google conservam dimensões nativas e posição de cada camada. Social e recuperação de senha mostram aviso de indisponibilidade; não simulam OAuth ou envio de recuperação inexistente.
- Diferenças: formulários começam vazios, sem senha fictícia pré-preenchida; mensagens/estados não desenhados foram acrescentados; botões sociais mobile têm 44 px; fundo desktop usa conteúdo/estoque reais e a Home já construída. Não há alegação de igualdade de pixels com o fundo estático do Figma.
- Referências em `docs/figma/{login,register}-{desktop,mobile}.png`; capturas reais em `docs/screenshots/prompt6/`, nos tamanhos 390, 414, 768 e 1440. Inspeção confirmou dimensões do painel, ausência de overflow, arquivos carregados e ausência de erros JavaScript.

## Verificações

```sh
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node --test tests/data/*.test.ts
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts
```

Sete testes de domínio/validação. E2E: seis grupos de autenticação, executados em desktop e mobile, acrescentados aos 38 testes existentes (50 execuções na suíte). Cobrem cadastro/conflito/validação/senha não persistida, login inválido/rede/resposta malformada/cancelamento, refresh/logout revogado, todas as entradas privadas e retorno seguro, 403, favoritos entre Alice/Bruno/Alice, expiração ao operar e no refresh, falha transitória sem logout, logout sem confirmação remota, request antigo e eventos privados por sessão.

O teste de eventos usa a API existente apenas para preparar pedidos pendentes. A atualização observada na interface passa pelo cliente Socket.IO: a conta B não reconsulta seus pedidos com um evento da conta A e reconsulta quando recebe seu próprio evento. Não há setters de UI ou cache acionados pelo teste.

Resultado: TypeScript, lint e build aprovados, 7/7 testes de domínio/validação e 50/50 execuções Playwright aprovadas. A execução final usou `--workers=1` nesta máquina. Uma tentativa anterior teve 49/50 por uma asserção transitória redundante de skeleton no teste de busca; ela foi removida, mantendo a verificação de resultados fora de ordem e a cobertura específica de loading/reduced motion. Relatório HTML: `playwright-report/production/index.html`.

A verificação visual adicional confirmou geometrias SVG intrínsecas sem substituições, funcionamento de mostrar/ocultar senha, retorno de foco ao fechar o diálogo auxiliar e rolagem em viewport de 600 px de altura. O cancelamento do login mobile aberto por um favorito também retornou ao NFT com foco no botão. Nenhum erro JavaScript ou overflow foi observado. Após o último ajuste de validação do status 204, outras duas execuções direcionadas de logout passaram em desktop/mobile, incluindo resposta inesperada e falha transitória. TypeScript, lint e build foram executados novamente e passaram.

## Conformidade com o README

| Requisito do README | Status | Evidência |
| --- | --- | --- |
| §3: cadastro/login/logout e sessão integrados à API | Implementado | POST accounts/session, GET/DELETE session e formulários funcionais. |
| §3: autenticação nas áreas privadas | Implementado | Guard Router e layout que aguarda confirmação; APIs continuam autorizando recursos. |
| §3: refresh e retomada após expiração | Implementado | Token existente, query de sessão, 401/timer e destino interno validado. |
| §3/4: isolamento e limpeza de dados/subscriptions | Implementado | Chaves por token, cancelamento, descarte e Socket.IO da sessão atual. |
| §3: validação e credenciais sem senha em claro | Implementado | Regras existentes, PBKDF2 preservado, form sem persistência/logs de senha. |
| §4: Query/Axios, estados e respostas obsoletas | Implementado | Consulta global, mutations, erros diferenciados e abort/discard. |
| §6/7: MSW e Socket.IO compatíveis | Preservado/integrado | Mesmo binding e transporte, listener privado filtrado, sem servidor. |
| §8: desktop/mobile, teclado, labels e feedback | Implementado no escopo | Frames oficiais, native dialog, validação e verificação responsiva. |
| §9: testes de autenticação, expiração e troca de usuário | Implementado | Casos UI e rede reais em ambos os projetos Chromium. |

## Limites e arquivos

Não houve avanço ao Prompt 7. Perfil/carteiras/pedidos/checkout têm uma entrada protegida com identidade e resumo reais, acompanhados de texto explícito sobre a etapa pendente; não apresentam edição, pagamento ou confirmação fictícios. Os fluxos completos pertencem aos Prompts 7, 8 e 10. Reconexão avançada, auditorias e deploy continuam nos Prompts 9, 11 e 12. OAuth/recuperação de senha não possuem endpoints no contrato atual.

Arquivos principais: `src/routes/{auth.tsx,account.tsx}`, `src/features/auth/*`, `src/hooks/use-logout.ts`, `src/lib/{auth-navigation.ts,session.ts}`, `src/services/api/{auth.ts,client.ts}`, `src/app/{router/index.ts,providers/app-providers.tsx}`, `src/components/layout/{app-shell.tsx,site-header.tsx}`, `src/features/favorites/favorite-button.tsx`, `src/hooks/use-marketplace-realtime.ts`, `src/mocks/{http.ts,state/model.ts}`, `tests/e2e/{auth.spec.ts,nft-details.spec.ts,catalog.spec.ts}`, `tests/data/auth.test.ts`, assets e documentação.

Commit pretendido: `feat: implement authentication and protected routes`. A identidade Git (`user.name` e `user.email`) continua ausente; nenhum commit foi criado com identidade inventada.
