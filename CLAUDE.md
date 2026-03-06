# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foresto Compass Frontend — React SPA for the Foresto Compass investment education platform.

### Repository Structure

| Repo | Path | Description |
|------|------|-------------|
| `foresto-compass-backend` | `~/ForestoCompass/backend/` | FastAPI backend |
| `foresto-compass-frontend` | `~/ForestoCompass/frontend/` | React + Vite frontend (this repo) |
| `foresto-compass-docs` | `~/ForestoCompass/docs/` | Documentation & strategy reports |

## Commands

```bash
npm install             # Install dependencies
npm run dev             # Dev server (port 5173)
npm run build           # Production build
npm run lint            # ESLint (flat config, --max-warnings 0)
npm run generate-icons  # Regenerate PWA icons from public/icon.svg (uses sharp)
```

## CI

`.github/workflows/ci.yml` — runs on push/PR to `main`: `npm ci` → `npm run lint` → `npm run build` (Node 20).

## Architecture

```
src/
├── pages/               # Page components (~42 pages)
├── components/          # Reusable: Header, Footer, ErrorBoundary, Disclaimer, OnboardingTour, etc.
├── contexts/            # AuthContext.jsx (auth state + Sentry/Mixpanel integration)
├── hooks/useTheme.js    # Dark mode toggle hook (localStorage + system preference)
├── services/api.js      # Axios client with JWT injection + idempotency keys
├── utils/               # analytics.js, chartUtils.js, formatting.js, sentry.js
└── styles/
    ├── theme.css        # CSS design tokens (:root light + [data-theme="dark"])
    └── *.css            # Per-page/component CSS (all theme-aware)
```

## CSS Rules (Critical)

