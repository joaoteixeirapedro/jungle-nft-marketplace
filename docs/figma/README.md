# Referências visuais da Home

O usuário forneceu `Frontend Challenge.fig` em 15/10/2026. Foi importada uma cópia de trabalho com acesso de edição para resolver a restrição do arquivo original; o conteúdo do design não foi modificado.

- Original: https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1
- Cópia de trabalho: https://www.figma.com/design/lrCchkzKTa5nrWJT5nhUMN/Frontend-Challenge?node-id=2-2
- Desktop / Início: `2:2`, 1440 × 3668.
- Mobile / Início: `14:5226`, 414 × 896.

`get_design_context` foi consultado com a skill `figma-design-to-code`, retornando código de referência, estilos, assets e screenshots dos dois frames. As capturas oficiais foram salvas como `home-desktop.png` e `home-mobile.png`; servem apenas à comparação, nunca como imagem da interface.

## Associação das quatro imagens oficiais

| Asset local | Identidade visual | Posições do design |
| --- | --- | --- |
| `8f387.png` | Macaco com jaqueta verde e óculos | Hero, Emerald Ape, promoção gênesis, segundo editorial |
| `83794.png` | Macaco de chapéu e moletom roxo | Sobreposição mobile, Sage/Cosmic/Violet, destaque lateral, terceiro editorial |
| `9add2.png` | Macaco com paletó e gola verde | Neon/Ivory, promoção de arte selecionada, primeiro editorial |
| `b7cfc.png` | Macaco dourado com fones verdes | Golden Beat/Signal, quarto editorial |

Arquivos públicos em `public/assets/figma`; inventário de exports/nomenclatura original em `assets.json`. Imagens dinâmicas dos NFTs são associadas em `src/mocks/data/artwork.ts` e entregues pela API. Recursos decorativos usam os mesmos arquivos oficiais. Os SVGs conservam geometria intrínseca; wrappers controlam posição e área de toque, com clipping quando necessário. Não foram geradas imagens substitutas.

Fonte Roboto Mono 400/500/700: arquivos locais em `public/fonts`, obtidos da distribuição oficial Google Fonts, com licença OFL junto aos arquivos. Tokens e medidas vieram do contexto de design; diferenças funcionais/de conteúdo estão em `docs/PROMPT4.md` e `ARCHITECTURE.md`.

As capturas da aplicação ficam em `docs/screenshots/prompt4`. Elas documentam a revisão atual e não substituem as futuras baselines automatizadas da jornada completa.

## Detalhes — Prompt 5

Frames Desktop / Detalhes do NFT `10:244` (1440 × 2246) e Mobile / Detalhes do NFT `15:5536` (414 × 896) foram inspecionados na mesma cópia. Referências oficiais: `nft-detail-desktop.png`, `nft-detail-mobile.png`. Capturas da implementação: `../screenshots/prompt5/`. Inventário adicional: `detail-assets.json`.

O detalhe usa imagem dinâmica, uma miniatura e ampliação: as quatro miniaturas do design repetem exatamente a mesma imagem, e o contrato atual oferece uma imagem por NFT. Dados ilustrativos não presentes na API (ratings, contratos, royalties e edição aberta) não foram fabricados. A correspondência visual cobre composição, arte, paleta, fonte, gradiente, espaçamento, controles e barra inferior; os ajustes funcionais e diferenças estão em `../PROMPT5.md`.

## Login e cadastro — Prompt 6

Frames oficiais inspecionados: Desktop Login 9:115, Cadastro 9:1022; Mobile Login 16:1022, Cadastro 16:1228. Referências exportadas: login-desktop.png, register-desktop.png, login-mobile.png e register-mobile.png. Capturas reais em ../screenshots/prompt6. Inventário adicional em auth-assets.json.

O desktop reutiliza a Home/API existente atrás de um diálogo nativo (500 px de largura; alturas 600/656 px e topo 160/158 px). O mobile usa a composição de página inteira do frame. Não há senha preenchida de demonstração, OAuth fictício ou recuperação de senha simulada sem endpoint. Ícones sociais, camadas Google, fechar, olho e divisores são oficiais. Diferenças funcionais/foco/áreas de toque estão documentadas no relatório da etapa.

