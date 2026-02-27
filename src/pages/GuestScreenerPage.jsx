import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { publicScreenerStocks } from '../services/api';
import Disclaimer from '../components/Disclaimer';
import '../styles/GuestScreener.css';

const MARKET_LABELS = { KOSPI: '코스피', KOSDAQ: '코스닥', KONEX: '코넥스' };

const SECTORS = [
  '음식료품', '섬유의복', '종이목재', '화학', '의약품', '비금속광물',
  '철강금속', '기계', '전기전자', '의료정밀', '운수장비', '유통업',
  '전기가스업', '건설업', '운수창고업', '통신업', '금융업', '은행',
  '증권', '보험', '서비스업', '기타제조업',
];

function GuestScreenerPage() {
  const navigate = useNavigate();

  const [stocks, setStocks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (search) params.search = search;
      if (marketFilter) params.market = marketFilter;
      if (sectorFilter) params.sector = sectorFilter;

      const res = await publicScreenerStocks(params);
      setStocks(res.data.stocks || []);
      setTotalCount(res.data.total_count || 0);
    } catch {
      setStocks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, marketFilter, sectorFilter]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const formatPrice = (price) => {
    if (price == null) return '-';
    return price.toLocaleString('ko-KR') + '원';
  };

  return (
    <div className="guest-screener-page">
      <Helmet>
        <title>종목 탐색 — Foresto Compass</title>
        <meta name="description" content="Compass Score 기반 종목 탐색. AI 4축 분석으로 평가된 한국 주식을 검색하세요." />
      </Helmet>

      <header className="guest-screener-header">
        <h1>종목 탐색</h1>
        <p>Compass Score 기반으로 한국 주식을 탐색하세요</p>
      </header>

      <div className="guest-screener-filters">
        <input
          type="text"
          className="guest-screener-search"
          placeholder="종목명 또는 종목코드 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="guest-screener-select"
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
        >
          <option value="">전체 시장</option>
          <option value="KOSPI">코스피</option>
          <option value="KOSDAQ">코스닥</option>
        </select>
        <select
          className="guest-screener-select"
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
        >
          <option value="">전체 섹터</option>
          {SECTORS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="guest-screener-loading">
          <div className="spinner"></div>
          <p>종목을 불러오는 중...</p>
        </div>
      ) : (
        <>
          <div className="guest-screener-count">
            총 {totalCount.toLocaleString()}개 종목 (최대 20개 표시)
          </div>

          <div className="guest-screener-table-wrap">
            <table className="guest-screener-table">
              <thead>
                <tr>
                  <th>종목코드</th>
                  <th>종목명</th>
                  <th>섹터</th>
                  <th>시장</th>
                  <th>현재가</th>
                  <th>Compass Score</th>
                  <th>등급</th>
                </tr>
              </thead>
              <tbody>
                {stocks.length > 0 ? (
                  stocks.map(stock => (
                    <tr key={stock.ticker}>
                      <td className="guest-screener-ticker">{stock.ticker}</td>
                      <td className="guest-screener-name">{stock.name}</td>
                      <td>{stock.sector || '-'}</td>
                      <td>{MARKET_LABELS[stock.market] || stock.market || '-'}</td>
                      <td className="guest-screener-price">{formatPrice(stock.current_price)}</td>
                      <td className="guest-screener-score">
                        {stock.compass_score != null ? stock.compass_score.toFixed(1) : '-'}
                      </td>
                      <td>
                        <span className={`guest-screener-grade grade-${(stock.compass_grade || '').replace('+', 'plus').toLowerCase()}`}>
                          {stock.compass_grade || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="guest-screener-empty">
                      조건에 맞는 종목이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="guest-screener-cta">
        <p>관심종목 추가, 상세 필터, 정렬 등 전체 기능은 회원 전용입니다</p>
        <button className="guest-screener-cta-btn" onClick={() => navigate('/signup')}>
          무료 회원가입
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}

export default GuestScreenerPage;
