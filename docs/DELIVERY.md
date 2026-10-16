# Delivery validation

Final application build validated on 16 October 2026. The [challenge brief](CHALLENGE_README.md), [contracts](API_CONTRACTS.md), and [architecture](../ARCHITECTURE.md) describe the scope and implementation. This delivery step changes deployment configuration, existing test synchronization, and documentation/evidence. Application source, appearance, functionality, mocks, visual baselines, and Lighthouse profiles are unchanged.

## Production deployment

- Application: [jungle-nft-marketplace-xi.vercel.app](https://jungle-nft-marketplace-xi.vercel.app).
- Repository: [joaoteixeirapedro/jungle-nft-marketplace, delivery branch](https://github.com/joaoteixeirapedro/jungle-nft-marketplace/tree/codex/marketplace-delivery).
- Vercel production deployment: [build details](https://vercel.com/joaoteixeirapedro/jungle-nft-marketplace/BnqMMUXhDhSkVKppViN6QsHrWkLi).

Vercel installed from the lockfile with npm ci, audited 377 packages with zero reported vulnerabilities, and ran npm run build. The Vite preset serves dist with SPA rewrites. The three public VITE variables are configured for Production; credentials and local environment files are excluded from uploads and Git. No backend, private service, wallet extension, or payment gateway is required.

Anonymous checks verified ten main routes and all **161 deployed files**, including artwork, fonts, JavaScript, CSS, and the MSW worker. Every file returned HTTP 200 and matched the local build's SHA-256. Direct routes serve the SPA, and browser tests verify refresh and not-found handling. The worker is served with Cache-Control: no-cache. [Machine-readable results](DELIVERY_RESULTS.json) retain the route checks, hashes, build identity, environment, and execution statistics.

The public E2E run verifies Home/catalog, registration/login, session recovery after refresh, favorites, cart/coupons, checkout, confirmed receipts, payment failures/idempotency, profile/wallet changes, and Socket.IO updates/reconnection. The Socket.IO client uses WebSocket through MSW and its protocol binding in the browser; no persistent Socket.IO server is hosted on Vercel. State is browser-local, with same-origin tab synchronization through BroadcastChannel.

## Tests

TypeScript, lint, and the production build passed. **13 domain tests passed**, with no failures or skips. The complete final existing E2E suite passed against both targets:

| Target | Desktop | Mobile | Passed | Failed | Skipped | Flaky | Retries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local production preview | 59 | 53 | 112 | 0 | 0 | 0 | 0 |
| Public Vercel URL | 59 | 53 | 112 | 0 | 0 | 0 | 0 |

Each run uses Chromium with 1440×900 desktop and 390×844 mobile viewports, two workers, isolated browser contexts, REST/MSW handlers, and the real Socket.IO client. Tests also inspect 768 px and other intermediate widths. Each complete run attaches 26 axe scans and performs two additional contextual-login accessibility checks. The eight existing visual baselines are unchanged. Reports: [local HTML](test-report/index.html) and [public HTML](test-report/public/index.html).

The first public execution passed 109/112 tests. Three failures exposed tests switching failure scenarios or navigating away before initial Socket.IO/REST reconciliation completed. Existing tests now wait for the rendered account, reconciled state, and the coupon removal response. REST checks after refresh also wait for catalog data; the reconnect helper verifies successful automatic recovery when its optional retry button disappears. Assertions and browser-console checks remain in place, test retries stay at zero, and mocks/application behavior are unchanged. All six initially affected desktop/mobile checks passed before the final complete reruns. Diagnostic traces are retained: [session](test-report/public/initial-failures/session-readiness.zip), [coupon](test-report/public/initial-failures/coupon-readiness.zip), and [navigation](test-report/public/initial-failures/navigation-readiness.zip). Use npx playwright show-trace followed by the trace path.

The historical clean-checkout record was removed because it described an earlier build. The final Vercel clean installation and current build are recorded above and in DELIVERY_RESULTS.json. Older Lighthouse and E2E reports were replaced in their existing directories; only the local/public final HTML reports and three useful failure traces are retained.

## Lighthouse

The existing audit script ran **three measurements per page/profile** against the public production build at https://jungle-nft-marketplace-xi.vercel.app, with fresh browser storage, the default mocks, actual fonts/artwork, and no concurrent E2E runs. The official desktop/mobile profiles and all audit settings are unchanged. After an unexpected browser-driver shutdown following the three Home desktop measurements, the remaining combinations were run in separate invocations of the same script; no successful measurements were discarded or selected by score. All 12 HTML and 12 JSON reports replace the prior build's evidence in [lighthouse/final-delivery](lighthouse/final-delivery/); the [summary](lighthouse/final-delivery/summary.json) records environment, warnings, raw runs, medians, and the matching build hash.

| Page/profile | Performance | Accessibility | Best practices | SEO | Median LCP | Median CLS | Median TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 100 | 100 | 100 | 92 | 0.56 s | 0.00014 | 1.5 ms |
| Home mobile | 94 | 100 | 100 | 92 | 2.65 s | 0.00000 | 113.0 ms |
| NFT details desktop | 100 | 100 | 100 | 92 | 0.59 s | 0.00003 | 0.0 ms |
| NFT details mobile | 94 | 100 | 100 | 92 | 2.64 s | 0.00000 | 128.0 ms |

Environment: Windows 10.0.19045, Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz, 6 logical processors, 16 GiB RAM, Node v24.19.0, Playwright 1.64.1, Lighthouse 13.5.0, Chromium 156.0.0.0. Desktop uses 1350×940, DPR 1, CPU 1×, RTT 40 ms, and 10,240 Kbps; mobile uses 412×823, DPR 1.75, CPU 4×, RTT 150 ms, and 1,638.4 Kbps, with simulated throttling. Full conditions are in each JSON report. The public origin adds real delivery/network conditions to the production build.

All four page/profile combinations meet the performance target of 90. No assets or functionality were omitted, and no performance or design changes were made during this delivery step. Service Worker interception can undercount network transfer sizes in Lighthouse; the separate public hash manifest verifies that all actual build assets remain available.

## Assets, accessibility, and remaining limitations

Original artwork, local fonts, asset pipeline evidence in [assets](assets/), and [Figma references](figma/README.md) are preserved. The final deployed-file comparison replaces reliance on historical asset inventories when identifying the published build. Layout, typography, image variants, and interactions were not edited.

Keyboard, focus, forms, reduced motion, zoom/reflow, responsive widths, and automated accessibility checks passed in the recorded E2E scenarios. These checks do not assert complete WCAG certification or pixel equality with every Figma frame; existing adaptations remain documented in ARCHITECTURE.md.

The remaining limitations are OS-specific Windows/Chromium screenshot baselines and browser-local simulation rather than shared multi-device state. Public deployment and the essential public flow checks are complete. Transactions, credentials, wallet connections, and payments are deliberately fictional.