## Carrinho — Prompt 7

Desktop 11:1278 (1440 × 1754) e Mobile 16:360 (414 × 896) foram consultados diretamente no editor. A chamada get_design_context com a skill retornou limite do plano Starter. A exportação PNG existente do desktop foi baixada como cart-desktop.png; não é usada na interface. A revisão automática recusou inicialmente adicionar configuração de exportação. Depois de solicitado, o usuário autorizou expressamente exportar o ícone; foi adicionada somente configuração SVG à instância Iconly/Curved/Delete do primeiro item desktop, sem modificar o desenho. Export original 24 × 24 em public/assets/figma/cart-delete.svg.

Capturas reais em ../screenshots/prompt7. Imagens de itens vêm da API; SVGs de quantidade e voltar são exports locais existentes; a remoção usa o original exportado, com nome acessível no botão. Composição, espaçamentos adaptáveis, paleta e fonte reutilizam o projeto; conteúdos extras de estoque/edição/cotação/erros aumentam a altura móvel. O relatório ../PROMPT7.md registra esses ajustes e o limite do conector.

## Pagamento e confirmação — Prompt 8

Frames de referência: Desktop / Pagamento 11:2862 (1440 x 1657), Mobile / Pagamento 16:748 (414 x 896), Desktop / Confirmação de Pedido 11:4385 (1440 x 1657). Consulta pelo editor porque get_design_context/get_screenshot retornaram quota do plano Starter. Sem alegação de comparação pixel a pixel ou extração MCP concluída.

O usuário autorizou adicionar configuração SVG somente à ilustração thank-you 1 (11:5150) na cópia de trabalho. Export original 80 x 80 em public/assets/figma/checkout-thank-you.svg; desenho preservado. Inventário em checkout-assets.json; capturas reais de checkout e recibo em ../screenshots/prompt8. O recibo não possui frame mobile próprio e foi adaptado, com o mesmo asset em 80 x 80. Baselines automatizadas de pagamento estão em tests/e2e/checkout.spec.ts-snapshots.

A interface oferece apenas carteiras da API, com identificação tipográfica do provedor, conexão explícita e seleção de rede. No mobile, campos e itens podem ser expandidos e aparecem na revisão final; informações de cotação, validação e snapshot ampliam a altura em relação aos frames. Valores históricos vêm da API, não dos números ilustrativos do layout. Limites, ajustes de acessibilidade e resultados estão no relatório da etapa.

## Perfil e carteiras — Prompt 10

Referências no editor original: Desktop / Perfil do Colecionador 9:1238 e Desktop / Carteiras 9:1670, ambos 1440 × 1080. Capturas do editor em profile-reference.png e wallets-reference.png são referências de leitura, não assets da aplicação; o viewport ampliado corta parte do frame. get_design_context/get_screenshot no original foram recusados por acesso de edição e na cópia lrCchkzKTa5nrWJT5nhUMN por quota Starter. Na implementação inicial, nenhum metadado foi alterado. No refinamento seguinte, o usuário autorizou expressamente configurações PNG/SVG para os ícones restantes da conta; somente metadados de exportação da cópia de trabalho foram modificados.

Colunas do conteúdo (duas), sidebar 310 px, gap 28 px, inputs 40 px, Roboto Mono e paleta existentes foram conferidos. Campos reais/feedback aumentam a altura. Perfil e senha têm salvamentos separados; ENS opcional segue o domínio; ações de carteiras respeitam os slots e a unicidade. Links editoriais e operação Igual à principal incompatível com contrato foram omitidos. O refinamento substituiu o placeholder e os ícones pelos originais exportados pelo navegador, incluindo variantes ativa/inativa. Inventário em account-assets.json; medidas e adaptações em ../PROMPT10_VISUAL.md. Mobile adapta navegação e formulários, pois não há frames específicos. Evidências em ../screenshots/prompt10 e ../PROMPT10.md.

