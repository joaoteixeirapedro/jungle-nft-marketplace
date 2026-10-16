# Verificação da entrega

O [enunciado preservado](CHALLENGE_README.md) define os requisitos. Este documento reúne resultados verificáveis e pendências; os contratos e decisões estão em [API_CONTRACTS.md](API_CONTRACTS.md) e [ARCHITECTURE.md](../ARCHITECTURE.md).

## Aplicação e testes

O código inclui descoberta, autenticação, favoritos, carrinho, checkout, pedidos, perfil e carteiras. REST e eventos são interceptados pelo MSW; Socket.IO Client usa WebSocket com o binding, sem backend separado.

Os scripts de TypeScript, lint e build passaram, assim como os **12 testes de domínio e os 112 E2E**, sem retries, skips ou falhas. Foram 59 execuções desktop e 53 mobile. As suítes cobrem precisão monetária, catálogo, quantidades, sessão, isolamento, idempotência, estoque, recibos e versões, incluindo o login sobre a página de origem, estados de falha, reconexão, teclado e responsividade. A auditoria anexou 26 resultados axe, além de duas verificações de acessibilidade do login contextual.

O [relatório HTML](test-report/index.html) e o [resumo dos resultados](DELIVERY_RESULTS.json) identificam a última execução completa. As oito baselines versionadas ficam em `tests/e2e/audit.spec.ts-snapshots` e `tests/e2e/checkout.spec.ts-snapshots`; não foram atualizadas para esta organização. Novos relatórios e traces são gerados nos diretórios locais ignorados pelo Git. Traces de falha são retidos pelo Playwright quando houver falhas.

O [registro de checkout limpo](CLEAN_CHECKOUT.json) documenta uma execução anterior de `npm ci`, build e 12 testes de domínio, com o tree/hash do lockfile utilizado. Esse registro é histórico e não substitui os resultados da execução atual.

## Imagens e fontes

As quatro artes originais de 1254 px somavam 7.959.897 bytes; as versões WebP completas somam 5.387.774 bytes, redução de 32,31%, com comparação RGBA sem diferenças. O conjunto distribuído de 12 variantes (320/640/1254 px) soma 7.235.448 bytes; o navegador escolhe a resolução adequada com `srcset` e `sizes`. Hero tem prioridade alta, imagens secundárias usam lazy loading e zoom usa a resolução completa.

Roboto Mono passou de 237.008 para 114.064 bytes em WOFF2, mantendo mapas, métricas e contornos. SVGs e pequenos PNGs originais foram preservados. Imagens e TTF de origem permanecem em `assets/originals`, usados pelos scripts e fora do build.

Evidências preservadas: [pesos e hashes](assets/optimization.json), [fontes](assets/fonts.json), [inventário e comparação no Chromium](assets/verification.json), [comparativo de 450 px](assets/comparison-450.png) e [miniatura do checkout](assets/checkout-thumbnail-comparison.png). As capturas intermediárias referidas pelo inventário são saídas locais reproduzíveis por `npm run assets:verify`, com o preview aberto; não duplicam as baselines no versionamento.

## Lighthouse

As medições abaixo foram feitas em **16/10/2026, antes da alteração de login contextual**. Foram preservadas, sem atribuí-las a um build posterior. Cada relatório registra ambiente, configuração e versão; o [resumo](lighthouse/final-delivery/summary.json) identifica o hash do HTML medido. Há três execuções por página/perfil, com todos os 12 HTMLs e 12 JSONs exigidos pelo desafio.

| Página/perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP mediano | CLS mediano | TBT mediano |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 83 | 100 | 100 | 92 | 2,43 s | 0,00067 | 19,5 ms |
| Home mobile | 67 | 100 | 100 | 92 | 5,59 s | 0,00009 | 282 ms |
| Detalhe desktop | 96 | 100 | 100 | 92 | 1,34 s | 0,00009 | 0 ms |
| Detalhe mobile | 75 | 100 | 100 | 92 | 4,62 s | 0 | 183 ms |

Ambiente: Windows, Node 24.19.0, Lighthouse 13.5.0, Playwright 1.64.1 e Chromium 156.0.0.0. Build de produção servido em `127.0.0.1:4174`, cenário padrão dos mocks, armazenamento novo por execução e sem E2E concorrentes.

Perfis oficiais com throttling simulado: desktop 1350×940, DPR 1, CPU 1×, RTT 40 ms e 10.240 Kbps; mobile 412×823, DPR 1,75, CPU 4×, RTT 150 ms e 1.638,4 Kbps. Os JSONs contêm os parâmetros completos.

A meta de performance 90 foi atingida somente no detalhe desktop. Inicializar MSW/binding, executar React e consultar o catálogo antes de descobrir a imagem principal permanecem no caminho crítico. No mobile, os relatórios apontam execução de JavaScript/CPU e código não utilizado. As metas de acessibilidade, boas práticas e SEO foram atingidas nas quatro combinações. Não foram omitidos assets, APIs ou eventos para melhorar a pontuação.

O Service Worker faz a transferência de alguns recursos aparecer como zero no Lighthouse; `total-byte-weight` subconta esse tráfego. A verificação separada de imagens soma corpos recebidos pelo Chromium, por URL. Não representa o tráfego HTTP total comprimido. A auditoria de navegação não mede INP de usuários reais.

## Limites visuais e acessibilidade

As [referências do Figma](figma/README.md), os assets originais e as baselines permitem revisar a composição. Validações, estoque, cotação e feedback exigem adaptações de altura; perfil, carteiras e recibo possuem versões mobile adaptadas. Essas decisões estão na arquitetura. Não se declara igualdade integral de pixels com todos os frames.

A suíte cobre larguras intermediárias, movimento reduzido, operação por teclado, controle de foco, labels e erros. Axe complementa as verificações manuais; resultado sem violações nos cenários executados não constitui certificação WCAG.

## Pendências

- **Publicação:** o deploy obrigatório do desafio ainda não foi realizado. O repositório está no [GitHub](https://github.com/joaoteixeirapedro/jungle-nft-marketplace); `vercel.json` prepara build, fallback SPA e worker. Quando publicado, será necessário conferir rotas profundas, refresh, assets, sessão, compra e eventos na origem HTTPS.
- **Performance:** Home e detalhe mobile permanecem abaixo de 90 nas medições preservadas. Uma nova auditoria deve acompanhar uma entrega pública ou futuras mudanças de performance.
- **Fidelidade visual:** permanecem as adaptações e limitações de comparação documentadas, sem alegação de correspondência absoluta.

A demonstração não integra blockchain ou pagamentos reais. Os dados simulados são inspecionáveis no navegador e não constituem autenticação de produção.
