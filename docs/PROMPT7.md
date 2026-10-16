# Prompt 7 — Carrinho, cupons e cotação

## Entrega funcional

Rota pública `/cart`, conectada ao header desktop/mobile e às ações de compra dos detalhes. A seleção de edição e quantidade existente foi preservada. COMPRAR/Comprar NFT e o botão mobile de carrinho enviam POST antes de navegar; erros não apresentam sucesso. Home e catálogo continuam levando ao detalhe para selecionar a edição, sem escolher uma edição silenciosamente.

`CartPage`, `CartLine`, skeleton de itens/resumo e sugestões reutilizam Button shadcn, NftImage, NftCard, tokens e fontes locais. Linhas têm imagem, coleção consultada pela API, edição, preço unitário, quantidade, subtotal e remoção. O indicador do header soma quantidades confirmadas, sem valor privado durante a verificação da sessão. Carrinho vazio não apresenta total ou avanço.

As quantidades são inteiras entre 1 e o menor valor entre estoque e limite já existente de 999. O campo aceita rascunho local, salva com Enter/blur, informa entradas inválidas e impede avanço enquanto houver edição não confirmada. Botões são bloqueados durante mutations. Uma edição adicionada novamente consolida quantidade no mesmo identificador `nftId:editionId`; edições diferentes permanecem separadas. Remoção só muda o estado após confirmação e restaura foco em outro controle ou no acesso ao catálogo.

WELCOME10 e EXPIRED são as fixtures preexistentes; não foram criados cupons, taxas ou porcentagens na UI. A aplicação permite aplicar, substituir e remover códigos; rejeições mantêm o último estado confirmado. Cupom invalidado/expirado na API bloqueia cotação e avanço até correção ou remoção.

## Integração e política de cache

| Operação | Endpoint utilizado |
| --- | --- |
| Carrinho e reconciliação | GET `/api/cart` |
| Adicionar edição/quantidade | POST `/api/cart/items` |
| Alterar quantidade | PATCH `/api/cart/items/:id` |
| Remover edição | DELETE `/api/cart/items/:id` |
| Aplicar/substituir cupom | PUT `/api/cart/coupon` |
| Remover cupom | DELETE `/api/cart/coupon` |
| Obter/revalidar cotação | POST `/api/quotes` |
| Imagem e coleção dos itens | GET `/api/nfts/:id` |
| Sugestões de descoberta | GET `/api/nfts` com parâmetros |

Não houve recriação de handlers, fixtures, banco, contratos ou utilitários monetários. `src/mocks/http.ts` apenas estende os cenários existentes de 503/rede/recuperação/fora de ordem a carrinho e quotes, incluindo DELETE. O cenário 422 já abrangia suas mutations POST/PUT/PATCH. Os controles de cenário continuam fora dos serviços de produção.

Queries de carrinho usam `['cart', token]`; visitante usa token nulo e o X-Guest-Id existente. A entrada protegida de checkout também compartilha essa chave. Queries de cotação usam `['quote', token, fingerprint]`; a assinatura inclui versão do carrinho, itens, versões dos NFTs, preços, disponibilidade, cupom e problemas. Atualizações de NFT não precisam mudar cart.version para invalidar a cotação.

Mutations usam a identidade capturada, scope serial por carrinho, bloqueio síncrono de envio duplicado, cancelamento de leituras e reconciliação GET ao terminar, inclusive após falha ambígua. Não há retry automático de adição que possa duplicar quantidade. Leituras de carrinho/cotação têm staleTime 0 e retry false; recuperação é explícita. Dados confirmados são preservados e sinalizados quando uma revalidação falha, com avanço bloqueado.

Axios passou a cancelar/descartar também requests de carrinho/quote do visitante ao mudar a identidade. O cleanup privado do Prompt 6 remove queries/mutations anteriores e os componentes de apresentação são remontados por identidade, descartando rascunhos e aceite anteriores. Persistência continua exclusivamente no banco MSW; sessionStorage mantém apenas a identificação preexistente. Login incorpora o carrinho visitante uma vez e mostra ajustes de estoque devolvidos em cartMerge. Logout não transfere itens privados para o visitante ou para outra conta.

## Cotação e valores

Totais exibidos vêm de Quote: subtotalEth, discountEth, networkFeeEth e totalEth. Valores de linha vêm de CartLine. O frontend não recalcula taxas/descontos/totais e não usa floats financeiros. Strings preservam até 18 casas, calculadas no domínio com inteiros em wei. A cotação inicial utiliza o contexto padrão Ethereum da API e informa a rede de referência; rede/carteira serão selecionadas e recotadas no Prompt 8.

