import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { trackPageView } from '../utils/analytics';
import Disclaimer from '../components/Disclaimer';
import '../styles/B2BApiDocs.css';

/* ================================================================
   Constants
   ================================================================ */

const BASE_URL = 'https://api.foresto.co.kr/b2b/api/v1';

const SECTIONS = [
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'auth', label: '인증' },
  { id: 'endpoints', label: '엔드포인트' },
  { id: 'pricing', label: '요금제' },
  { id: 'ratelimit', label: 'Rate Limiting' },
  { id: 'errors', label: '에러 코드' },
  { id: 'response', label: '응답 형식' },
];

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/compass/{ticker}',
    desc: '단일 Compass Score 조회',
    scope: 'compass:read',
    params: [
      { name: 'ticker', location: 'path', required: true, type: 'string', desc: '종목 티커 (예: 005930)' },
    ],
    curl: `curl -X GET "${BASE_URL}/compass/005930" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`,
    python: `import requests

resp = requests.get(
    "${BASE_URL}/compass/005930",
    headers={"X-API-Key": "fc_YOUR_API_KEY"}
)
data = resp.json()
print(f"Score: {data['data']['compass_score']}")`,
    js: `const resp = await fetch("${BASE_URL}/compass/005930", {
  headers: { "X-API-Key": "fc_YOUR_API_KEY" }
});
const { data } = await resp.json();
console.log("Score:", data.compass_score);`,
    response: `{
  "success": true,
  "data": {
    "ticker": "005930",
    "company_name": "삼성전자",
    "compass_score": 72.5,
    "grade": "A",
    "grade_description": "우수",
    "summary": "재무 건전성과 기술적 지표 모두 양호",
    "categories": {
      "financial":  { "score": 80.0, "weight": "30%" },
      "valuation":  { "score": 65.0, "weight": "20%" },
      "technical":  { "score": 75.0, "weight": "30%" },
      "risk":       { "score": 68.0, "weight": "20%" }
    }
  },
  "meta": {
    "api_version": "v1",
    "request_id": "req_a1b2c3d4e5f6",
    "timestamp": "2026-03-02T12:34:56",
    "rate_limit": {
      "daily_limit": 1000,
      "daily_remaining": 958,
      "monthly_limit": 30000,
      "monthly_remaining": 28750
    }
  },
  "disclaimer": "교육 목적 참고 정보이며 투자 권유가 아닙니다"
}`,
  },
  {
    method: 'POST',
    path: '/compass/batch',
    desc: '배치 Compass Score 조회',
    scope: 'compass:read',
    params: [
      { name: 'tickers', location: 'body', required: true, type: 'string[]', desc: '티커 배열 (최대: Basic 10, Pro 50, Enterprise 200)' },
    ],
    curl: `curl -X POST "${BASE_URL}/compass/batch" \\
  -H "X-API-Key: fc_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"tickers": ["005930", "000660", "035420"]}'`,
    python: `resp = requests.post(
    "${BASE_URL}/compass/batch",
    headers={"X-API-Key": "fc_YOUR_API_KEY"},
    json={"tickers": ["005930", "000660", "035420"]}
)
for item in resp.json()["data"]:
    print(f"{item['ticker']}: {item.get('compass_score', 'N/A')}")`,
    js: `const resp = await fetch("${BASE_URL}/compass/batch", {
  method: "POST",
  headers: {
    "X-API-Key": "fc_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ tickers: ["005930", "000660", "035420"] })
});
const { data } = await resp.json();
data.forEach(item => console.log(item.ticker, item.compass_score));`,
    response: `{
  "success": true,
  "data": [
    { "ticker": "005930", "compass_score": 72.5, "grade": "A", "summary": "우수" },
    { "ticker": "000660", "compass_score": 68.1, "grade": "B+", "summary": "양호" },
    { "ticker": "035420", "compass_score": 55.3, "grade": "B", "summary": "보통" }
  ],
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
  {
    method: 'GET',
    path: '/analysis/financial/{ticker}',
    desc: '재무 분석',
    scope: 'analysis:financial',
    params: [
      { name: 'ticker', location: 'path', required: true, type: 'string', desc: '종목 티커' },
    ],
    curl: `curl -X GET "${BASE_URL}/analysis/financial/005930" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`,
    python: `resp = requests.get(
    "${BASE_URL}/analysis/financial/005930",
    headers={"X-API-Key": "fc_YOUR_API_KEY"}
)
fin = resp.json()["data"]
print(f"ROE: {fin['profitability']['roe']}")`,
    js: `const resp = await fetch("${BASE_URL}/analysis/financial/005930", {
  headers: { "X-API-Key": "fc_YOUR_API_KEY" }
});
const { data } = await resp.json();
console.log("ROE:", data.profitability.roe);`,
    response: `{
  "success": true,
  "data": {
    "ticker": "005930",
    "company_name": "삼성전자",
    "profitability": { "roe": 0.095, "roa": 0.028, "net_margin": 0.25 },
    "profit_margins": { "gross_margin": 0.46, "operating_margin": 0.32, "net_margin": 0.25 },
    "financial_health": { "debt_to_equity": 1.23, "current_ratio": 0.89, "quick_ratio": 0.87 },
    "growth": { "revenue_cagr": 0.08, "net_income_cagr": 0.12, "fcf_cagr": 0.10 }
  },
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
  {
    method: 'GET',
    path: '/analysis/valuation/{ticker}',
    desc: '밸류에이션 분석',
    scope: 'analysis:valuation',
    params: [
      { name: 'ticker', location: 'path', required: true, type: 'string', desc: '종목 티커' },
    ],
    curl: `curl -X GET "${BASE_URL}/analysis/valuation/005930" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`,
    python: `resp = requests.get(
    "${BASE_URL}/analysis/valuation/005930",
    headers={"X-API-Key": "fc_YOUR_API_KEY"}
)
val = resp.json()["data"]
print(f"PER: {val['pe_comparison']['stock_pe']}")`,
    js: `const resp = await fetch("${BASE_URL}/analysis/valuation/005930", {
  headers: { "X-API-Key": "fc_YOUR_API_KEY" }
});
const { data } = await resp.json();
console.log("PER:", data.pe_comparison.stock_pe);`,
    response: `{
  "success": true,
  "data": {
    "ticker": "005930",
    "company_name": "삼성전자",
    "pe_comparison": { "stock_pe": 12.5, "sector_avg": 18.3, "market_avg": 19.8, "percentile": 0.32 },
    "pb_comparison": { "stock_pb": 1.2, "sector_avg": 2.1, "market_avg": 3.2, "percentile": 0.28 },
    "sector_avg": { "sector": "반도체와반도체장비", "sector_pe": 18.3, "sector_pb": 2.1 }
  },
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
  {
    method: 'GET',
    path: '/analysis/technical/{ticker}',
    desc: '기술적 분석',
    scope: 'analysis:technical',
    params: [
      { name: 'ticker', location: 'path', required: true, type: 'string', desc: '종목 티커' },
    ],
    curl: `curl -X GET "${BASE_URL}/analysis/technical/005930" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`,
    python: `resp = requests.get(
    "${BASE_URL}/analysis/technical/005930",
    headers={"X-API-Key": "fc_YOUR_API_KEY"}
)
tech = resp.json()["data"]
print(f"RSI: {tech['technical_indicators']['rsi_14']}")`,
    js: `const resp = await fetch("${BASE_URL}/analysis/technical/005930", {
  headers: { "X-API-Key": "fc_YOUR_API_KEY" }
});
const { data } = await resp.json();
console.log("RSI:", data.technical_indicators.rsi_14);`,
    response: `{
  "success": true,
  "data": {
    "ticker": "005930",
    "technical_indicators": {
      "sma_50_200_alignment": "BULLISH",
      "rsi_14": 65.5,
      "macd_signal": "BULLISH",
      "bollinger_bands_position": 0.75,
      "golden_cross": true,
      "price_52w_high_distance": 0.92,
      "price_52w_low_distance": 1.45
    },
    "risk_metrics": { "volatility_20d": 0.18, "max_drawdown": 0.35 },
    "returns": { "return_1m": 0.05, "return_3m": 0.12, "return_6m": 0.28, "return_1y": 0.45 }
  },
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
  {
    method: 'POST',
    path: '/screener',
    desc: '종목 스크리너',
    scope: 'screener:read',
    params: [
      { name: 'search', location: 'body', required: false, type: 'string', desc: '종목명 또는 티커 검색' },
      { name: 'sector', location: 'body', required: false, type: 'string', desc: '섹터 필터' },
      { name: 'market', location: 'body', required: false, type: 'string', desc: 'KOSPI / KOSDAQ / KONEX' },
      { name: 'min_score', location: 'body', required: false, type: 'number', desc: '최소 Compass Score (0-100)' },
      { name: 'max_score', location: 'body', required: false, type: 'number', desc: '최대 Compass Score (0-100)' },
      { name: 'sort_by', location: 'body', required: false, type: 'string', desc: '정렬 기준 (기본: compass_score)' },
      { name: 'limit', location: 'body', required: false, type: 'number', desc: '결과 수 (1-100, 기본 20)' },
      { name: 'offset', location: 'body', required: false, type: 'number', desc: '시작 위치 (기본 0)' },
    ],
    curl: `curl -X POST "${BASE_URL}/screener" \\
  -H "X-API-Key: fc_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"market": "KOSPI", "min_score": 70, "limit": 5}'`,
    python: `resp = requests.post(
    "${BASE_URL}/screener",
    headers={"X-API-Key": "fc_YOUR_API_KEY"},
    json={"market": "KOSPI", "min_score": 70, "limit": 5}
)
for stock in resp.json()["data"]["stocks"]:
    print(f"{stock['name']}: {stock['compass_score']}")`,
    js: `const resp = await fetch("${BASE_URL}/screener", {
  method: "POST",
  headers: {
    "X-API-Key": "fc_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ market: "KOSPI", min_score: 70, limit: 5 })
});
const { data } = await resp.json();
data.stocks.forEach(s => console.log(s.name, s.compass_score));`,
    response: `{
  "success": true,
  "data": {
    "total_count": 125,
    "stocks": [
      {
        "ticker": "005930", "name": "삼성전자", "sector": "Information Technology",
        "market": "KOSPI", "current_price": 65000, "compass_score": 72.5,
        "compass_grade": "A", "price_52w_high": 75000, "price_52w_low": 55000
      }
    ]
  },
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
  {
    method: 'GET',
    path: '/market/overview',
    desc: '시장 개요',
    scope: null,
    params: [
      { name: 'top_n', location: 'query', required: false, type: 'number', desc: '상위/하위 종목 수 (1-50, 기본 10)' },
    ],
    curl: `curl -X GET "${BASE_URL}/market/overview?top_n=5" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`,
    python: `resp = requests.get(
    "${BASE_URL}/market/overview",
    headers={"X-API-Key": "fc_YOUR_API_KEY"},
    params={"top_n": 5}
)
overview = resp.json()["data"]
print(f"스코어링 종목 수: {overview['total_scored_stocks']}")`,
    js: `const resp = await fetch("${BASE_URL}/market/overview?top_n=5", {
  headers: { "X-API-Key": "fc_YOUR_API_KEY" }
});
const { data } = await resp.json();
console.log("Total scored:", data.total_scored_stocks);`,
    response: `{
  "success": true,
  "data": {
    "top_scores": [
      { "ticker": "005930", "name": "삼성전자", "compass_score": 90.5, "compass_grade": "S" }
    ],
    "bottom_scores": [
      { "ticker": "123456", "name": "Sample Corp", "compass_score": 15.0, "compass_grade": "F" }
    ],
    "total_scored_stocks": 2885
  },
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
  {
    method: 'GET',
    path: '/usage',
    desc: '사용량 조회',
    scope: null,
    params: [],
    curl: `curl -X GET "${BASE_URL}/usage" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`,
    python: `resp = requests.get(
    "${BASE_URL}/usage",
    headers={"X-API-Key": "fc_YOUR_API_KEY"}
)
usage = resp.json()["data"]
print(f"오늘: {usage['today_requests']}/{usage['daily_limit']}")`,
    js: `const resp = await fetch("${BASE_URL}/usage", {
  headers: { "X-API-Key": "fc_YOUR_API_KEY" }
});
const { data } = await resp.json();
console.log(\`Today: \${data.today_requests}/\${data.daily_limit}\`);`,
    response: `{
  "success": true,
  "data": {
    "client_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "Partner Corp",
    "plan_name": "pro",
    "today_requests": 342,
    "daily_limit": 1000,
    "month_requests": 8250,
    "monthly_limit": 30000,
    "total_requests": 125680
  },
  "meta": { "api_version": "v1", "request_id": "req_...", "timestamp": "..." }
}`,
  },
];

/* ================================================================
   Sub-components
   ================================================================ */

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  return (
    <div className="b2b-docs-code-wrap">
      <div className="b2b-docs-code-header">
        <span className="b2b-docs-code-lang">{lang}</span>
        <button
          className={`b2b-docs-copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          type="button"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="b2b-docs-code-block"><code>{code}</code></pre>
    </div>
  );
}

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('curl');
  const methodCls = ep.method === 'GET' ? 'b2b-docs-method-get' : 'b2b-docs-method-post';

  const codeMap = { curl: ep.curl, python: ep.python, javascript: ep.js };

  return (
    <div className="b2b-docs-endpoint">
      <div
        className="b2b-docs-endpoint-header"
        onClick={() => setOpen(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v); }}
      >
        <span className={`b2b-docs-method ${methodCls}`}>{ep.method}</span>
        <span className="b2b-docs-endpoint-path">{ep.path}</span>
        <span className="b2b-docs-endpoint-desc">{ep.desc}</span>
        <span className={`b2b-docs-endpoint-toggle${open ? ' open' : ''}`}>&#9660;</span>
      </div>

      {open && (
        <div className="b2b-docs-endpoint-body">
          {ep.scope && (
            <>
              <h4>Required Scope</h4>
              <span className="b2b-docs-scope">{ep.scope}</span>
            </>
          )}

          {ep.params.length > 0 && (
            <>
              <h4>Parameters</h4>
              <table className="b2b-docs-param-table">
                <thead>
                  <tr><th>Name</th><th>Location</th><th>Type</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {ep.params.map(p => (
                    <tr key={p.name}>
                      <td>
                        {p.name}
                        {p.required
                          ? <span className="b2b-docs-required">required</span>
                          : <span className="b2b-docs-optional">optional</span>
                        }
                      </td>
                      <td>{p.location}</td>
                      <td>{p.type}</td>
                      <td>{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h4>Request Example</h4>
          <div className="b2b-docs-tab-group">
            {['curl', 'python', 'javascript'].map(t => (
              <button
                key={t}
                className={`b2b-docs-tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
                type="button"
              >
                {t === 'curl' ? 'cURL' : t === 'python' ? 'Python' : 'JavaScript'}
              </button>
            ))}
          </div>
          <CodeBlock lang={tab} code={codeMap[tab]} />

          <h4>Response Example</h4>
          <CodeBlock lang="json" code={ep.response} />
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

function B2BApiDocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const sectionRefs = useRef({});

  useEffect(() => {
    trackPageView('b2b-api-docs');
  }, []);

  /* Intersection Observer for sidebar highlight */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    const ids = SECTIONS.map(s => s.id);
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        sectionRefs.current[id] = el;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    'name': 'Foresto Compass B2B API Documentation',
    'description': 'Compass Score, 재무/밸류에이션/기술적 분석, 스크리너 등 B2B API 개발자 문서',
    'url': 'https://foresto.co.kr/developers',
    'publisher': {
      '@type': 'Organization',
      'name': 'Foresto Compass',
      'url': 'https://foresto.co.kr',
    },
  }), []);

  return (
    <div className="b2b-docs-layout">
      <Helmet>
        <title>API Documentation — Foresto Compass</title>
        <meta name="description" content="Foresto Compass B2B API 개발자 문서. Compass Score, 재무 분석, 밸류에이션, 기술적 분석, 스크리너 등 8개 엔드포인트 레퍼런스. 교육 목적 참고 정보입니다." />
        <meta property="og:title" content="API Documentation — Foresto Compass" />
        <meta property="og:description" content="Compass Score 기반 B2B API 개발자 문서. 인증, 엔드포인트, 코드 예제, 요금제 정보." />
        <meta property="og:url" content="https://foresto.co.kr/developers" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── Sidebar ── */}
      <aside className="b2b-docs-sidebar">
        <nav>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`b2b-docs-sidebar-link${activeSection === s.id ? ' active' : ''}`}
              onClick={() => scrollTo(s.id)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content ── */}
      <div className="b2b-docs-content">

        {/* Hero */}
        <section className="b2b-docs-hero">
          <h1>Foresto Compass API</h1>
          <p className="b2b-docs-hero-subtitle">
            Compass Score, 재무/밸류에이션/기술적 분석, 종목 스크리너 등
            한국 주식 시장 데이터를 프로그래밍 방식으로 활용할 수 있는 RESTful API입니다.
          </p>
          <div className="b2b-docs-base-url">
            <span className="b2b-docs-base-url-label">Base URL</span>
            {BASE_URL}
          </div>
        </section>

        {/* Quick Start */}
        <section id="quickstart" className="b2b-docs-section">
          <h2>Quick Start</h2>
          <div className="b2b-docs-steps">
            <div className="b2b-docs-step">
              <div className="b2b-docs-step-num">1</div>
              <div className="b2b-docs-step-body">
                <h4>API 키 발급</h4>
                <p>B2B 계약 후 관리자로부터 <code>fc_</code> 접두사의 API 키를 발급받습니다.</p>
              </div>
            </div>
            <div className="b2b-docs-step">
              <div className="b2b-docs-step-num">2</div>
              <div className="b2b-docs-step-body">
                <h4>첫 요청 보내기</h4>
                <p><code>X-API-Key</code> 헤더에 키를 포함하여 요청합니다.</p>
              </div>
            </div>
            <div className="b2b-docs-step">
              <div className="b2b-docs-step-num">3</div>
              <div className="b2b-docs-step-body">
                <h4>응답 확인</h4>
                <p>JSON 응답의 <code>data</code> 필드에서 결과를 확인합니다.</p>
              </div>
            </div>
          </div>
          <CodeBlock
            lang="bash"
            code={`curl -X GET "${BASE_URL}/compass/005930" \\
  -H "X-API-Key: fc_YOUR_API_KEY"`}
          />
        </section>

        {/* Authentication */}
        <section id="auth" className="b2b-docs-section">
          <h2>인증 (Authentication)</h2>
          <p>
            모든 요청에 <code>X-API-Key</code> HTTP 헤더를 포함해야 합니다.
            API 키는 <code>fc_</code> 접두사 + 32자리 hex 문자열 형식입니다.
          </p>
          <CodeBlock
            lang="http"
            code={`X-API-Key: fc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`}
          />

          <div className="b2b-docs-note">
            API 키는 발급 시 1회만 표시됩니다. 분실 시 새 키를 발급받아야 합니다. 키를 소스 코드에 직접 포함하지 말고 환경 변수로 관리하세요.
          </div>

          <h3>인증 에러</h3>
          <table className="b2b-docs-error-table">
            <thead>
              <tr><th>Status</th><th>Code</th><th>설명</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">401</span></td>
                <td><code>INVALID_API_KEY</code></td>
                <td>키가 없거나 형식이 잘못된 경우</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">401</span></td>
                <td><code>API_KEY_EXPIRED</code></td>
                <td>키의 유효기간이 만료된 경우</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">403</span></td>
                <td><code>CLIENT_SUSPENDED</code></td>
                <td>클라이언트 계정이 정지된 경우</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">403</span></td>
                <td><code>INSUFFICIENT_SCOPE</code></td>
                <td>해당 엔드포인트에 필요한 스코프가 없는 경우</td>
              </tr>
            </tbody>
          </table>

          <h3>스코프 (Scopes)</h3>
          <p>
            각 API 키에는 접근 가능한 엔드포인트를 제어하는 스코프가 할당됩니다.
            와일드카드 매칭(<code>analysis:*</code>)도 지원합니다.
          </p>
          <table className="b2b-docs-param-table">
            <thead>
              <tr><th>Scope</th><th>Endpoints</th></tr>
            </thead>
            <tbody>
              <tr><td>compass:read</td><td>/compass/*, /compass/batch</td></tr>
              <tr><td>analysis:financial</td><td>/analysis/financial/*</td></tr>
              <tr><td>analysis:valuation</td><td>/analysis/valuation/*</td></tr>
              <tr><td>analysis:technical</td><td>/analysis/technical/*</td></tr>
              <tr><td>analysis:*</td><td>모든 analysis 엔드포인트</td></tr>
              <tr><td>screener:read</td><td>/screener</td></tr>
              <tr><td>market:read</td><td>/market/overview</td></tr>
            </tbody>
          </table>
        </section>

        {/* Endpoints */}
        <section id="endpoints" className="b2b-docs-section">
          <h2>엔드포인트 레퍼런스</h2>
          <p>
            총 8개의 엔드포인트를 제공합니다. 각 카드를 클릭하면 파라미터, 코드 예제, 응답 예제를 확인할 수 있습니다.
          </p>
          {ENDPOINTS.map(ep => (
            <EndpointCard key={ep.path} ep={ep} />
          ))}
        </section>

        {/* Pricing */}
        <section id="pricing" className="b2b-docs-section">
          <h2>요금제</h2>
          <div className="b2b-docs-pricing-grid">
            {/* Basic */}
            <div className="b2b-docs-pricing-card">
              <div className="b2b-docs-pricing-name">Basic</div>
              <div className="b2b-docs-pricing-price">
                300,000<span> 원/월</span>
              </div>
              <ul className="b2b-docs-pricing-features">
                <li>일 100건 / 월 3,000건</li>
                <li>초당 5건 burst</li>
                <li>배치 최대 10건</li>
                <li>Compass Score + 스크리너</li>
              </ul>
            </div>
            {/* Pro */}
            <div className="b2b-docs-pricing-card featured">
              <div className="b2b-docs-pricing-name">Pro</div>
              <div className="b2b-docs-pricing-price">
                1,000,000<span> 원/월</span>
              </div>
              <ul className="b2b-docs-pricing-features">
                <li>일 1,000건 / 월 30,000건</li>
                <li>초당 10건 burst</li>
                <li>배치 최대 50건</li>
                <li>전체 분석 + 시장 개요</li>
              </ul>
            </div>
            {/* Enterprise */}
            <div className="b2b-docs-pricing-card">
              <div className="b2b-docs-pricing-name">Enterprise</div>
              <div className="b2b-docs-pricing-price">
                3,000,000<span> 원/월</span>
              </div>
              <ul className="b2b-docs-pricing-features">
                <li>일 10,000건 / 월 300,000건</li>
                <li>초당 30건 burst</li>
                <li>배치 최대 200건</li>
                <li>전체 스코프 + 전담 지원</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Rate Limiting */}
        <section id="ratelimit" className="b2b-docs-section">
          <h2>Rate Limiting</h2>
          <p>
            3단계 rate limit이 적용됩니다. 초과 시 <code>429 Too Many Requests</code>가 반환됩니다.
          </p>
          <div className="b2b-docs-tier-grid">
            <div className="b2b-docs-tier-card">
              <h4>Burst (Token Bucket)</h4>
              <p>초당 요청 수 제한. Basic 5/sec, Pro 10/sec, Enterprise 30/sec. 토큰 자동 보충.</p>
            </div>
            <div className="b2b-docs-tier-card">
              <h4>Daily</h4>
              <p>일일 요청 수 제한. KST 00:00 기준 리셋. Basic 100, Pro 1,000, Enterprise 10,000.</p>
            </div>
            <div className="b2b-docs-tier-card">
              <h4>Monthly</h4>
              <p>월간 요청 수 제한. 매월 1일 KST 00:00 기준 리셋. Basic 3,000, Pro 30,000, Enterprise 300,000.</p>
            </div>
          </div>

          <h3>응답 헤더</h3>
          <p>매 응답에 현재 사용량 정보가 포함됩니다.</p>
          <CodeBlock
            lang="http"
            code={`X-RateLimit-Limit-Daily: 1000
X-RateLimit-Remaining-Daily: 958
X-RateLimit-Limit-Monthly: 30000
X-RateLimit-Remaining-Monthly: 28750`}
          />
        </section>

        {/* Error Codes */}
        <section id="errors" className="b2b-docs-section">
          <h2>에러 코드</h2>
          <table className="b2b-docs-error-table">
            <thead>
              <tr><th>Status</th><th>Code</th><th>설명</th><th>대응 방법</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">400</span></td>
                <td><code>BATCH_SIZE_EXCEEDED</code></td>
                <td>배치 크기 초과</td>
                <td>요금제별 최대 배치 크기 확인</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">401</span></td>
                <td><code>INVALID_API_KEY</code></td>
                <td>유효하지 않은 API 키</td>
                <td>키 형식(fc_ + 32hex) 확인</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">401</span></td>
                <td><code>API_KEY_EXPIRED</code></td>
                <td>API 키 만료</td>
                <td>새 키 발급 요청</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">403</span></td>
                <td><code>CLIENT_SUSPENDED</code></td>
                <td>계정 정지됨</td>
                <td>관리자에게 문의</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">403</span></td>
                <td><code>INSUFFICIENT_SCOPE</code></td>
                <td>스코프 부족</td>
                <td>요금제 업그레이드 또는 키 스코프 확인</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">404</span></td>
                <td>-</td>
                <td>티커 미발견</td>
                <td>종목 코드(6자리) 확인</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-4xx">429</span></td>
                <td><code>RATE_LIMIT_EXCEEDED</code></td>
                <td>요청 한도 초과</td>
                <td>Retry-After 헤더 확인 후 재시도</td>
              </tr>
              <tr>
                <td><span className="b2b-docs-status-code b2b-docs-status-5xx">500</span></td>
                <td>-</td>
                <td>서버 내부 오류</td>
                <td>잠시 후 재시도, 지속 시 문의</td>
              </tr>
            </tbody>
          </table>

          <h3>에러 응답 형식</h3>
          <CodeBlock
            lang="json"
            code={`{
  "detail": "Rate limit exceeded (daily)"
}`}
          />
        </section>

        {/* Response Format */}
        <section id="response" className="b2b-docs-section">
          <h2>응답 형식</h2>
          <p>모든 성공 응답은 다음 표준 envelope 형식을 따릅니다.</p>
          <CodeBlock
            lang="json"
            code={`{
  "success": true,
  "data": { ... },
  "meta": {
    "api_version": "v1",
    "request_id": "req_a1b2c3d4e5f6",
    "timestamp": "2026-03-02T12:34:56",
    "rate_limit": {
      "daily_limit": 1000,
      "daily_remaining": 958,
      "monthly_limit": 30000,
      "monthly_remaining": 28750
    }
  },
  "disclaimer": "교육 목적 참고 정보이며 투자 권유가 아닙니다"
}`}
          />

          <table className="b2b-docs-param-table">
            <thead>
              <tr><th>Field</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td>success</td><td>boolean</td><td>요청 성공 여부</td></tr>
              <tr><td>data</td><td>object | array</td><td>응답 데이터 (에러 시 null)</td></tr>
              <tr><td>meta</td><td>object</td><td>API 버전, 요청 ID, 타임스탬프, rate limit 정보</td></tr>
              <tr><td>disclaimer</td><td>string</td><td>법적 면책 고지</td></tr>
            </tbody>
          </table>
        </section>

        {/* Disclaimer */}
        <Disclaimer type="general" />

        {/* Back to top */}
        <button
          className="b2b-docs-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          type="button"
        >
          &#8593; 맨 위로
        </button>
      </div>
    </div>
  );
}

export default B2BApiDocsPage;