- **All colors MUST use CSS variables** from `theme.css`. No hardcoded `white`, `#333`, `#e0e0e0`.
- **Forbidden variable names** (not in theme.css): `--card-bg`, `--text-primary`, `--input-bg`, `--border-color`
- **Class naming**: Page-scoped prefixes required (e.g., `screener-table`, `backtest-card`, `guest-52w-bar`)
- **Dark mode overrides**: `[data-theme="dark"] .selector` for colors needing different dark values
- **Brand gradients**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` — universal, no dark override
- **Stock color convention**: Korean market — **red = up, blue = down** (opposite of US)
- **Disclaimer**: Always use `<Disclaimer />` component with `.disclaimer-box` class, never inline
- **Tailwind**: Installed but **do NOT use utility classes in components**. Use CSS variables from theme.css.

### Theme System
- Design tokens: `src/styles/theme.css` — `:root` (light) + `[data-theme="dark"]` (dark)
- Toggle: `useThemeInit()` in App.jsx, `useTheme()` in components
- Theme hook persists to localStorage, listens to `prefers-color-scheme`

## API Client (`services/api.js`)

- Axios instance with `VITE_API_URL` base
- **Timeouts**: 60s default, 120s for admin data collection endpoints
- JWT injection from localStorage key `access_token`
- Idempotency keys for POST/PUT/PATCH/DELETE (`X-Idempotency-Key`)
- 401 → clear token + redirect to `/login` (except `/auth/login` and `/auth/signup`)
- **PDF downloads**: Use raw `fetch` (not Axios) for binary blob responses
- **StrictMode guard**: Pages with `useEffect` data fetching use `useRef` guard to prevent duplicate API calls

## Routing (`App.jsx`)

- **Public**: Statically imported (fast first paint) — `/`, `/login`, `/signup`, `/explore`, `/guide`, `/developers`
- **Protected**: `React.lazy` code split — `/dashboard`, `/survey`, `/portfolio`, `/backtest`, `/screener`, `/watchlist`, etc.
- **Admin**: Role-based, lazy-loaded — `/admin/*`
- `ProtectedRoute` checks `isAuthenticated` from AuthContext
- `ErrorBoundary` catches `ChunkLoadError` from failed lazy imports
- React Router v7 future flags: `v7_startTransition`, `v7_relativeSplatPath`

## Key User Flows

### Diagnosis → Portfolio → Backtesting
```
Survey → DiagnosisResult → PortfolioRecommendation → ScenarioSimulation
                                                          ↓ "AI 성과 해석 보기"
                                                     PortfolioExplanation (/analysis)
```
- Scenario → Analysis is **direct** (skips BacktestPage)
- BacktestPage is an **independent tool** accessible from GNB menu, also links to `/analysis`
- Inter-page data: React Router `navigate('/path', { state: { metrics, autoSubmit } })`
- Percent→decimal conversion when passing between pages (CAGR/100, volatility/100, MDD sign negation)

### AI Commentary Pattern
Pages that display AI analysis (DiagnosisResult, PortfolioExplanation, StockDetail):
- Backend returns optional `ai_commentary` / `ai_analysis` field (null if Claude API unavailable)
- Frontend renders conditionally: `{ai_commentary && <div className="...-ai-section">...`
- Gradient background (`--ai-bg` or brand gradient) + white inner cards
- Always graceful degradation — page works without AI

## Chart Utilities (`utils/chartUtils.js`)

- `downsampleData(dailyValues, threshold=365)` — 7-day averaging for large datasets
- `buildChartOptions(titleText, yFormat, opts)` — theme-aware Chart.js config (reads CSS variables at runtime)
- `buildDrawdownChartData(dailyValues)` — peak-to-valley drawdown chart
- Shared by BacktestPage and ScenarioSimulationPage

## Disclaimer Component

7 context-specific types: `general`, `diagnosis`, `portfolio`, `stock`, `backtest`, `simulation`, `market`. Usage: `<Disclaimer type="backtest" />`. Never write disclaimer text inline.

## Component Conventions

- Hooks must appear before any conditional returns (React rules)
- Use `useRef` for polling intervals to prevent multiple concurrent polls
- ProgressModal: 3-retry 404 handling before giving up
- New page = `src/pages/{PageName}.jsx` + `src/styles/{PageName}.css` (page-scoped prefix)

## State Management

- **AuthContext**: `user`, `isAuthenticated`, `isLoading`, `login()`, `logout()`. Validates token via `GET /auth/me`.
- **ThemeContext**: `theme`, `toggleTheme()` — localStorage
- No Redux/Zustand — React Context + local useState

## Branding

- **Foresto IQ** (내부명 `compass_score`) — user-facing text is "Foresto IQ", API fields remain `compass_score`/`compass_grade`
- Forbidden terms: "투자 추천", "매수 추천", "수익 보장" — use "학습 도구", "시뮬레이션", "교육 목적"
- All analysis pages must include `<Disclaimer />` component

## ESLint

- Flat config (`eslint.config.js`), `--max-warnings 0`
- `no-unused-vars`: `varsIgnorePattern: '^[A-Z_]'` — uppercase/underscore-prefixed vars exempt

## Deployment

Auto-deploy on push to `main` via Vercel (Vite preset). Custom domain: `foresto.co.kr` (Cloudflare DNS).

## Environment Variables

See `.env.development` and `.env.production`. Key: `VITE_API_URL`, `VITE_MIXPANEL_TOKEN` (optional), `VITE_SENTRY_DSN` (optional), `VITE_TOSS_CLIENT_KEY` (optional).

## Build Configuration (`vite.config.js`)

- Manual chunk splitting: `vendor` (react, react-dom, react-router-dom) + `charts` (chart.js, react-chartjs-2)
- PWA: `vite-plugin-pwa` with auto-update, workbox caching (HTML/API NetworkFirst)
- Prerender: `@prerenderer/rollup-plugin` + `@prerenderer/renderer-jsdom` for SEO routes: `/`, `/login`, `/signup`, `/explore`, `/terminology`, `/guide`, `/developers`
- `vercel.json` SPA fallback for client-side routing
