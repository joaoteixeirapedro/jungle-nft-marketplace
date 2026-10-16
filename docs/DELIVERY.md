# Validação da entrega

O build final da aplicação foi validado em **16/10/2026**. O [enunciado](CHALLENGE_README.md), os [contratos](API_CONTRACTS.md) e a [arquitetura](../ARCHITECTURE.md) descrevem o escopo e a implementação. A preparação da entrega atualizou configurações de publicação, sincronização dos testes existentes e documentação/evidências. Código da aplicação, aparência, funcionalidades, mocks, imagens de referência dos testes e perfis Lighthouse foram preservados.

## Publicação em produção

- Aplicação: [jungle-nft-marketplace-xi.vercel.app](https://jungle-nft-marketplace-xi.vercel.app).
- Código: [repositório na branch de entrega](https://github.com/joaoteixeirapedro/jungle-nft-marketplace/tree/codex/marketplace-delivery).
- Deploy de produção na Vercel: [detalhes do build](https://vercel.com/joaoteixeirapedro/jungle-nft-marketplace/BnqMMUXhDhSkVKppViN6QsHrWkLi).

A Vercel instalou as dependências pelo lockfile com `npm ci`, auditou 377 pacotes sem vulnerabilidades reportadas e executou `npm run build`. O preset Vite serve `dist/` com fallback de rotas da SPA. As três variáveis públicas `VITE_*` estão configuradas para produção; credenciais e arquivos locais de ambiente ficam fora do Git e do envio. Não é necessário backend, serviço privado, extensão de carteira ou gateway de pagamento.

Verificações sem autenticação validaram dez rotas principais e os **161 arquivos publicados**, incluindo imagens, fontes, JavaScript, CSS e o worker MSW. Todos retornaram HTTP 200 e corresponderam ao SHA-256 do build local. Os acessos diretos entregam a SPA; os testes no navegador verificam refresh e rotas inexistentes. O worker usa `Cache-Control: no-cache`. Os [resultados estruturados](DELIVERY_RESULTS.json) preservam as verificações de rotas, hashes, identificação do build, ambiente e estatísticas de execução.

A execução E2E pública verificou Home/catálogo, cadastro/login, recuperação de sessão após refresh, favoritos, carrinho/cupons, checkout, recibos confirmados, falhas de pagamento/idempotência, perfil/carteiras e atualizações/reconexão Socket.IO. O cliente Socket.IO usa WebSocket através do MSW e do binding do protocolo no navegador. Não há servidor Socket.IO persistente na Vercel. O estado é local ao navegador, com sincronização entre abas da mesma origem por `BroadcastChannel`.

## Testes

TypeScript, lint e build de produção foram aprovados. Os **13 testes de domínio passaram**, sem falhas ou testes ignorados. A execução final completa da suíte E2E existente passou nos dois ambientes:

| Ambiente | Desktop | Mobile | Aprovados | Falhas | Ignorados | Instáveis | Repetições |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Preview local de produção | 59 | 53 | 112 | 0 | 0 | 0 | 0 |
| URL pública da Vercel | 59 | 53 | 112 | 0 | 0 | 0 | 0 |

Cada execução usa Chromium com viewports de 1440×900 no desktop e 390×844 no mobile, dois workers, contextos de navegador isolados, handlers REST/MSW e o cliente Socket.IO real. Os testes também inspecionam 768 px e larguras intermediárias. Cada suíte completa anexa 26 verificações axe e realiza duas verificações adicionais de acessibilidade no login contextual. As oito imagens de referência da regressão visual permanecem inalteradas. Relatórios: [HTML local](test-report/index.html) e [HTML público](test-report/public/index.html).

A primeira execução pública passou em 109/112 testes. Três falhas mostraram que os testes mudavam cenários ou navegavam antes da reconciliação inicial Socket.IO/REST. Os testes existentes passaram a aguardar a conta renderizada, o estado reconciliado e a resposta da remoção de cupom. As verificações REST após refresh também aguardam o catálogo; o auxiliar de reconexão verifica a recuperação automática quando o botão opcional desaparece. As asserções e verificações do console foram mantidas, as repetições continuam em zero e os mocks/comportamentos da aplicação não foram alterados. As seis verificações desktop/mobile inicialmente afetadas passaram antes das novas execuções completas. Os traces de diagnóstico estão preservados: [sessão](test-report/public/initial-failures/session-readiness.zip), [cupom](test-report/public/initial-failures/coupon-readiness.zip) e [navegação](test-report/public/initial-failures/navigation-readiness.zip). Abra-os com `npx playwright show-trace` seguido do caminho do arquivo.

O registro histórico de checkout limpo foi removido por descrever um build anterior. A instalação limpa da Vercel e o build atual estão registrados acima e em `DELIVERY_RESULTS.json`. Relatórios antigos foram substituídos nos diretórios existentes; permanecem os HTML finais local/público e os três traces úteis de diagnóstico.

## Lighthouse

O script existente executou **três medições por página e perfil** no build público de produção, com armazenamento inicial limpo, mocks padrão, fontes/imagens reais e sem E2E concorrentes. Os perfis oficiais desktop/mobile e todas as configurações de auditoria foram preservados. Após uma interrupção inesperada do driver do navegador depois das três medições de Home desktop, as combinações restantes foram executadas separadamente pelo mesmo script. Nenhuma medição bem-sucedida foi descartada ou escolhida pela pontuação. Os 12 HTML e 12 JSON substituem as evidências anteriores em [lighthouse/final-delivery](lighthouse/final-delivery/); o [resumo](lighthouse/final-delivery/summary.json) registra ambiente, avisos, medições individuais, medianas e o hash correspondente do build.

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP mediano | CLS mediano | TBT mediano |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home / desktop | 100 | 100 | 100 | 92 | 0,56 s | 0,00014 | 1,5 ms |
| Home / mobile | 94 | 100 | 100 | 92 | 2,65 s | 0,00000 | 113,0 ms |
| Detalhe do NFT / desktop | 100 | 100 | 100 | 92 | 0,59 s | 0,00003 | 0,0 ms |
| Detalhe do NFT / mobile | 94 | 100 | 100 | 92 | 2,64 s | 0,00000 | 128,0 ms |

Ambiente: Windows 10.0.19045, Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz, seis processadores lógicos, 16 GiB de RAM, Node v24.19.0, Playwright 1.64.1, Lighthouse 13.5.0 e Chromium 156.0.0.0. Desktop: 1350×940, DPR 1, CPU 1×, RTT 40 ms e 10.240 Kbps. Mobile: 412×823, DPR 1,75, CPU 4×, RTT 150 ms e 1.638,4 Kbps, com limitação simulada. As condições completas estão em cada JSON. A origem pública acrescenta as condições reais de distribuição/rede ao build de produção.

As quatro combinações atingiram as metas do enunciado: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95 e SEO ≥ 90. Nenhum asset ou funcionalidade foi omitido, e essa etapa de entrega não fez alterações de performance ou design. A interceptação pelo Service Worker pode subestimar transferências de rede no Lighthouse; o manifesto público de hashes confirma a disponibilidade de todos os arquivos reais do build.

## Assets, acessibilidade e limitações

As artes originais, fontes locais, [evidências de otimização](assets/) e [referências do Figma](figma/README.md) foram preservadas. A comparação dos arquivos publicados identifica o build final; inventários históricos de assets documentam sua preparação. Layout, tipografia, variantes de imagem e interações não foram editados.

Teclado, foco, formulários, movimento reduzido, zoom/refluxo, larguras responsivas e verificações automatizadas de acessibilidade passaram nos cenários E2E registrados. Essas verificações não equivalem a certificação WCAG completa nem a igualdade de pixels com todos os frames do Figma. As adaptações estão documentadas em [ARCHITECTURE.md](../ARCHITECTURE.md#figma-acessibilidade-e-assets).

As limitações são as imagens de referência específicas de Windows/Chromium e a simulação local ao navegador, sem estado compartilhado entre dispositivos. A publicação e as verificações públicas essenciais foram concluídas nas execuções registradas. Transações, credenciais, conexões de carteira e pagamentos são fictícios. Os comandos para reproduzir a validação estão no [README principal](../README.md#comandos-de-validação).
