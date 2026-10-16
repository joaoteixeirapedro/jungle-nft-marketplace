# Entrega do Prompt 3 — API simulada

Camada de dados implementada sobre a base do Prompt 2, sem servidor adicional e sem páginas novas do Figma. [Contratos completos](API_CONTRACTS.md) e [decisões de arquitetura](../ARCHITECTURE.md).

## Implementado

- Catálogo com busca, filtros combinados, ordenação, paginação e detalhe; coleções/criadores.
- Cadastro, login, sessão, expiração/logout, favoritos e carrinho de visitante/conta.
- Atualização de perfil, avatar, senha e carteiras principal/secundária; rede e conexão simulada.
- Cupom/cotação com precisão de 18 casas; revalidação de preço, disponibilidade, taxa, cupom e contexto.
- Pedido idempotente, reserva de estoque, pendente/confirmado/recusado, recibo imutável e recuperação após timeout/refresh.
- Banco único persistido e transações; dados privados isolados por sessão; reset integral.
- Eventos versionados `nft.updated` e `order.updated` via MSW + binding + Socket.IO Client; entrega privada revalida autorização.
- Controles determinísticos de falhas, latência/fora de ordem, sessão, cupons, preço/estoque e pagamentos.

## Fixtures

30 NFTs, 90 edições, três coleções, três criadores, sete categorias, três redes, duas contas com verificadores PBKDF2, uma sessão expirada, três carteiras, favoritos/carrinhos separados, dois cupons e um pedido histórico confirmado com transação simulada. Itens esgotados e edições limitadas estão disponíveis desde o reset. Nenhum asset aleatório ou dado real de blockchain foi utilizado.

## Testes executados

- **TypeScript strict:** aprovado.
- **ESLint:** aprovado, sem warnings.
- **Build Vite:** aprovado.
- **Cinco testes de domínio Node:** aprovados, cobrindo ETH exato, filtros/paginação, chave concorrente, quote obsoleta, reserva/liberação, baixa parcial, snapshot, senhas derivadas, ajuste de merge e expiração.
- **14 execuções Playwright contra o build estático:** aprovadas. Seis grupos de API no Chromium desktop e regressão dos quatro testes de setup em desktop/mobile.

Os testes de navegador confirmam handlers reais do MSW: catálogo/detalhe, stock/quantidade inválida, contas isoladas, visitante incorporado, perfil/avatar/senha/carteira persistidos, pedidos/recibo, erros previsíveis, resposta fora de ordem, recuperação após falha transitória e timeout após criação efetiva.

Um teste carrega o cliente Socket.IO distribuído pelo pacote instalado, estabelece conexões simuladas de duas contas e verifica evento de preço coerente com REST, evento de pedido restrito ao proprietário e bloqueio após logout. Não usa chamadas diretas ao cache/React para representar eventos.

Após a revisão final foram expostos carteira/rede na consulta da sessão e ajustes de quantidade no resultado do merge de visitante, para permitir feedback/restauração pela UI futura. Os testes existentes de conta/credenciais foram ampliados para essas duas regras, sem criar novos grupos redundantes.

## Próximos prompts

Continuam pendentes as interfaces completas, hooks e queries privadas, guards, atualização otimista com rollback, apresentação/revisão do checkout, avisos de tempo real e tratamento avançado de eventos antigos/duplicados/reconexão no frontend. Também permanecem futuras as auditorias Lighthouse, regressão visual do produto, assets exportados e deploy público.

Não houve avanço para o Prompt 4, commits automáticos ou inclusão de backend real. Nenhuma dependência adicional foi necessária.