Mutation, alteração de cupom, evento de estoque/preço ou erro invalidam o avanço. Um novo snapshot exige revisão/aceite explícito dos valores antes de continuar. O prazo visual usa expiresAt da API, sem prazo criado no frontend; ao expirar, a tela bloqueia e oferece nova cotação. Avançar sempre faz GET do carrinho e nova POST de quote, comparando o snapshot com o exibido. Mudanças voltam à revisão; o request de revalidação também está sob Query/AbortSignal e pode ser cancelado por um evento.

Visitante segue para login com retorno seguro a `/cart`, onde o carrinho já incorporado recebe uma cotação da nova identidade e nova revisão. Usuário autenticado com snapshot válido segue pelo Router para `/checkout`. Esta continua sendo somente a entrada protegida existente: nenhum pedido, pagamento, seleção/conexão de carteira ou recibo é acionado nesta etapa.

`nft.updated` continua passando pelo socket.io-client, transporte WebSocket e binding do MSW. O listener existente cancela cotações antigas e reconsulta carrinho, além dos recursos anteriores. Estoque insuficiente/esgotamento não remove itens ou reduz silenciosamente quantidades no carrinho: informa a disponibilidade e exige correção/remoção. Não há segundo backend ou segundo mecanismo de eventos. Replay/reconexão avançados permanecem no Prompt 9.

## Figma e acessibilidade

Frames consultados na cópia de trabalho fornecida pelo usuário: desktop `11:1278` (1440 × 1754), mobile `16:360` (414 × 896). O README oficial foi lido integralmente antes de implementar. Referência desktop em `docs/figma/cart-desktop.png`; capturas reais em `docs/screenshots/prompt7/cart-{390,414,768,1440}.png`.

A skill figma-design-to-code foi lida e get_design_context foi solicitado com screenshot, mas o conector retornou limite de chamadas do plano Starter. Os frames foram então consultados no próprio editor; a referência desktop foi obtida pela exportação PNG já existente. A revisão automática recusou inicialmente adicionar configuração de exportação porque alteraria metadados do documento. Após concluir o fluxo e seus testes, o usuário autorizou expressamente a exportação do ícone de remoção. Foi adicionada somente uma configuração SVG na instância Iconly/Curved/Delete do primeiro item desktop; o export original está em public/assets/figma/cart-delete.svg (24 × 24). Nenhum desenho foi alterado, nenhum plano comprado. A tentativa anterior de copiar SVG para o clipboard não retornou conteúdo e não gerou um asset artificial.

Composição mantida: lista/tabela e resumo lateral desktop, cards mobile, painel de resumo arredondado, cupom e CTA largo, referências de tipografia/paleta e rodapé existente. Imagens de NFT continuam dinâmicas. SVGs de voltar e quantidade são exports oficiais existentes com dimensões intrínsecas; alvos de toque usam wrappers. Fonte e imagens são locais.

Diferenças conhecidas: informações reais de coleção, edição, disponibilidade, preço unitário, subtotal, validade e revisão tornam os cards/resumo mais altos que o desenho estático. Os dados vêm das fixtures existentes e não dos valores ilustrativos dos frames. Não foram inventados slides/paginação para as sugestões. A remoção utiliza agora o SVG original, com nome acessível e alvo de toque de pelo menos 44 px. A inspeção visual ocorreu pelo editor devido ao limite do conector; não se declara equivalência pixel a pixel nem extração integral por get_design_context.

Semântica de lista/aside, labels, spinbutton com limites, mensagens associadas, live regions, foco visível, estados de atualização, bloqueios explicados e shimmer/reduced motion fazem parte da tela. A implementação permite rolar conteúdo adicional no mobile. A verificação responsiva cobre 390, 414, 768 e 1440 px.

## Verificação

Comandos executados no ambiente Windows com Node 24:

```text
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node --test tests/data/*.test.ts
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts --workers=1
```

Resultado: TypeScript, lint e build aprovados; **7/7 testes de domínio e 62/62 execuções Playwright aprovadas** (4,5 minutos, workers=1). Relatório HTML completo: `playwright-report/production/index.html`. Seis grupos de carrinho em desktop/mobile foram somados às 50 execuções anteriores. Depois, mais **2/2 execuções direcionadas** passaram ao estender o caso Socket.IO com alteração de preço durante a resposta atrasada da revalidação; a navegação permaneceu no carrinho até nova revisão.

A revisão manual identificou uma falha de foco após remoção. O callback de confirmação passou ao lifecycle da mutation (que continua após desmontar a lista ao remover o último item), e o foco agora aguarda o fim da reconciliação no componente da página. **Outras 2/2 execuções direcionadas** passaram em desktop/mobile, verificando foco no próximo controle e no link do estado vazio. TypeScript, lint e build foram repetidos após esse ajuste e passaram. A regressão completa de 62 ocorreu antes desse ajuste localizado; não foi repetida desnecessariamente.

