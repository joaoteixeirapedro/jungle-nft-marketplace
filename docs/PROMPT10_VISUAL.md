# Refinamento visual da conta — Prompt 10

As pendências anteriormente apontadas de ícones, placeholder e espaçamentos da conta foram resolvidas pelo editor do Figma no navegador. O Prompt 11 não foi iniciado.

## Referência e obtenção dos originais

Frames Desktop / Perfil do Colecionador `9:1238` e Desktop / Carteiras `9:1670`, da cópia de trabalho `lrCchkzKTa5nrWJT5nhUMN`, importada do `.fig` fornecido pelo usuário. Foram usadas a árvore de camadas e as propriedades visíveis do editor; nenhum acesso por API privada, reconstrução dos desenhos ou imagem gerada.

Dez exports locais originais estão inventariados em [figma/account-assets.json](figma/account-assets.json), com camada, ID, dimensões e ponto de uso:

- Perfil ativo/inativo: PNG 18 × 18.
- Carteira ativa/inativa: PNG 20 × 20.
- Favoritos: PNG 16 × 16.
- Compras: SVG 18 × 18.
- Sair: SVG 20 × 20.
- Avatar vazio completo: SVG 50 × 50, incluindo fundo, borda e símbolo de imagem do frame.
- Mostrar/ocultar senha: SVG 20 × 20.
- Seta dos seletores de carteira: SVG 20 × 20.

Os PNGs são exports nativos em 1x, mostrados no tamanho original; SVGs mantêm width/height originais. Não houve redimensionamento dos arquivos, recoloração, redesenho ou referência a URL temporária. O avatar do usuário continua vindo da API; somente o estado vazio foi substituído.

A revisão automática inicialmente bloqueou a seleção SVG e a configuração do ícone de compras por exigir autorização específica para metadados. A tentativa de Copiar como SVG não forneceu dados no clipboard. O usuário então autorizou expressamente configurar a exportação PNG/SVG dos ícones restantes da conta; os downloads seguintes foram concluídos. Apenas metadados de exportação da cópia foram alterados, sem mudanças nos desenhos.

## Medidas conferidas no editor e na aplicação

| Elemento desktop, 1440 px | Figma | Resultado renderizado |
| --- | --- | --- |
| Conteúdo da conta | x 120, y 101, largura 1200 | Conferido |
| Sidebar | 310 px | Conferido |
| Intervalo sidebar/formulário | 28 px | Conferido |
| Formulário | x 458, largura 862 | Conferido |
| Campos em duas colunas | 417 px cada, intervalo 28 | Conferido |
| Primeiro input de perfil | y 188, altura 40 | Conferido |
| Primeiro input de carteira | y 197, altura 40 | Conferido |
| Rótulos | 15 px, linha 15 | Conferido |
| Perfil: grupo do label / intervalo até input | 29 px / 10 px | Conferido |
| Carteira: grupo do label / intervalo até input | 29 px / −4 px | Conferido em desktop; adaptado abaixo de 1100 px |
| Intervalo entre linhas | 24 px | Conferido |
| Placeholder do avatar | 50 × 50 | Original exportado, sem escala |
| Ícone de senha dentro do input | x 381, y 10, tamanho 20 | Conferido |
| Seta do seletor dentro do input | x 389, y 10, tamanho 20 | Original em background, à direita com 8 px |

O deslocamento vinha também do texto redundante de identificação acima do formulário. Ele continua acessível e disponível aos testes, mas não ocupa espaço visual. Sidebar, indicação ativa, textos e controles foram ajustados; Alterar/Remover mantêm nomes acessíveis completos, com texto visual compacto como no frame.

## Responsividade e adaptações preservadas

Não há frames específicos de perfil/carteiras mobile no arquivo. Em 390 px os campos ficam em uma coluna, inputs têm 48 px e controles mantêm alvos de toque. Em 768 px os labels podem quebrar linha: o intervalo negativo do desenho desktop foi substituído por espaço positivo para não sobrepor texto e borda. Scroll margin ajuda a manter controles visíveis ao navegar pelo formulário.

Continuam sendo adaptações funcionais deliberadas, sem pendência de extração de asset: salvamentos separados de perfil/senha, feedback e limites do avatar, ENS opcional conforme a API, carteiras reais da conta em vez dos campos vazios ilustrativos, e links de favoritos/pedidos/checkout em vez de áreas editoriais fora do escopo. O ícone original de compras é reutilizado em pedidos e checkout. O botão Sair mantém alvo de 44 px. Essas diferenças podem aumentar a altura; não se declara igualdade pixel a pixel de todos os estados dinâmicos da aplicação.

## Verificação executada

- TypeScript: aprovado.
- ESLint com zero warnings: aprovado.
- Build de produção: aprovado.
- Playwright da conta: **14/14**, desktop e mobile, relatório em `playwright-report/production-prompt10-visual/index.html`.
- Conferência renderizada de perfil, carteiras e pedidos em **390, 768 e 1440 px**: nove capturas, sem overflow horizontal, IDs duplicados, imagens quebradas ou erros JavaScript.
- Após o último alinhamento de 4 px do botão do olho, a medição do build final confirmou sua posição exata e o tamanho nativo de todos os ícones visíveis. Verificação em `docs/screenshots/prompt10-visual/verification.json`; as medidas desktop acima foram comparadas com as propriedades lidas no Figma.

Capturas finais: [perfil desktop](screenshots/prompt10-visual/profile-1440.png), [carteiras desktop](screenshots/prompt10-visual/wallets-1440.png), [perfil mobile](screenshots/prompt10-visual/profile-390.png), [carteiras tablet](screenshots/prompt10-visual/wallets-768.png).

Mudanças limitadas a `src/features/account/{layout,form,profile}.tsx`, `account.css`, exports originais em `public/assets/figma/account-*`, inventário e documentação. Contratos, estado simulado e regras de negócio foram preservados. Não foi criada suíte nova nem executada a auditoria ampla do Prompt 11.
