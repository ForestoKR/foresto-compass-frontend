import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { screenerStocks, listMarkets, listSectors, getWatchlist, addToWatchlist, removeFromWatchlist, getProfileCompletionStatus } from '../services/api';
import ProfileCompletionModal from '../components/ProfileCompletionModal';
import { trackEvent, trackPageView } from '../utils/analytics';
import '../styles/StockScreener.css';

const PAGE_SIZE = 20;

// 5그룹 등급 (S → D, 높은 순)
const GRADE_GROUPS = [
  { key: 'S', label: 'S',  desc: '90~100', min: 90, max: 100, color: '#15803d' },
  { key: 'A', label: 'A',  desc: '70~89',  min: 70, max: 89,  color: '#16a34a' },
  { key: 'B', label: 'B',  desc: '50~69',  min: 50, max: 69,  color: '#2563eb' },
  { key: 'C', label: 'C',  desc: '30~49',  min: 30, max: 49,  color: '#ea580c' },
  { key: 'D', label: 'D',  desc: '0~29',   min: 0,  max: 29,  color: '#dc2626' },
];
const MARKET_LABELS = { KOSPI: '코스피', KOSDAQ: '코스닥', KONEX: '코넥스' };
const SECTOR_LABELS = {
  'Unknown': '미분류',
  'Technology': '기술',
  'Industrials': '산업재',
  'Healthcare': '헬스케어',
  'Consumer Cyclical': '경기소비재',
  'Basic Materials': '소재',
  'Consumer Defensive': '필수소비재',
  'Financial Services': '금융서비스',
  'Communication Services': '커뮤니케이션서비스',
  'Real Estate': '부동산',
  'Utilities': '유틸리티',
  'Energy': '에너지',
};


function gradeColor(grade) {
  if (!grade) return '#6b7280';
  if (['S', 'A+', 'A'].includes(grade)) return '#16a34a';
  if (['B+', 'B'].includes(grade)) return '#2563eb';
  if (['C+', 'C'].includes(grade)) return '#ea580c';
  return '#dc2626';
}

function formatNumber(n) {
  if (n == null) return '-';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + '조';
  if (n >= 1e8) return (n / 1e8).toFixed(0) + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만';
  return n.toLocaleString();
}