Após a exportação autorizada, o botão de remoção passou a usar o SVG original. TypeScript, lint e build foram repetidos e passaram; o caso dirigido de operações/remoção/foco foi repetido em desktop/mobile para validar essa troca de asset: **2/2 aprovados**, em 23,8 segundos. Nenhuma outra regra de negócio foi alterada nesse acabamento.

Capturas finais e inspeção adicional: sem overflow em 320, 390, 414, 720, 768 e 1440 px; controles de quantidade 44 × 44; SVG de quantidade 26,4 × 26,4 preservado; imagens visíveis carregadas e nenhum erro JavaScript. Capturas oficiais da implementação em docs/screenshots/prompt7. A primeira tentativa manual de foco detectou o problema acima, corrigido e coberto pelo teste, sem ocultar sua falha.

O teste de autenticação diferencia agora GET público do carrinho visitante de leitura privada com Authorization. As expectativas de compra/carrinho anteriormente indisponíveis foram substituídas pelas operações reais; diálogos auxiliares fora de escopo continuam cobertos. Não foram removidos testes de funcionalidades anteriores. As tentativas iniciais dos testes de relógio/loading foram corrigidas: o relógio passa a ser instalado antes da cotação, skeleton é observado no carregamento inicial e um rascunho rejeitado precisa ser corrigido para permitir avanço. Nenhuma falha foi contornada com retry automático de teste.

Casos: edição/agregação, entradas inválidas, cliques rápidos, redução/remoção/vazio, refresh, cupons válido/inválido/expirado/removido, 18 casas decimais, evento real de preço/estoque, aceite, correção/esgotamento, expiração com relógio controlado, revalidação antes da navegação, visitante/Alice/Bruno/Alice, 401 durante mutation, 503/422/latência, shimmer, recuperação e viewports. Cenários partem de reset isolado.

## Conformidade com o README

| Requisito do README | Status | Evidência |
| --- | --- | --- |
| §3: adicionar, editar e remover por NFT/edição com estoque | Implementado | UI e POST/PATCH/DELETE existentes, validações no domínio e testes UI. |
| §3: refresh e preservar visitante ao autenticar | Implementado | Banco único, login/merge existente, teste de refresh/login. |
| §3: aplicar/remover cupom e tratar inválido/expirado | Implementado | Endpoints existentes, mensagens, atualização de quote e bloqueio. |
| §3: subtotal, desconto, taxa e total da API | Implementado | Resumo consome Quote, sem cálculo financeiro paralelo. |
| §3: ETH string decimal e quantidades inteiras | Implementado | Valores do contrato intactos; teste com 18 casas e entradas inválidas. |
| §3/7: refletir preço/disponibilidade com carrinho aberto | Implementado | Socket.IO/MSW invalida carrinho e quote, exige revisão e corrige estoque. |
| §3/4: sessão expirada e isolamento privado | Implementado | AuthProvider/Axios existentes, keys por token, cancelamento inclusive visitante. |
| §4: loading, vazio, erro, recuperação e respostas obsoletas | Implementado | Skeletons, mensagens, serialização, abort e reconciliação GET. |
| §6: simulação consistente REST/eventos por MSW | Preservado | Mesmo domínio/banco/binding, nenhum servidor adicional. |
| §8: frames desktop/mobile, assets e acessibilidade | Implementado com ajustes documentados | Composição consultada no editor; PNG/SVGs oficiais locais, remoção original exportada com autorização e campos funcionais adicionais. |
| §9: testes de carrinho, quantidade, cupom e persistência/login | Implementado | Seis grupos em ambos os projetos Chromium e regressão anterior. |

## Pendências e arquivos principais

Pagamento, carteiras/rede, criação idempotente de pedidos e recibos são do Prompt 8; não foram iniciados. Recuperação avançada de eventos, edição de conta, baselines de toda a jornada, auditorias e deploy seguem suas etapas. Limite do conector e ajustes de conteúdo/altura estão descritos acima. Não há pendência de exportação do ícone de remoção.

Principais arquivos: `src/routes/cart.tsx`, `src/features/cart/{cart-line.tsx,cart.css,use-cart.ts}`, `src/services/api/{cart.ts,client.ts}`, `src/hooks/use-marketplace-realtime.ts`, `src/features/nft/nft-details.tsx`, `src/components/layout/{app-shell.tsx,site-header.tsx}`, `src/lib/auth-navigation.ts`, `src/routes/account.tsx`, `src/mocks/http.ts`, `src/app/router/index.ts`, `src/styles/globals.css`, `tests/e2e/{cart.spec.ts,nft-details.spec.ts,catalog.spec.ts,auth.spec.ts}` e documentação.

Nenhuma dependência adicionada. Commit solicitado: `feat: implement cart coupons and quote flow`. user.name e user.email continuam ausentes; nenhum commit com identidade inventada foi criado.
