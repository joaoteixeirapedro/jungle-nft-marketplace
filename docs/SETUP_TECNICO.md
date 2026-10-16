# Setup técnico — Prompt 2

Concluído em 15/10/2026. A correção mais recente do usuário e o README oficial prevalecem: **REST e Socket.IO são simulados por MSW, sem backend separado**. O código inicial de servidor local e as dependências Express/Socket.IO Server foram removidos antes da validação final.

## Estrutura criada

- `src/app`: bootstrap assíncrono, providers Query e rotas TanStack Router.
- `src/routes`: início temporário, diagnóstico e not-found.
- `src/components`: shell neutro e Button shadcn/ui.
- `src/hooks`: conexão, evento, desconexão e limpeza de listeners.
- `src/services`: Axios centralizado e cliente Socket.IO tipado.
- `src/mocks`: handlers HTTP/WebSocket, fixtures e cenário inicial determinístico.
- `src/types`: contratos compartilhados; `src/lib` e `src/styles`: ambiente, utilitário cn e Tailwind 4.
- `public/mockServiceWorker.js`: worker oficial, também copiado para `dist/`.
- `tests/e2e` e dois configs Playwright: validação em desenvolvimento e build.
- `README.md`, `ARCHITECTURE.md`, `.env.example`, configs strict, ESLint e lockfile npm.

Sem diretórios de features vazios, backend, autenticação, catálogo, carrinho, checkout ou assets gerados. A análise do Figma permanece como referência histórica da etapa 1.

## Dependências e decisões

| Tecnologia | Versão instalada |
| --- | --- |
| React / React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| Vite / plugin React | 8.3.4 / 6.1.2 |
| Tailwind / plugin Vite | 4.3.3 |
| TanStack Router | 1.170.44 |
| TanStack Query | 5.104.3 |
| Axios | 1.20.0 |
| MSW | 2.15.0 |
| Socket.IO Client | 4.8.4 |
| @mswjs/socket.io-binding | 0.2.0 |
| Playwright | 1.64.1 |
| ESLint / typescript-eslint | 10.12.0 / 8.71.2 |

Suporte ao Button: Radix Slot, CVA, clsx e tailwind-merge; animações CSS disponíveis por tw-animate-css. shadcn/ui foi configurado manualmente e o registro do Button validado em dry run. CLI `4.21.5` é chamado sob demanda pelo script `ui:add`, sem permanecer na árvore instalada.

O gerador oficial create-vite foi usado como base. Sua pasta temporária foi removida. O gerador atual propunha oxlint; foi usado ESLint conforme solicitado. Dependências diretas têm versões exatas. A instalação final reportou zero vulnerabilidades.

## Validações efetivas

| Verificação | Resultado |
| --- | --- |
| TypeScript strict | Aprovado; aplicação, configs e testes. |
| ESLint | Aprovado, zero warnings. |
| Build | Aprovado; saída estática em `dist/`. |
| Playwright em desenvolvimento | 8/8 aprovadas: quatro testes, desktop e mobile. |
| Playwright no build/preview | 8/8 aprovadas: os mesmos testes contra arquivos compilados. |
| API REST | Resposta HTTP 200 exata; teste confirma `fromServiceWorker() === true` e exibição pela query. |
| Socket.IO + MSW | Cliente conectado, `server:ready` recebido, desconexão/reconexão aprovadas e nenhuma requisição de polling. |
| Rotas | Navegação, entrada direta, refresh e not-found aprovados nos dois ambientes. |

Os quatro testes verificam comportamento da aplicação, sem substituir REST por respostas no componente ou o socket por callbacks da UI. Relatórios HTML separados ficam em `playwright-report/development` e `playwright-report/production`.

## Incompatibilidades investigadas e resolvidas

1. O binding publicado exige MSW 2; a tentativa com MSW 3 foi recusada pelos peers. Foram selecionadas versões compatíveis, sem forçar a resolução.
2. O binding publicado exporta `toSocketIo`; exemplos de `SocketIo`/`protocol` da main não correspondem a essa distribuição.
3. O cliente deve ser importado depois de `worker.start()`, pois Engine.IO captura WebSocket no carregamento do módulo. O bootstrap agora importa a aplicação dinamicamente após MSW.
4. MSW 2.15 normaliza `/socket.io/` para `/` ao combinar handlers. O handler foi ajustado à origem/namespace padrão, mantendo o transporte Socket.IO normal no cliente.
5. Heartbeat anunciado pelo binding não é agendado automaticamente. O handler agenda ping Engine.IO e libera o intervalo no fechamento.

Esses detalhes estão registrados em `ARCHITECTURE.md` e precisam ser reconferidos em atualizações. Namespace padrão e eventos JSON/texto são o escopo validado; acknowledgements, rooms e binários não foram usados.

## Ambiente e execução

Node 24.19.0, npm 11.21.0, Windows e Chromium instalado pelo procedimento oficial do Playwright. O sandbox bloqueou a criação de processos usada pelo build; build e E2E foram executados com a permissão adequada e passaram. A falta de npm no PATH foi resolvida com o runtime disponibilizado, sem instalar ferramentas globais; há um atalho PowerShell no README.

```sh
npm run dev
```

Diagnóstico: `http://127.0.0.1:5173/dev/diagnostics`. Build local: `npm run build`, depois `npm start`, e acesso em `http://127.0.0.1:4173/dev/diagnostics`.

## Pendências e próximo passo

Base pronta para o **Prompt 3: contratos e APIs simuladas de domínio**, com cenários/reset. Faltam intencionalmente os fluxos completos, eventos versionados de negócio, sessão/isolamento e persistência. Assets e propriedades do Figma continuam pendentes para as etapas visuais. Deploy público, regressão visual de produto e Lighthouse permanecem previstos no desafio, fora deste setup.

Nenhum backend foi introduzido como substituição do MSW. Nenhum commit ou deploy automático foi realizado, e o README oficial remoto não foi alterado.
