# Prompt 4 — Home e descoberta de NFTs

Atualizado em 15/10/2026. O arquivo `Frontend Challenge.fig` fornecido pelo usuário resolveu o bloqueio de extração. A Home e o catálogo foram implementados sobre a arquitetura existente; nenhum fluxo completo do Prompt 5 ou posterior foi antecipado.

## Implementações

- Home Kurio com header, hero desktop/mobile, imagens oficiais, destaque lateral, exploração de coleções, Diário da Cunhagem e rodapé presentes no design.
- Mobile com busca superior, hero compacto, cards em duas colunas com deslocamento alternado e navegação inferior. O drawer reúne filtros, ordenação e total de resultados.
- Catálogo reutilizado em `/` e `/marketplace`, com busca por API (debounce de 300 ms), filtros combinados, limpar busca/filtros, ordenação e paginação de servidor (nove itens).
- Categorias e redes aceitam múltipla seleção. Coleção, criador, intervalo ETH e disponibilidade também combinam. Os filtros adicionais ficam em “Mais filtros”, sem retirar os controles da versão mobile.
- Slider e campos de preço complementares: os sliders usam centésimos inteiros e BigInt para conversão; os campos aceitam a precisão completa do contrato. Valores fora do intervalo visual do slider continuam editáveis pelos campos.
- URL controla pesquisa, filtros, ordenação e página; funciona em refresh, links diretos e histórico. Defaults são omitidos, parâmetros inválidos tratados e páginas inexistentes corrigidas com replace.
- Cards usam imagens, nomes, preço, estoque e raridade retornados pela API. A rota `/nfts/$nftId` apenas consulta o recurso e trata 404.
- Skeletons com shimmer e movimento reduzido, carregamento, vazio, erro/retry e atualização em segundo plano. Queries completas e cancelamento impedem regressão por respostas fora de ordem.
- Ações de conta, favoritos, carrinho, ranking, newsletter, suporte/editoriais e redes sociais ainda sem fluxo exibem aviso honesto de indisponibilidade, com foco inicial/Escape/restauração. Não há confirmação falsa nem envio de e-mail.

## Integração preservada

Endpoints utilizados: `GET /api/nfts`, `GET /api/nfts/:id`, `GET /api/collections`, `GET /api/creators`. Queries: `['catalog', params]`, `['nft', id]`, `['collections']`, `['creators']`. Os dois slots editoriais da Home consultam os recursos existentes `nft-001` e `nft-002`, com dados vindos de REST e deduplicação pelo cache.

Continuam TanStack Router, TanStack Query, Axios central, Tailwind e Button shadcn/ui. Nenhuma dependência foi instalada. Não foram alterados contratos REST, handlers, regras de estoque/cotação/pedidos ou infraestrutura MSW + Socket.IO; nenhum backend foi adicionado.

As fixtures receberam somente os metadados visuais oficiais e uma cronologia determinística de lançamento que apresenta os primeiros NFTs do Figma no cenário novo/resetado. Preços, edições e regras anteriores continuam. Estados já persistidos recebem imagens apenas onde havia `src:null`, sem apagar usuários, preços, estoque, carrinhos, pedidos ou tentativas idempotentes. Não há reset automático da sessão do usuário.

## Fonte visual e assets

