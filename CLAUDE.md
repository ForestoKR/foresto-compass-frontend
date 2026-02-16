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
npm install      # Install dependencies
npm run dev      # Dev server (port 5173)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

```
src/
├── pages/               # Page components (20+ pages)
├── components/          # Reusable: ProgressModal, ProfileCompletionModal, DataTable, Disclaimer, Footer
├── hooks/useTheme.js    # Dark mode toggle hook (localStorage + system preference)
├── services/api.js      # Axios client with JWT injection + idempotency keys
└── styles/
    ├── theme.css        # CSS design tokens (:root light + [data-theme="dark"])
    └── *.css            # Per-page/component CSS (all theme-aware)
```

## UI Theme System

### Architecture
- **Design tokens**: `src/styles/theme.css` — `:root` (light) + `[data-theme="dark"]` (dark)
- **Toggle hook**: `src/hooks/useTheme.js` — `useThemeInit()` for App.jsx, `useTheme()` for components
- **Legacy bridge**: App.css `:root` maps `--primary-color` → `var(--primary)` for backward compat

### CSS Variable Categories
| Category | Variables | Light Example | Dark Example |
|----------|-----------|---------------|--------------|
| Background | `--bg`, `--card`, `--card-inner`, `--card-hover` | `#f0f2f5`, `#ffffff` | `#0f172a`, `#1e293b` |
| Text | `--text`, `--text-secondary`, `--text-muted` | `#1f2937`, `#6b7280` | `#f1f5f9`, `#94a3b8` |
| Border | `--border`, `--border-light` | `#e5e7eb`, `#f3f4f6` | `#334155`, `#1e293b` |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | light rgba | dark rgba |
| Brand | `--primary`, `--primary-dark`, `--accent` | `#667eea`, `#5a6fd1` | same values |
| Stock | `--stock-up`, `--stock-down` | `#16a34a`, `#dc2626` | same values |

### Rules for CSS
- **All colors MUST use CSS variables**. No hardcoded `white`, `#333`, `#e0e0e0`.
- **Forbidden variable names**: `--card-bg`, `--text-primary`, `--input-bg`, `--border-color` (not in theme.css)
- **Class naming**: Page-scoped prefixes required (`{page}-table`, `{page}-error`) to prevent cross-file conflicts.
- **Dark mode overrides**: Use `[data-theme="dark"] .selector` for colors that need different dark values.
- **Brand gradients**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` is universal — no dark override needed.
- **Disclaimer component**: Uses `.disclaimer-box` CSS class (no inline styles).

### Theme Toggle Implementation
```js
// App.jsx — initialize theme once at app root
const { theme, toggleTheme } = useThemeInit();
// Sets document.documentElement.setAttribute('data-theme', theme)
// Persists to localStorage, listens to system prefers-color-scheme
```

## API Client (`services/api.js`)

- Axios instance with `VITE_API_URL` base
- Request interceptor: JWT token injection from localStorage
- Idempotency keys: auto-generated for POST/PUT/PATCH/DELETE (header `X-Idempotency-Key`)
- Response interceptor: 401 → clear token + redirect to login

## Routing (`App.jsx`)

### Public (static import — fast first paint)
- `/` — LandingPage
- `/login` — LoginPage
- `/signup` — SignupPage

### Protected (React.lazy — code split)
- `/dashboard` — MarketDashboardPage (KPI cards, watchlist, news)
- `/survey` — SurveyPage (investment profile diagnosis)
- `/result`, `/history` — DiagnosisResultPage, DiagnosisHistoryPage
- `/portfolio` — PortfolioRecommendationPage
- `/backtest` — BacktestPage
- `/scenarios` — ScenarioSimulationPage
- `/screener` — StockScreenerPage
- `/watchlist` — WatchlistPage
- `/stock-comparison` — StockComparisonPage
- `/profile` — ProfilePage

### Admin (role-based, lazy-loaded)
- `/admin/data` — DataManagementPage (batch data collection + progress monitoring)
- `/admin/users` — UserManagementPage
- `/admin/stock-detail` — StockDetailPage
- `/admin/financial-analysis`, `/admin/valuation`, `/admin/quant` — Analysis pages

`ProtectedRoute` checks `isAuthenticated` from AuthContext; redirects to `/login` if false.
`ErrorBoundary` catches `ChunkLoadError` from failed lazy imports.

## Component Conventions

- Hooks must appear before any conditional returns (React rules)
- Use `useRef` for polling intervals to prevent multiple concurrent polls
- ProgressModal: 3-retry 404 handling before giving up
- Disclaimer: always use `<Disclaimer />` component, never inline disclaimer text
- New page = `src/pages/{PageName}.jsx` + `src/styles/{PageName}.css` (page-scoped prefix)

## State Management

- **AuthContext** (App.jsx): `user`, `isAuthenticated`, `login()`, `logout()`
- **ThemeContext** (useTheme.js): `theme`, `toggleTheme()` — persists to localStorage
- No Redux/Zustand — all state is local `useState` or Context
- `useCallback` for memoizing API fetch functions; `useEffect` with dependency arrays

## Environment Variables

`.env.development`:
```
VITE_API_URL=http://localhost:8000
```

`.env.production`:
```
VITE_API_URL=https://your-production-api.com
```

## Deployment

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Vercel (Hobby) | `https://foresto-compass-frontend.vercel.app` |
| Custom Domain | Cloudflare DNS → Vercel | `https://foresto.co.kr` |
| Backend API | Render | `https://foresto-compass-backend.onrender.com` |

- Auto-deploy: pushes to `main` trigger Vercel build
- Framework preset: Vite (auto-detected)
- `VITE_API_URL` set in Vercel Environment Variables
- Cloudflare DNS: A `foresto.co.kr` → `216.198.79.1`, CNAME `www` → `cname.vercel-dns.com`

## Tech Stack

- **Framework**: React 18, Vite 5, React Router 6
- **Charts**: Chart.js
- **Styling**: CSS custom properties (theme.css) — no CSS-in-JS, no Tailwind utility classes in components
- **PWA**: Workbox + standalone + offline caching (NetworkFirst for API, autoUpdate SW)
- **Code splitting**: React.lazy + ErrorBoundary for chunk loading failures
