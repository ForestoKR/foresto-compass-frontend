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
├── pages/               # Page components (38 pages)
├── components/          # Reusable (14): Header, Footer, ErrorBoundary, Disclaimer, OnboardingTour,
│                        #   ProgressModal, ProfileCompletionModal, DataTable, ProgressBar, SurveyQuestion,
│                        #   FinancialAnalysis, Valuation, QuantAnalysis, InvestmentReport
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

## Analytics (`utils/analytics.js`)

- **Mixpanel** integration via `VITE_MIXPANEL_TOKEN`
- Functions: `initAnalytics()`, `identifyUser()`, `resetAnalytics()`, `trackEvent()`, `trackPageView()`
- Initialized in `App.jsx`; gracefully no-ops if token is missing
- Key events: `signup_completed`, `login_completed`, `survey_started`, `survey_completed`, `profile_completed`, `preset_loaded`

## Onboarding & UX Components

- **OnboardingTour** (`components/OnboardingTour.jsx`): Shepherd.js 5-step guided tour, auto-triggers on first visit (`localStorage: onboarding_tour_completed`), restartable via Header menu
- **ProfileCompletionModal** (`components/ProfileCompletionModal.jsx`): Prompts incomplete profiles; used in SurveyPage, PortfolioBuilderPage, StockScreenerPage
- **Mini Diagnosis**: 3-question quick assessment embedded in LandingPage (lines 8-309)
- **GuestScreenerPage** (`/explore`): Public stock screener — no login required, limited to 20 results
- **JSON-LD**: TerminologyPage injects Schema.org `DefinedTermSet` structured data via React Helmet

## Prerendering & Vercel

- **Build-time prerender**: `@prerenderer/rollup-plugin` with `@prerenderer/renderer-jsdom` in `vite.config.js`
- **Prerendered routes**: `/`, `/login`, `/signup`, `/explore`, `/terminology`, `/guide`
- **`vercel.json`**: SPA fallback rewrite (`/(.*) → /index.html`); Vercel serves prerendered HTML first

## API Client (`services/api.js`)

- Axios instance with `VITE_API_URL` base
- Request interceptor: JWT token injection from localStorage
- Idempotency keys: auto-generated for POST/PUT/PATCH/DELETE (header `X-Idempotency-Key`)
- Response interceptor: 401 → clear token + redirect to login

## Routing (`App.jsx`)

### Public (static import — fast first paint)
- `/` — LandingPage (feature cards, Compass showcase, mini diagnosis, how-it-works)
- `/login` — LoginPage
- `/signup` — SignupPage
- `/verify-email` — EmailVerificationPage
- `/explore` — GuestScreenerPage (public stock screener, no auth required)
- `/guide` — UserGuidePage (사용 설명서, react-markdown + remark-gfm, fetches `/user-guide.md`)

### Protected (React.lazy — code split)
- `/dashboard` — MarketDashboardPage (KPI cards, watchlist, news)
- `/survey` — SurveyPage (investment profile diagnosis)
- `/result`, `/history` — DiagnosisResultPage, DiagnosisHistoryPage
- `/portfolio` — PortfolioRecommendationPage
- `/portfolio-builder` — PortfolioBuilderPage (직접 포트폴리오 구성)
- `/portfolio-evaluation` — Phase7PortfolioEvaluationPage (성과 평가/비교)
- `/backtest` — BacktestPage
- `/scenarios` — ScenarioSimulationPage
- `/analysis` — PortfolioExplanationPage (성과 해석 & 리포트)
- `/screener` — StockScreenerPage
- `/watchlist` — WatchlistPage
- `/stock-comparison` — StockComparisonPage
- `/report-history` — ReportHistoryPage
- `/profile` — ProfilePage
- `/terminology` — TerminologyPage (JSON-LD 구조화 데이터)
- `/subscription` — SubscriptionPage (구독 플랜)
- `/payment/success`, `/payment/fail` — 결제 결과 콜백

### Admin (role-based, lazy-loaded)
- `/admin` — AdminPage (대시보드)
- `/admin/data` — DataManagementPage (batch data collection + progress monitoring)
- `/admin/batch` — BatchJobsPage (백그라운드 Job 진행)
- `/admin/scheduler` — SchedulerPage (APScheduler 상태/트리거)
- `/admin/users` — UserManagementPage
- `/admin/consents` — AdminConsentPage (법적 동의 이력)
- `/admin/market-calendar` — AdminMarketCalendarPage (휴장일 관리)
- `/admin/stock-detail` — StockDetailPage
- `/admin/financial-analysis`, `/admin/valuation`, `/admin/quant` — Analysis pages
- `/admin/portfolio` — PortfolioManagementPage (프리셋 관리)
- `/admin/portfolio-comparison` — PortfolioComparisonPage
- `/admin/report` — ReportPage (투자 리포트 생성)

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

## Deployment

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Vercel (Hobby) | `https://foresto-compass-frontend.vercel.app` |
| Custom Domain | Cloudflare DNS → Vercel | `https://foresto.co.kr` |
| Backend API | Render | `https://foresto-compass-backend.onrender.com` |

- Auto-deploy: pushes to `main` trigger Vercel build
- Framework preset: Vite (auto-detected)
- `VITE_API_URL` set in Vercel Environment Variables
- Cloudflare DNS: A `foresto.co.kr` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`

## Environment Variables

`.env.development`:
```
VITE_API_URL=http://localhost:8000
VITE_MIXPANEL_TOKEN=your-mixpanel-token   # optional, analytics
```

`.env.production`:
```
VITE_API_URL=https://foresto-compass-backend.onrender.com
VITE_MIXPANEL_TOKEN=your-mixpanel-token
```

## Tech Stack

- **Framework**: React 18, Vite 5, React Router 6
- **Charts**: Chart.js
- **Styling**: CSS custom properties (theme.css) — no CSS-in-JS, no Tailwind utility classes in components
- **PWA**: Workbox + standalone + offline caching (NetworkFirst for API, autoUpdate SW)
- **Code splitting**: React.lazy + ErrorBoundary for chunk loading failures
- **Analytics**: Mixpanel (via `utils/analytics.js`)
- **Onboarding**: Shepherd.js guided tour
- **SEO**: react-helmet-async (meta tags, JSON-LD) + build-time prerendering
- **Prerendering**: `@prerenderer/rollup-plugin` + `@prerenderer/renderer-jsdom`
- **Payments**: Toss Payments SDK (`VITE_TOSS_CLIENT_KEY`)
- **Build optimization**: Manual chunks — `vendor` (React core), `charts` (Chart.js) 분리