A cópia foi importada no Figma para permitir a inspeção com acesso de edição: [cópia de trabalho](https://www.figma.com/design/lrCchkzKTa5nrWJT5nhUMN/Frontend-Challenge?node-id=2-2). A referência oficial continua sendo o [arquivo do desafio](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

Contexto de alta fidelidade obtido com `get_design_context`, incluindo screenshots, para `2:2` (Desktop / Início, 1440 × 3668) e `14:5226` (Mobile / Início, 414 × 896). Fonte confirmada: Roboto Mono, pesos 400/500/700, servida localmente e com licença OFL. Paleta: fundo `#140D0A`, cards `#241612`, âmbar `#D28A4C`, texto `#F5F1EB` e texto secundário `#CFB28C`.

Quatro PNGs oficiais e SVGs foram baixados diretamente das URLs retornadas pelo conector para `public/assets/figma`. URLs temporárias não são utilizadas em runtime. Referências de design ficam em `docs/figma/home-{desktop,mobile}.png`; inventário em `docs/figma/assets.json`. Não se usa screenshot do Figma como imagem da interface, imagem gerada ou ilustração genérica.

### Ajustes documentados em relação ao protótipo

- Preços, estoques, raridade e nomes vêm da API existente, sem copiar valores desenhados para simular dados. O mobile do Figma repete alguns rótulos em imagens diferentes; a implementação mantém a identidade canônica de cada NFT e a ordenação do servidor.
- Não foram inventadas contagens por categoria/rede: o contrato não retorna facets. Categorias inexistentes na API não viraram filtros fictícios. “Em alta” informa ausência de ranking, em vez de inventar uma métrica.
- Busca desktop abre o catálogo completo; no mobile fica acima do hero. Ordenação/contagem ficam no drawer mobile para preservar a posição do grid. Filtros adicionais têm disclosure “Mais filtros”.
- Controles, foco, disponibilidade de item esgotado e paginação receberam adaptações de acessibilidade. Botões têm alvo de pelo menos 44 px; o texto compacto do CTA mobile mantém área de toque estendida. A moldura arredondada do frame mobile não é tratada como moldura de aparelho.
- Altura total e pequenos espaçamentos variam por controles reais, estados e conteúdo da API. As capturas comprovam revisão visual; não se alega igualdade de pixels entre dados diferentes.
- Conteúdo editorial foi reproduzido visualmente porque integra a Home; páginas de artigos continuam fora do escopo. Contatos do rodapé são ilustrativos e não iniciam comunicações reais.

## Validação

- TypeScript strict: aprovado (`node node_modules/typescript/bin/tsc -b`).
- ESLint, zero warnings: aprovado (`node node_modules/eslint/bin/eslint.js . --max-warnings 0`).
- Build de produção: aprovado (`node node_modules/vite/bin/vite.js build`).
- Domínio: **5/5 aprovados** (`node --test tests/data/*.test.ts`).
- Playwright no build de produção: **26/26 aprovados**, Chromium desktop/mobile, sem retries (`node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts`). Mantém 14 execuções anteriores e acrescenta seis grupos de descoberta nos dois perfis.
- Cobertura nova: Home realmente recebida por REST/MSW e imagem correta; busca + filtros + histórico/refresh; preço/ordenação/paginação/URL inválida; respostas fora de ordem/vazio; erro/retry/skeleton/reduced motion; assets/fontes locais e avisos de ações futuras com restauração de foco.
- Inspeção em 390, 414, 768 e 1440 px, além de viewport equivalente a zoom de 200%: sem overflow horizontal, imagens visíveis sem falha e drawer com foco recuperável.
- Migração de banco anterior verificada no navegador: imagem `src:null` atualizada para o asset oficial, mantendo disponibilidade 3 e versão 2 previamente gravadas. Nenhum erro JavaScript observado; overlays SVG medidos em 586 × 250, sem distorção.
- Testes antigos de REST, persistência, isolamento, pedidos e Socket.IO continuam passando. As únicas atualizações de seletores refletem o título final da Home e a posição da ordenação no drawer; a intenção das verificações foi preservada.

Capturas finais: [Home desktop](screenshots/prompt4/home-1440.png), [Home mobile](screenshots/prompt4/home-414.png), [viewport mobile](screenshots/prompt4/home-viewport-414.png), [catálogo desktop](screenshots/prompt4/catalog-1440.png), [catálogo mobile](screenshots/prompt4/catalog-390.png), [filtros mobile](screenshots/prompt4/filters-390.png). Há também capturas de 768 px. Relatório HTML gerado em `playwright-report/production/index.html` (ignorado pelo Git); referências oficiais versionáveis em `docs/figma`.

## Arquivos principais

- `src/features/catalog`: catálogo, filtros, busca, parâmetros e seções da Home.
- `src/components/layout`: shell, header, footer e navegação mobile.
- `src/components/nft/nft-card.tsx`: cards, imagens e skeletons compartilhados.
- `src/components/ui`: Button existente, ícones oficiais e aviso de indisponibilidade acessível.
- `src/services/api/catalog.ts`: consultas Axios/Query públicas.
- `src/mocks/data/artwork.ts`, `marketplace.ts`, `src/mocks/state/store.ts`: associação e atualização segura de imagens das fixtures.
- `src/styles/globals.css`, `public/assets/figma`, `public/fonts`: tema e assets locais.
- `tests/e2e/catalog.spec.ts`, seletores de `setup.spec.ts`/`api.spec.ts`, documentação e capturas.

## Próximas etapas

Detalhes completos/favoritos, autenticação, carrinho/cotação, checkout, robustez avançada de eventos e perfil/carteiras permanecem nos prompts correspondentes. O catálogo ainda não assina atualizações de negócio do Socket.IO; o diagnóstico e a simulação existente foram preservados. Lighthouse, otimização de imagens e baselines automatizadas da jornada completa ficam para a etapa de qualidade/performance. Não houve avanço ao Prompt 5, push ou publicação.

Sem commit: `user.name`/`user.email` não estão configurados no Git deste ambiente; não foi inventada identidade de autoria.
