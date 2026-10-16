# Kurio — NFT Marketplace

NFT marketplace built for the Jungle Gaming frontend challenge. It includes discovery, NFT details and editions, favorites, a persistent cart, coupons, checkout, order receipts, collector profiles, and wallets. Accounts, wallet connections, payments, and real-time events are simulated in the browser.

- **Live demo:** [jungle-nft-marketplace-xi.vercel.app](https://jungle-nft-marketplace-xi.vercel.app)
- **Repository (delivery branch):** [joaoteixeirapedro/jungle-nft-marketplace](https://github.com/joaoteixeirapedro/jungle-nft-marketplace/tree/codex/marketplace-delivery)

## Stack

React, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Tailwind CSS, shadcn/ui with Radix Slot, MSW, Socket.IO Client, and `@mswjs/socket.io-binding`. Validation uses Playwright, axe-core, Node.js domain tests, and Lighthouse.

## Run locally

Use **Node.js 24 or later** and npm. No backend, API keys, browser wallet extension, or payment service is required.

```sh
npm ci
npm run dev
```

Development runs at [127.0.0.1:5173](http://127.0.0.1:5173). To serve the production build:

```sh
npm run build
npm start
```

The preview runs at [127.0.0.1:4173](http://127.0.0.1:4173). `npm run preview` is equivalent.

## Environment and deployment

[`.env.example`](.env.example) documents the defaults; copying it to `.env` is optional. These public build-time settings require a rebuild after changes. Never put secrets in `VITE_*` variables.

| Variable | Default |
| --- | --- |
| `VITE_ENABLE_MOCKS` | `true`, including production builds |
| `VITE_API_BASE_URL` | `/api` |
| `VITE_SOCKET_URL` | `https://realtime.nft-marketplace.test` |

Vercel uses the Vite preset, `npm ci`, `npm run build`, and `dist`. [`vercel.json`](vercel.json) provides SPA rewrites for direct navigation/refresh and disables caching for the MSW worker. [`.vercelignore`](.vercelignore) excludes local dependencies, reports, original artwork, and environment files from uploads. Production was deployed with the three public variables above explicitly supplied at build time; the same values are also the application defaults.

Socket.IO uses the real client with WebSocket transport, intercepted by MSW and its Socket.IO protocol binding. The reserved `.test` hostname is intentional: no Socket.IO server runs on Vercel. State belongs to each browser's simulation. BroadcastChannel synchronizes tabs of the same origin, not separate devices.

## Demo accounts and scenarios

| Fictional account | Password |
| --- | --- |
| `alice@example.test` | `Demo#2026` |
| `bruno@example.test` | `Demo#2026` |

Fixtures contain 30 NFTs, 90 editions, three collections, and separate account data. Alice has wallets and a historical order. `WELCOME10` applies a 10% discount; `EXPIRED` exercises coupon expiration.

The simulated database persists in `localStorage`; the session and guest identity use `sessionStorage`. Refresh preserves the session in the same tab. Signing in merges the guest cart into the account.

Run these commands in the browser console, locally or on the live demo:

```js
// Select a scenario while preserving the database.
await fetch('/api/__mock/scenario', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'payment-declined' }),
})

// Restore all fixtures and revoke simulated sessions.
await fetch('/api/__mock/reset', { method: 'POST' })
```

Reload after selecting a scenario to refresh the query cache. Sign in again after a reset. [Scenario instructions](docs/API_SIMULADA.md) cover slow/out-of-order responses, network/HTTP failures, session expiration, invalid coupons, price/stock changes, payment refusal, order timeouts, and Socket.IO interruption/recovery. [REST and event contracts](docs/API_CONTRACTS.md) document the controls and payloads.

## Validation

```sh
npm run typecheck
npm run lint
npm run test:data
npx playwright install chromium
npm run build
npm run test:e2e:production
```

The **13 domain tests passed**, and the complete E2E suite passed **112/112 locally and 112/112 on the public Vercel URL**, with no retries, skips, or flaky results. Each suite runs 59 desktop and 53 mobile executions using isolated browser contexts, MSW handlers, and the Socket.IO client. Final results and Lighthouse scores are recorded in [delivery notes](docs/DELIVERY.md) and [machine-readable results](docs/DELIVERY_RESULTS.json).

The production E2E command starts a preview on port 4173. Stop a manual preview first, or set `PLAYWRIGHT_PORT` to a free port. `npm run test:e2e` uses the development server on port 5173. To run the same suite against the live demo, set `PLAYWRIGHT_BASE_URL`; the configuration then skips the local server. In PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://jungle-nft-marketplace-xi.vercel.app'
npm run test:e2e:production
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

New reports are generated under `playwright-report/production` or `playwright-report/public`; JSON results and failure traces are under `test-results/production` or `test-results/public`. Open the retained [local report](docs/test-report/index.html) with `npx playwright show-report docs/test-report`, or the [public report](docs/test-report/public/index.html) with `npx playwright show-report docs/test-report/public`. Eight visual baselines are versioned for Windows/Chromium; other operating systems need matching baselines or the same Windows environment.

For Lighthouse, keep `npm start` running and execute `npm run audit:lighthouse`. It measures Home and NFT details three times per desktop/mobile profile, using production assets and standard mocks. Set `AUDIT_URL` to audit another origin. [HTML/JSON reports and medians](docs/lighthouse/final-delivery/) record the actual scores, LCP, CLS, TBT, tool versions, and conditions. Audit settings are unchanged.

## Implementation notes

TanStack Query keys include parameters and session identity. Obsolete requests are canceled, private caches/subscriptions are cleared on account changes, and favorites use optimistic updates with rollback. ETH values travel as decimal strings and use integer wei calculations. Quotes are revalidated before purchase; persisted idempotency keys recover the same order after a timeout. Versioned Socket.IO events reject duplicates and older updates; reconnection reconciles active resources through REST.

[`ARCHITECTURE.md`](ARCHITECTURE.md) explains session, cart, cache, persistence, reconciliation, UX decisions, and Figma adaptations. Fonts and artwork are local. Originals in `assets/originals` support optional optimization scripts and are excluded from deployment.

## Challenge references

- [Jungle Gaming challenge](https://github.com/junglegaming/frontend-challenge) and [preserved brief](docs/CHALLENGE_README.md).
- [Original Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) and [visual references/assets](docs/figma/README.md).