function StockScreenerPage() {
  const navigate = useNavigate();

  // 필터 state
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('');
  const [sector, setSector] = useState('');
  const [gradeFrom, setGradeFrom] = useState(0);  // S (index in GRADE_GROUPS)
  const [gradeTo, setGradeTo] = useState(0);      // S (inclusive)

  // 정렬
  const [sortBy, setSortBy] = useState('compass_score');
  const [sortOrder, setSortOrder] = useState('desc');

  // 데이터
  const [stocks, setStocks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 드롭다운 옵션
  const [markets, setMarkets] = useState([]);
  const [sectors, setSectors] = useState([]);

  // 관심 종목
  const [watchlistSet, setWatchlistSet] = useState(new Set());
  const [togglingTicker, setTogglingTicker] = useState(null);

  // 프로필 모달
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 검색 debounce
  const debounceRef = useRef(null);

  // 초기 드롭다운 + 워치리스트 + 프로필 체크
  useEffect(() => {
    trackPageView('screener');
    listMarkets().then(res => setMarkets(res.data?.markets || [])).catch(() => {});
    listSectors().then(res => setSectors(res.data?.sectors || [])).catch(() => {});
    getWatchlist().then(res => {
      const tickers = (res.data?.items || []).map(i => i.ticker);
      setWatchlistSet(new Set(tickers));
    }).catch(() => {});

    // 프로필 미완성 시 모달 표시 (세션당 1회)
    const dismissed = sessionStorage.getItem('profile_modal_dismissed_screener');
    if (!dismissed) {
      getProfileCompletionStatus().then(res => {
        if (!res.data.is_complete) setShowProfileModal(true);
      }).catch(() => {});
    }
  }, []);

  // 데이터 fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        sortBy,
        sortOrder,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (search) params.search = search;
      if (market) params.market = market;
      if (sector) params.sector = sector;
      const scoreMin = GRADE_GROUPS[gradeTo].min;
      const scoreMax = GRADE_GROUPS[gradeFrom].max + 1; // max is exclusive in API (100 for S)
      if (scoreMin > 0) params.minScore = scoreMin;
      if (scoreMax <= 100) params.maxScore = scoreMax;

      const res = await screenerStocks(params);
      setStocks(res.data.stocks || []);
      setTotalCount(res.data.total_count || 0);
      if (search || market || sector || gradeFrom !== 0 || gradeTo !== 0) {
        trackEvent('screener_searched', { search, market, sector, minScore: scoreMin, maxScore: scoreMax, results: res.data.total_count || 0 });
      }
    } catch (err) {
      setError(err.response?.data?.detail || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, market, sector, gradeFrom, gradeTo, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 검색 debounce handler
  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(0);
    }, 300);
  };

  // 정렬 토글
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const sortArrow = (col) => {
    if (sortBy !== col) return '';
    return sortOrder === 'desc' ? ' ▼' : ' ▲';
  };

  // 필터 변경 시 페이지 리셋
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  // 등급 토글 핸들러: 연속 범위 양방향 확장/축소
  const handleGradeToggle = (idx) => {
    const isActive = idx >= gradeFrom && idx <= gradeTo;
    if (isActive) {
      // 끝 버튼이면 축소, 중간이면 무시
      if (idx === gradeFrom && idx === gradeTo) return; // 마지막 1개 유지
      if (idx === gradeFrom) { setGradeFrom(idx + 1); setPage(0); }
      else if (idx === gradeTo) { setGradeTo(idx - 1); setPage(0); }
    } else {
      // 비활성: 범위 확장
      if (idx < gradeFrom) { setGradeFrom(idx); setPage(0); }
      else if (idx > gradeTo) { setGradeTo(idx); setPage(0); }
    }
  };

  const handleWatchlistToggle = async (ticker, e) => {
    e.stopPropagation();
    if (togglingTicker) return;
    setTogglingTicker(ticker);
    try {
      if (watchlistSet.has(ticker)) {
        await removeFromWatchlist(ticker);
        setWatchlistSet(prev => { const next = new Set(prev); next.delete(ticker); return next; });
      } else {
        await addToWatchlist(ticker);
        setWatchlistSet(prev => new Set(prev).add(ticker));
        trackEvent('watchlist_added', { ticker });
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.detail || '관심 종목 변경에 실패했습니다.');
    } finally {
      setTogglingTicker(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="screener-page">
      <Helmet>
        <title>종목 스크리너 | Foresto Compass</title>
        <meta name="description" content="Compass Score 기반 종목 필터링 및 비교 분석 도구." />
        <meta property="og:title" content="종목 스크리너 | Foresto Compass" />
        <meta property="og:description" content="Compass Score 기반 종목 필터링 및 비교 분석 도구." />
      </Helmet>
      <div className="screener-header">
        <h1>종목 스크리너</h1>
        <p className="screener-subtitle">Compass Score 기반 종목 탐색 (교육 목적 참고 정보)</p>
      </div>

      {/* 필터 패널 */}
      <div className="screener-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="종목명 또는 코드 검색..."
            onChange={handleSearchChange}
            className="filter-search"
          />
          <select value={market} onChange={handleFilterChange(setMarket)} className="filter-select">
            <option value="">전체 시장</option>
            {markets.map(m => <option key={m} value={m}>{MARKET_LABELS[m] || m}</option>)}
          </select>
          <select value={sector} onChange={handleFilterChange(setSector)} className="filter-select">
            <option value="">전체 섹터</option>
            {sectors.map(s => {
              const code = typeof s === 'string' ? s : (s.sector_code || '');
              const name = typeof s === 'string' ? s : (s.sector_name || s.sector_code || '');
              const label = SECTOR_LABELS[name] || name;
              return (
                <option key={code} value={code}>{label}</option>
              );
            })}
          </select>
        </div>
        <div className="filter-row filter-row-secondary">
          <span className="filter-label">등급:</span>
          <div className="screener-grade-btns">
            {GRADE_GROUPS.map((g, i) => {
              const isActive = i >= gradeFrom && i <= gradeTo;
              return (
                <button
                  key={g.key}
                  type="button"
                  className={`grade-toggle-btn ${isActive ? 'active' : ''}`}
                  style={isActive ? { background: g.color, borderColor: g.color } : undefined}
                  onClick={() => handleGradeToggle(i)}
                  title={g.desc + '점'}
                >
                  <span className="grade-toggle-label">{g.label}</span>
                  <span className="grade-toggle-desc">{g.desc}</span>
                </button>
              );
            })}
          </div>
          <span className="filter-count">{totalCount}건</span>
        </div>
      </div>

      {/* 에러 */}
      {error && <div className="screener-error" role="alert">{error}</div>}

      {/* 빈 상태 */}
      {!loading && !error && stocks.length === 0 && (
        <div className="screener-empty">
          <p>검색 결과가 없습니다.</p>
          <p className="screener-empty-hint">필터를 조정하거나 다른 검색어를 시도해 보세요.</p>
        </div>
      )}

      {/* 테이블 */}
      {stocks.length > 0 && (
        <div className="screener-table-wrapper">
          <table className="screener-table">
            <thead>
              <tr>
                <th style={{width:'40px'}}></th>
                <th onClick={() => handleSort('name')} className="sortable">
                  종목명{sortArrow('name')}
                </th>
                <th>티커</th>
                <th>시장</th>
                <th onClick={() => handleSort('compass_score')} className="sortable">
                  Score{sortArrow('compass_score')}
                </th>
                <th>등급</th>
                <th onClick={() => handleSort('current_price')} className="sortable">
                  현재가{sortArrow('current_price')}
                </th>
                <th onClick={() => handleSort('market_cap')} className="sortable">
                  시가총액{sortArrow('market_cap')}
                </th>
                <th onClick={() => handleSort('pe_ratio')} className="sortable">
                  PER{sortArrow('pe_ratio')}
                </th>
                <th onClick={() => handleSort('pb_ratio')} className="sortable">
                  PBR{sortArrow('pb_ratio')}
                </th>
                <th onClick={() => handleSort('dividend_yield')} className="sortable">
                  배당률{sortArrow('dividend_yield')}
                </th>
                <th>요약</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(stock => (
                <tr
                  key={stock.ticker}
                  className="screener-row"
                  onClick={() => navigate(`/admin/stock-detail?ticker=${stock.ticker}`)}
                >
                  <td>
                    <button
                      className={`watchlist-star ${watchlistSet.has(stock.ticker) ? 'active' : ''}`}
                      onClick={(e) => handleWatchlistToggle(stock.ticker, e)}
                      disabled={togglingTicker === stock.ticker}
                      title={watchlistSet.has(stock.ticker) ? '관심 종목에서 삭제' : '관심 종목에 추가'}
                    >
                      {watchlistSet.has(stock.ticker) ? '\u2605' : '\u2606'}
                    </button>
                  </td>
                  <td className="stock-name">{stock.name || '-'}</td>
                  <td className="stock-ticker">{stock.ticker}</td>
                  <td>{MARKET_LABELS[stock.market] || stock.market || '-'}</td>
                  <td>
                    <span
                      className="compass-badge"
                      style={{ borderColor: gradeColor(stock.compass_grade) }}
                    >
                      {stock.compass_score != null ? stock.compass_score.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="grade-tag"
                      style={{ color: gradeColor(stock.compass_grade) }}
                    >
                      {stock.compass_grade || '-'}
                    </span>
                  </td>
                  <td className="num">{stock.current_price != null ? stock.current_price.toLocaleString() : '-'}</td>
                  <td className="num">{formatNumber(stock.market_cap)}</td>
                  <td className="num">{stock.pe_ratio != null ? stock.pe_ratio.toFixed(1) : '-'}</td>
                  <td className="num">{stock.pb_ratio != null ? stock.pb_ratio.toFixed(2) : '-'}</td>
                  <td className="num">{stock.dividend_yield != null ? stock.dividend_yield.toFixed(2) + '%' : '-'}</td>
                  <td className="summary-cell">{stock.compass_summary || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 로딩 */}
      {loading && <div className="screener-loading">불러오는 중...</div>}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="screener-pagination">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="pagination-btn"
          >
            이전
          </button>
          <span className="pagination-info">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="pagination-btn"
          >
            다음
          </button>
        </div>
      )}

      <p className="screener-disclaimer">
        * 교육 목적 참고 정보이며 투자 권유가 아닙니다.
      </p>

      {showProfileModal && (
        <ProfileCompletionModal
          onClose={() => {
            setShowProfileModal(false);
            sessionStorage.setItem('profile_modal_dismissed_screener', 'true');
          }}
          onComplete={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

export default StockScreenerPage;
