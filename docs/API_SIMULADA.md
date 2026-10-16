# Cenários da API simulada

Os handlers MSW em `src/mocks/handlers` compartilham o domínio e o banco de `src/mocks/state`. Os mesmos contratos e fixtures atendem desenvolvimento, build de demonstração e testes. Não é necessário iniciar outro servidor.

## Dados e persistência

As fixtures criam 30 NFTs, 90 edições, três coleções, três criadores, sete categorias e três redes. Há duas contas fictícias (`alice@example.test` e `bruno@example.test`, senha `Demo#2026`), favoritos/carrinhos separados, três carteiras, cupons e um pedido histórico confirmado (`order-demo-alice`). Os NFTs `nft-008`, `nft-016` e `nft-024` começam esgotados.

O banco fica no `localStorage`; sessão, visitante e contexto de checkout ficam no `sessionStorage`, por origem/aba. Reset restaura fixtures, revoga sessões, elimina pedidos criados e cancela agendamentos. Recarregue e autentique novamente depois dele. Para uma sessão inteiramente nova, use outro contexto de navegador ou limpe os dados locais da aplicação.

## Seleção e reset

Execute no console da aplicação, depois que o MSW estiver ativo:

```js
await fetch('/api/__mock/scenario', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'slow' }),
})
```

A seleção preserva os dados; recarregue a página para renovar o cache. `default` restaura o comportamento padrão das próximas requisições, mas não desfaz alterações de preço, estoque ou sessão já persistidas. Para voltar ao estado inicial:

```js
await fetch('/api/__mock/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'default' }),
})
```

`GET /api/__mock/status` retorna cenário ativo, relógio, contadores e totais das fixtures. Os controles pertencem à demonstração, não a um backend de produção.

| Cenário | Comportamento |
| --- | --- |
| `default` | Respostas normais e confirmação de pagamento após um segundo |
| `empty` | Catálogo vazio |
| `slow` | Latência fixa de 800 ms para observar skeletons e estados pendentes |
| `out-of-order` | Leituras de catálogo/carrinho/compra alternam 600 e 20 ms |
| `network-error` | Falha de rede nos recursos cobertos |
| `server-error` | Resposta 503 nos recursos cobertos |
| `transient-error` | Primeira requisição por método/caminho falha; próxima permite recuperação |
| `session-expired` | Expira as sessões existentes |
| `unauthorized` | Rejeita acesso privado |
| `validation-error` | Rejeita POST/PUT/PATCH com erro de validação |
| `malformed-session` | Resposta de autenticação incompatível, rejeitada pelo cliente |
| `coupon-invalid`, `coupon-expired` | Rejeitam o cupom aplicado conforme o cenário |
| `price-changed` | Altera a edição `nft-001-ed-10` para `1.49` ETH |
| `sold-out`, `stock-conflict` | Esgotam a edição `nft-001-ed-10` |
| `order-timeout` | Cria o pedido, mas perde a resposta; a mesma chave recupera a compra |
| `payment-confirmed`, `payment-declined` | Confirmam ou recusam o pagamento simulado |
| `payment-pending` | Mantém o pedido pendente até finalização explícita |
| `wallet-refused` | Recusa a conexão simulada da carteira |

Os [contratos completos](API_CONTRACTS.md) especificam os endpoints cobertos, códigos e validações. Falhas não são aleatórias. Os contadores são reiniciados ao selecionar outro cenário.

## Reproduzir falhas de compra

1. Autentique como Alice, revise o carrinho e conecte uma carteira da conta.
2. Selecione `payment-declined`, recarregue e conclua a revisão: o pedido deve ser recusado e os itens preservados.
3. Restaure o cenário, autentique novamente e selecione `order-timeout` antes de enviar outro pedido. Depois da falha, use a recuperação oferecida pela interface: ela repete a mesma chave e corpo, sem criar outra compra. Refresh não envia pedidos automaticamente.
4. Para preço/estoque, mantenha `nft-001-ed-10` no carrinho e selecione `price-changed` ou `sold-out`. O evento deve refletir a alteração e bloquear uma cotação antiga; novos valores exigem aceite.

`WELCOME10` é o cupom válido de 10%; `EXPIRED` já está expirado. Um código desconhecido exercita a rejeição sem mudar o cenário global.

## Tempo real e reconexão

Os eventos passam por `socket.io-client`, MSW WebSocket e `@mswjs/socket.io-binding`, usando somente `websocket`. O domínio persiste alterações e publica `nft.updated` ou `order.updated`; handlers não chamam setters React ou o cache da interface.

```js
// Fechar e manter a conexão indisponível.
await fetch('/api/__mock/realtime', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'disconnect', hold: true }),
})

// Liberar o transporte; use também a tentativa de reconexão da interface.
await fetch('/api/__mock/realtime', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'resume' }),
})
```

Com `payment-pending`, interrompa o socket enquanto acompanha um pedido. Finalize-o com `POST /api/__mock/orders/:id/settle`, corpo `{ "status": "confirmed" }` ou `{ "status": "declined" }`. Reconectar ou recarregar deve recuperar o estado pela API, sem criar outro pedido.

`GET /api/__mock/realtime` lista conexões e eventos autorizados. Para repetir um envelope, envie `{action:"replay",eventId,copies:2}` ao mesmo POST, com o token Bearer da sessão quando o evento for privado. Duplicatas e versões antigas devem ser ignoradas. O histórico é volátil, limitado a 256 eventos e reiniciado no reset/refresh.

O modo Offline do DevTools também interrompe REST e não equivale a cortar somente o socket. Exemplos de alteração precisa de preço/estoque, avanço do relógio e replay estão em [API_CONTRACTS.md](API_CONTRACTS.md); as políticas de cache e isolamento estão em [ARCHITECTURE.md](../ARCHITECTURE.md).
