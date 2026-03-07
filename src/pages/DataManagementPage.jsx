// frontend/src/pages/DataManagementPage.jsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import ProgressModal from '../components/ProgressModal';
import DataTable from '../components/DataTable';
import '../styles/DataManagement.css';

export default function DataManagementPage() {
  const [loading, setLoading] = useState(false);
  const [dataStatus, setDataStatus] = useState(null);
  const [loadResult, setLoadResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('stocks');
  const [symbolInput, setSymbolInput] = useState('');
  const [dividendTickers, setDividendTickers] = useState('');
  const [dividendBasDt, setDividendBasDt] = useState('');
  const [dividendAsOf, setDividendAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [actionYear, setActionYear] = useState(new Date().getFullYear());
  const [actionQuarter, setActionQuarter] = useState('Q1');
  const [dartFiscalYear, setDartFiscalYear] = useState(2024);
  const [dartReportType, setDartReportType] = useState('ANNUAL');
  const [dartFinLimit, setDartFinLimit] = useState('');
  const [fdrMarket, setFdrMarket] = useState('KRX');
  const [fdrAsOf, setFdrAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [bondQualityFilter, setBondQualityFilter] = useState('all');
  const [isRunAllLoading, setIsRunAllLoading] = useState(false);
  const [showRunAllConfirm, setShowRunAllConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDataStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDataStatus = async () => {
    try {
      const response = await api.getDataStatus();
      setDataStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch data status:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleLoadData = async (type) => {
    const typeNames = { stocks: '주식', etfs: 'ETF', etns: 'ETN', gold: 'ETF/ETN/금현물 시계열' };
    if (!window.confirm(`${typeNames[type]} 데이터를 수집하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setLoadResult(null);

    // 임시 task_id로 즉시 모달 표시
    const tempTaskId = `temp_${type}_${Date.now()}`;
    setCurrentTaskId(tempTaskId);

    try {
      let response;
      if (type === 'stocks') response = await api.loadStocks();
      else if (type === 'etfs') response = await api.loadETFs();
      else if (type === 'etns') response = await api.loadETNs();
      else response = await api.loadGold();

      setLoadResult(response.data);

      // 실제 task_id로 업데이트
      if (response.data.task_id) {
        setCurrentTaskId(response.data.task_id);
      }

      await fetchDataStatus();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || '데이터 수집 실패');
      setCurrentTaskId(null); // 에러 시 모달 닫기
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBonds = async () => {
    const filterLabels = {
      all: '전체 채권',
      investment_grade: '투자적격등급 (AAA~BBB) 채권',
      high_quality: '최우량 (AAA~A) 채권',
    };
    const label = filterLabels[bondQualityFilter] || '전체 채권';

    if (!window.confirm(`${label}을 조회하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setLoadResult(null);

    // 임시 task_id로 즉시 모달 표시
    const tempTaskId = `temp_bonds_${Date.now()}`;
    setCurrentTaskId(tempTaskId);

    try {
      const response = await api.loadBonds(bondQualityFilter);

      setLoadResult(response.data);

      // 실제 task_id로 업데이트
      if (response.data.task_id) {
        setCurrentTaskId(response.data.task_id);
      }

      await fetchDataStatus();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || '채권 데이터 조회 실패');
      setCurrentTaskId(null); // 에러 시 모달 닫기
    } finally {
      setLoading(false);
    }
  };

  const handleProgressComplete = useCallback(async () => {
    await fetchDataStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloseModal = useCallback(() => {
    setCurrentTaskId(null);
  }, []);

  const handleRunAllClick = () => {
    setShowRunAllConfirm(true);
  };

  const handleRunAllConfirm = async () => {
    setShowRunAllConfirm(false);
    setIsRunAllLoading(true);
    setError(null);
    try {
      const response = await api.runAllPipeline();
      if (response.data.task_id) {
        setCurrentTaskId(response.data.task_id);
      }
    } catch (err) {
      alert(err.response?.data?.detail || '파이프라인 실행 실패');
    } finally {
      setIsRunAllLoading(false);
    }
  };

  const stepBadge = (num) => (
    <span className={`dm-step-badge dm-step-${num}`}>Step {num}</span>
  );

  return (
    <div className="main-content">
      <div className="result-container">
        <div className="result-card" style={{ maxWidth: '1200px' }}>
          <button className="admin-back-btn" onClick={() => navigate('/admin')}>
            ← 관리자 홈
          </button>
          {/* Header */}
          <div className="result-header">
            <div className="result-icon" style={{ fontSize: '3rem' }}>
              ⚙️
            </div>
            <h1 className="result-type">
              데이터 관리
            </h1>
            <p className="result-subtitle">데이터 수집 파이프라인 및 현황 관리</p>
          </div>

          {/* Progress Modal */}
          {currentTaskId && (
            <ProgressModal
              taskId={currentTaskId}
              onComplete={handleProgressComplete}
              onClose={handleCloseModal}
            />
          )}

          {/* Run All Confirm Modal */}
          {showRunAllConfirm && (
            <div className="dm-confirm-overlay">
              <div className="dm-confirm-modal">
                <div className="dm-confirm-header">
                  <h3>전체 적재 파이프라인 실행</h3>
                </div>
                <div className="dm-confirm-body">
                  <div className="dm-confirm-warning">
                    <strong>주의사항을 반드시 확인하세요</strong>
                  </div>
                  <ul className="dm-confirm-list">
                    <li><strong>소요시간:</strong> 약 60~90분 (네트워크 상태에 따라 변동)</li>
                    <li><strong>서버 부하:</strong> 실행 중 외부 API를 대량 호출합니다. 다른 적재 작업과 동시 실행을 피하세요.</li>
                    <li><strong>중단 불가:</strong> 시작 후 개별 단계를 건너뛰거나 중도 취소할 수 없습니다.</li>
                    <li><strong>서버 재시작 주의:</strong> <code>--reload</code> 모드에서는 코드 변경 시 서버가 재시작되어 작업이 중단됩니다.</li>
                    <li><strong>DB 영향:</strong> 기존 데이터를 최신 값으로 덮어씁니다 (upsert). 삭제는 없습니다.</li>
                  </ul>
                  <div className="dm-confirm-steps">
                    <strong>실행 순서 (13단계)</strong>
                    <ol>
                      <li>FDR 종목 마스터</li>
                      <li>주식 데이터 수집 → ETF 데이터 수집</li>
                      <li>시계열 증분 적재 (5년치)</li>
                      <li>배당이력 전체종목 → 기업액션 5년 → 채권 전체</li>
                      <li>재무제표 FY2021 ~ FY2025 (5개년 순차)</li>
                      <li>금융상품 6종 (예금/적금/연금저축/주담대/전세대출/신용대출)</li>
                    </ol>
                  </div>
                </div>
                <div className="dm-confirm-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowRunAllConfirm(false)}
                  >
                    취소
                  </button>
                  <button
                    className="dm-run-all-btn"
                    style={{ width: 'auto', padding: '10px 24px' }}
                    onClick={handleRunAllConfirm}
                  >
                    확인, 실행합니다
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !currentTaskId && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>데이터 수집 중...</p>
            </div>
          )}

          {/* Success Message */}
          {loadResult && (
            <div className="ai-card dm-success-card">
              <h3>{loadResult.message}</h3>
              {loadResult.results && (
                <div className="dm-success-results">
                  {Object.entries(loadResult.results).map(([key, val]) => (
                    <div key={key} className="dm-success-row">
                      <span className="dm-success-row-key">{key}</span>
                      <div className="dm-success-row-vals">
                        <span style={{ color: 'var(--stock-up)' }}>+ {val.success}</span>
                        <span style={{ color: 'var(--primary)' }}>~ {val.updated}</span>
                        <span style={{ color: 'var(--stock-down)' }}>x {val.failed || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="ai-card risk-warning">
              <h3>오류 발생</h3>
              <p className="ai-content">{error}</p>
            </div>
          )}

          {/* ─── Pipeline Overview ─── */}
          <div className="dm-pipeline">
            {[
              { num: 1, label: 'FDR 종목' },
              { num: 2, label: '주식/ETF/ETN' },
              { num: 3, label: '시계열' },
              { num: 4, label: '재무/배당' },
              { num: 5, label: '금융상품' },
            ].map((step) => (
              <div key={step.num} className="dm-pipeline-step">
                <div className={`dm-pipeline-node dm-step-${step.num}`}>
                  {step.num}
                </div>
                <span className="dm-pipeline-label">{step.label}</span>
              </div>
            ))}
          </div>

          {/* ─── Data Status Cards ─── */}
          {dataStatus && (
            <div className="description-section">
              <h2>현재 데이터 현황</h2>
              <div className="dm-status-grid">
                {[
                  { label: '주식', count: dataStatus.stocks, cls: 'dm-stat-stocks' },
                  { label: 'ETF', count: dataStatus.etfs, cls: 'dm-stat-etfs' },
                  { label: '채권', count: dataStatus.bonds, cls: 'dm-stat-bonds' },
                  { label: '예금', count: dataStatus.deposits, cls: 'dm-stat-deposits' },
                  { label: '적금', count: dataStatus.savings || 0, cls: 'dm-stat-savings' },
                  { label: '연금저축', count: dataStatus.annuity_savings || 0, cls: 'dm-stat-annuity' },
                  { label: '주담대', count: dataStatus.mortgage_loans || 0, cls: 'dm-stat-mortgage' },
                  { label: '전세대출', count: dataStatus.rent_house_loans || 0, cls: 'dm-stat-rent' },
                  { label: '신용대출', count: dataStatus.credit_loans || 0, cls: 'dm-stat-credit' },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="score-card">
                    <div className="score-label">{label}</div>
                    <div className={`score-value ${cls}`}>{count}건</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 전체 적재 파이프라인 ─── */}
          <div className="description-section dm-section">
            <div className="dm-run-all-panel">
              <h3>전체 적재 파이프라인</h3>
              <p>Step 1~6 전체를 순차 실행합니다 (약 60-90분 소요)</p>
              <ul>
                <li>종목 마스터 → 주식/ETF → 시계열 5년</li>
                <li>배당 전체종목 → 기업액션 5년 → 채권 전체</li>
                <li>재무제표 FY2021~2025 → 금융상품 6종</li>
              </ul>
              <button
                onClick={handleRunAllClick}
                disabled={isRunAllLoading || loading}
                className="dm-run-all-btn"
              >
                {isRunAllLoading ? '파이프라인 시작 중...' : '전체 적재 실행'}
              </button>
            </div>
          </div>

          {/* ─── Step 1: FDR 종목 마스터 ─── */}
          <div className="description-section dm-section">
            <h2>{stepBadge(1)} FDR 종목 마스터</h2>
            <p className="dm-section-subtitle">
              종목 마스터 적재 (Stage 1). Marcap/발행주식수 포함. 이후 모든 수집의 기초 데이터입니다.
            </p>
            <div className="dm-grid">
              <div className="dm-card">
                <label className="dm-label">시장</label>
                <select
                  value={fdrMarket}
                  onChange={(e) => setFdrMarket(e.target.value)}
                  className="dm-input dm-input-mb"
                >
                  <option value="KRX">KRX 전체</option>
                  <option value="KOSPI">KOSPI</option>
                  <option value="KOSDAQ">KOSDAQ</option>
                  <option value="KONEX">KONEX</option>
                </select>
                <label className="dm-label">기준일</label>
                <input
                  type="date"
                  value={fdrAsOf}
                  onChange={(e) => setFdrAsOf(e.target.value)}
                  className="dm-input dm-input-mb-lg"
                />
                <div className="dm-card-actions">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const response = await api.loadFdrStockListing({
                          market: fdrMarket,
                          as_of_date: fdrAsOf,
                        });
                        alert(response.data.message);
                      } catch (err) {
                        alert(err.response?.data?.error?.message || err.response?.data?.detail || 'FDR 종목 마스터 적재 실패');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="btn btn-secondary dm-btn-full"
                  >
                    FDR 종목 마스터 적재
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Step 2: 주식/ETF/ETN 수집 ─── */}
          <div className="description-section dm-section">
            <h2>{stepBadge(2)} 주식 / ETF / ETN 수집</h2>
            <p className="dm-section-subtitle">
              FDR 종목 마스터 기반으로 DB 시세 데이터에서 현재가, 수익률 등을 계산합니다.
            </p>
            <div className="dm-grid-3col">
              <button
                onClick={() => handleLoadData('stocks')}
                disabled={loading}
                className="btn btn-primary dm-btn-action"
              >
                주식 데이터 수집
              </button>
              <button
                onClick={() => handleLoadData('etfs')}
                disabled={loading}
                className="btn btn-primary dm-btn-action"
              >
                ETF 데이터 수집
              </button>
              <button
                onClick={() => handleLoadData('etns')}
                disabled={loading}
                className="btn btn-primary dm-btn-action"
              >
                ETN 데이터 수집
              </button>
            </div>
          </div>

          {/* ─── Step 3: pykrx 시계열 ─── */}
          <div className="description-section dm-section">
            <h2>{stepBadge(3)} KRX Open API 시계열 데이터</h2>
            <p className="dm-section-subtitle">
              KRX 공식 데이터로 과거 가격(OHLCV)을 수집합니다. 일 9,500건 한도.
            </p>

            {/* ETF/ETN/금현물 시계열 수집 */}
            <div className="dm-panel">
              <h3>ETF / ETN / 금현물 시계열 수집</h3>
              <p className="dm-hint" style={{ marginBottom: 8 }}>
                KRX API로 ETF·ETN·금현물의 일별 OHLCV를 etf_price_daily 테이블에 적재합니다. API 3회 호출.
              </p>
              <button
                onClick={() => handleLoadData('gold')}
                disabled={loading}
                className="btn btn-primary dm-btn-full-bold"
              >
                ETF/ETN/금현물 시계열 수집
              </button>
            </div>

            {/* 단일 종목 */}
            <div className="dm-panel">
              <h3>단일 종목 시계열</h3>
              <div className="dm-grid-2col-sm">
                <div>
                  <label className="dm-label">종목 코드 (6자리)</label>
                  <input
                    type="text"
                    placeholder="005930"
                    maxLength={6}
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="dm-input"
                  />
                </div>
                <div>
                  <label className="dm-label">적재 시작 년월</label>
                  <input
                    type="month"
                    id="krx-timeseries-start-month"
                    defaultValue="2021-01"
                    className="dm-input"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  const ticker = symbolInput.trim();
                  if (!ticker || ticker.length !== 6) {
                    alert('6자리 종목 코드를 입력하세요');
                    return;
                  }
                  const startMonth = document.getElementById('krx-timeseries-start-month').value;
                  if (!startMonth) {
                    alert('적재 시작 년월을 선택하세요');
                    return;
                  }
                  setLoading(true);
                  setError(null);
                  try {
                    const response = await api.loadKrxTimeseriesStock(ticker, startMonth);
                    const data = response.data;
                    alert(`${ticker} 시계열 ${data.records_added}건 수집 완료`);
                    await fetchDataStatus();
                  } catch (err) {
                    alert(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn btn-primary dm-btn-full-bold"
              >
                시계열 데이터 수집
              </button>
              <p className="dm-hint">
                예: 005930 (삼성전자), 000660 (SK하이닉스), 035420 (NAVER)
              </p>
            </div>

            {/* 전체 종목 증분 적재 */}
            <div className="dm-panel-green">
              <h3>전체 종목 5년치 증분 적재</h3>
              <p className="dm-panel-green-desc">
                stocks 테이블 기준 전 종목 대상. 기존 종목은 마지막 적재일 이후만 수집합니다.
              </p>
              <div className="dm-grid-2col-sm">
                <div>
                  <label className="dm-label">시장</label>
                  <select id="incremental-market" className="dm-input">
                    <option value="">KRX 전체</option>
                    <option value="KOSPI">KOSPI</option>
                    <option value="KOSDAQ">KOSDAQ</option>
                  </select>
                </div>
                <div>
                  <label className="dm-label">스레드 수</label>
                  <select id="incremental-workers" className="dm-input">
                    <option value="2">2 (저부하)</option>
                    <option value="4">4 (권장)</option>
                    <option value="6">6</option>
                    <option value="8">8 (고성능)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={async () => {
                  const market = document.getElementById('incremental-market').value || null;
                  const numWorkers = Number(document.getElementById('incremental-workers').value) || 4;
                  const marketLabel = market || 'KRX 전체';

                  if (!window.confirm(
                    `[${marketLabel}] 전 종목 5년치 증분 적재를 시작하시겠습니까?\n\n` +
                    `- 신규: 5년치 수집 / 기존: 증분만 수집\n` +
                    `- 스레드: ${numWorkers}개\n` +
                    `- 첫 실행 시 4-6시간 소요될 수 있습니다.`
                  )) {
                    return;
                  }

                  setLoading(true);
                  setError(null);
                  const tempTaskId = `temp_incremental_${Date.now()}`;
                  setCurrentTaskId(tempTaskId);

                  try {
                    const res = await api.loadStocksIncremental({
                      default_days: 1825,
                      num_workers: numWorkers,
                      market: market,
                    });
                    if (res.data.task_id) {
                      setCurrentTaskId(res.data.task_id);
                    }
                    await fetchDataStatus();
                  } catch (err) {
                    alert(err.response?.data?.error?.message || err.response?.data?.detail || '증분 적재 시작 실패');
                    setCurrentTaskId(null);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn btn-success dm-btn-incremental"
              >
                {loading ? '시작 중...' : '전체 종목 5년치 증분 적재'}
              </button>
              <p className="dm-hint-dark">
                첫 실행: 약 4-6시간 (야간 권장) / 재실행: 약 10-30분 (증분만)
              </p>
            </div>
          </div>

          {/* ─── Step 4: 재무/배당/기업액션/채권 ─── */}
          <div className="description-section dm-section">
            <h2>{stepBadge(4)} 재무 / 배당 / 기업액션 / 채권</h2>
            <p className="dm-section-subtitle">
              DART API, 금융위원회 OpenAPI를 통해 재무제표, 배당, 기업 액션, 채권 데이터를 적재합니다.
            </p>

            <div className="dm-grid">
              {/* 재무제표 + PER/PBR */}
              <div className="dm-card">
                <h3>재무제표 + PER/PBR</h3>
                <p className="dm-card-sub">DART 사업보고서 기반. 백그라운드 실행.</p>
                <label className="dm-label">회계연도</label>
                <input
                  type="number"
                  value={dartFiscalYear}
                  onChange={(e) => setDartFiscalYear(Number(e.target.value))}
                  className="dm-input dm-input-mb"
                />
                <label className="dm-label">보고서 종류</label>
                <select
                  value={dartReportType}
                  onChange={(e) => setDartReportType(e.target.value)}
                  className="dm-input dm-input-mb"
                >
                  <option value="ANNUAL">사업보고서 (ANNUAL)</option>
                  <option value="Q3">3분기보고서</option>
                  <option value="Q2">반기보고서</option>
                  <option value="Q1">1분기보고서</option>
                </select>
                <label className="dm-label">종목 수 제한</label>
                <input
                  type="number"
                  value={dartFinLimit}
                  onChange={(e) => setDartFinLimit(e.target.value)}
                  placeholder="빈 칸 = 전체 (시가총액 상위 순)"
                  min={1}
                  max={5000}
                  className="dm-input dm-input-mb-lg"
                />
                <div className="dm-card-actions">
                  <p className="dm-hint-sm">종목당 ~0.1초 (DART 분당 1,000건 제한)</p>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`FY${dartFiscalYear} ${dartReportType} 재무제표를 수집합니까?`)) return;
                      setLoading(true);
                      try {
                        const params = { fiscal_year: dartFiscalYear, report_type: dartReportType };
                        if (dartFinLimit) params.limit = Number(dartFinLimit);
                        const res = await api.loadDartFinancials(params);
                        setCurrentTaskId(res.data.task_id);
                        alert('DART 재무제표 수집 시작됨\ntask_id: ' + res.data.task_id);
                        await fetchDataStatus();
                      } catch (err) {
                        alert(err.response?.data?.error?.message || err.response?.data?.detail || 'DART 재무제표 적재 실패');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="btn btn-primary dm-btn-full"
                  >
                    재무제표 적재 (DART)
                  </button>
                </div>
              </div>

              {/* 배당 이력 */}
              <div className="dm-card">
                <h3>배당 이력</h3>
                <p className="dm-card-sub">금융위원회 OpenAPI</p>
                <label className="dm-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dividendTickers === '__ALL__'}
                    onChange={(e) => setDividendTickers(e.target.checked ? '__ALL__' : '')}
                  />
                  전체 종목 (백그라운드 실행)
                </label>
                {dividendTickers !== '__ALL__' && (
                  <>
                    <label className="dm-label">종목 코드 (쉼표 구분)</label>
                    <input
                      type="text"
                      value={dividendTickers}
                      onChange={(e) => setDividendTickers(e.target.value)}
                      placeholder="005930,000660"
                      className="dm-input dm-input-mb"
                    />
                  </>
                )}
                <label className="dm-label">기준일 (as_of_date)</label>
                <input
                  type="date"
                  value={dividendAsOf}
                  onChange={(e) => setDividendAsOf(e.target.value)}
                  className="dm-input dm-input-mb"
                />
                <label className="dm-label">기준일자 (YYYYMMDD, 선택)</label>
                <input
                  type="text"
                  value={dividendBasDt}
                  onChange={(e) => setDividendBasDt(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="비워두면 전체 조회"
                  className="dm-input dm-input-mb-lg"
                />
                <div className="dm-card-actions">
                  {dividendTickers === '__ALL__' && (
                    <p className="dm-hint-sm">전체 종목 대상 백그라운드 실행 (약 3-5분 소요)</p>
                  )}
                  <button
                    onClick={async () => {
                      const isAllMode = dividendTickers === '__ALL__';
                      const tickers = isAllMode
                        ? []
                        : dividendTickers.split(',').map((t) => t.trim()).filter(Boolean);
                      if (!isAllMode && tickers.length === 0) {
                        alert('종목 코드를 입력하세요');
                        return;
                      }
                      setLoading(true);
                      setError(null);
                      try {
                        const response = await api.loadFscDividends({
                          tickers,
                          bas_dt: dividendBasDt || null,
                          as_of_date: dividendAsOf,
                        });
                        if (response.data.task_id) {
                          setCurrentTaskId(response.data.task_id);
                        }
                        alert(response.data.message);
                      } catch (err) {
                        alert(err.response?.data?.error?.message || err.response?.data?.detail || '배당 이력 적재 실패');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="btn btn-primary dm-btn-full"
                  >
                    {dividendTickers === '__ALL__' ? '배당 이력 전체 적재 (FSC)' : '배당 이력 적재 (FSC)'}
                  </button>
                </div>
              </div>

              {/* 배당수익률 업데이트 */}
              <div className="dm-card">
                <h3>배당수익률 업데이트</h3>
                <p className="dm-card-sub">dividend_history → stocks.dividend_yield</p>
                <p className="dm-hint-sm">
                  최근 12개월 배당금 합산 ÷ 현재가 × 100 으로 배당수익률을 계산하여 종목 테이블에 반영합니다.
                  배당 이력 적재 후 실행하세요.
                </p>
                <div className="dm-card-actions">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const response = await api.updateDividendYields();
                        const r = response.data.result;
                        alert(`배당수익률 업데이트 완료\n업데이트: ${r.updated}건\n이상값 제외: ${r.skipped_outlier}건\n주가 없음: ${r.skipped_no_price}건`);
                      } catch (err) {
                        alert(err.response?.data?.error?.message || err.response?.data?.detail || '배당수익률 업데이트 실패');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="btn btn-primary dm-btn-full"
                  >
                    배당수익률 업데이트
                  </button>
                </div>
              </div>

              {/* 기업 액션 */}
              <div className="dm-card">
                <h3>기업 액션</h3>
                <p className="dm-card-sub">DART 공시 (분할/합병/감자)</p>
                <label className="dm-label">연도</label>
                <input
                  type="number"
                  value={actionYear}
                  onChange={(e) => setActionYear(Number(e.target.value))}
                  min={2015}
                  max={2030}
                  className="dm-input dm-input-mb"
                />
                <label className="dm-label">분기</label>
                <select
                  value={actionQuarter}
                  onChange={(e) => setActionQuarter(e.target.value)}
                  className="dm-input dm-input-mb-lg"
                >
                  <option value="Q1">Q1 (1~3월)</option>
                  <option value="Q2">Q2 (4~6월)</option>
                  <option value="Q3">Q3 (7~9월)</option>
                  <option value="Q4">Q4 (10~12월)</option>
                  <option value="ALL">전체 (1~12월)</option>
                </select>
                <div className="dm-card-actions">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      const tempId = `temp_corp_action_${Date.now()}`;
                      setCurrentTaskId(tempId);
                      try {
                        const response = await api.loadDartCorporateActions({
                          year: actionYear,
                          quarter: actionQuarter,
                        });
                        if (response.data.task_id) {
                          setCurrentTaskId(response.data.task_id);
                        }
                      } catch (err) {
                        alert(err.response?.data?.error?.message || err.response?.data?.detail || '기업 액션 적재 실패');
                        setCurrentTaskId(null);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="btn btn-primary dm-btn-full"
                  >
                    기업 액션 적재
                  </button>
                </div>
              </div>

              {/* 채권 */}
              <div className="dm-card">
                <h3>채권 기본정보</h3>
                <p className="dm-card-sub">금융위원회 OpenAPI</p>
                <label className="dm-label">등급 필터</label>
                <select
                  value={bondQualityFilter}
                  onChange={(e) => setBondQualityFilter(e.target.value)}
                  className="dm-input dm-input-mb-lg"
                >
                  <option value="all">전체 채권</option>
                  <option value="investment_grade">투자적격등급 (AAA~BBB)</option>
                  <option value="high_quality">최우량 (AAA~A)</option>
                </select>
                <div className="dm-card-actions">
                  <p className="dm-hint-sm">오늘 기준일로 선택 등급 채권을 조회</p>
                  <button
                    onClick={handleLoadBonds}
                    disabled={loading}
                    className="btn btn-primary dm-btn-full-bold"
                  >
                    채권 데이터 조회
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Step 5: 금융감독원 금융상품 ─── */}
          <div className="description-section dm-section">
            <h2>{stepBadge(5)} 금융감독원 금융상품</h2>
            <p className="dm-section-subtitle">
              FSS API (finlife.fss.or.kr)를 통해 예금/적금/연금/대출 상품을 수집합니다.
            </p>

            <div className="dm-grid">
              {[
                { title: '정기예금', fn: () => api.loadDeposits(), taskPrefix: 'deposits' },
                { title: '적금', fn: () => api.loadSavings(), taskPrefix: 'savings' },
                { title: '연금저축', fn: () => api.loadAnnuitySavings(), taskPrefix: 'annuity' },
                { title: '주택담보대출', fn: () => api.loadMortgageLoans(), taskPrefix: 'mortgage' },
                { title: '전세자금대출', fn: () => api.loadRentHouseLoans(), taskPrefix: 'rentloan' },
                { title: '개인신용대출', fn: () => api.loadCreditLoans(), taskPrefix: 'creditloan' },
              ].map(({ title, fn, taskPrefix }) => (
                <div key={taskPrefix} className="dm-card">
                  <h3 className="dm-fss-title">{title}</h3>
                  <div className="dm-card-actions">
                    <button
                      onClick={async () => {
                        if (!window.confirm(`FSS ${title} 상품을 조회하시겠습니까?`)) return;
                        setLoading(true);
                        setError(null);
                        const tempId = `temp_${taskPrefix}_${Date.now()}`;
                        setCurrentTaskId(tempId);
                        try {
                          const res = await fn();
                          if (res.data.task_id) setCurrentTaskId(res.data.task_id);
                          await fetchDataStatus();
                        } catch (err) {
                          alert(err.response?.data?.error?.message || err.response?.data?.detail || `${title} 적재 실패`);
                          setCurrentTaskId(null);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="btn btn-primary dm-btn-full"
                    >
                      {title} 조회
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 수집 스케줄 모니터링 (SchedulerPage 이동) ─── */}
          <div className="description-section dm-section">
            <div className="dm-panel" style={{ textAlign: 'center' }}>
              <h3>🗓️ 수집 스케줄 모니터링</h3>
              <p className="dm-section-subtitle" style={{ margin: '8px 0 16px' }}>
                자동 수집 스케줄 상태, 실행 이력, 요약 통계는 스케줄 관리 페이지에서 확인하세요.
              </p>
              <button
                onClick={() => navigate('/admin/scheduler')}
                className="btn btn-primary"
                style={{ padding: '10px 28px' }}
              >
                스케줄 관리 페이지로 이동 →
              </button>
            </div>
          </div>

          {/* ─── Data View ─── */}
          {dataStatus && dataStatus.total > 0 && (
            <div className="description-section dm-section">
              <h2>적재된 데이터 조회</h2>

              <div className="dm-tab-row">
                {dataStatus.stocks > 0 && (
                  <button
                    onClick={() => setActiveTab('stocks')}
                    className={activeTab === 'stocks' ? 'btn btn-primary' : 'btn btn-secondary'}
                  >
                    주식 ({dataStatus.stocks})
                  </button>
                )}
                {dataStatus.etfs > 0 && (
                  <button
                    onClick={() => setActiveTab('etfs')}
                    className={activeTab === 'etfs' ? 'btn btn-primary' : 'btn btn-secondary'}
                  >
                    ETF ({dataStatus.etfs})
                  </button>
                )}
                {dataStatus.bonds > 0 && (
                  <button
                    onClick={() => setActiveTab('bonds')}
                    className={activeTab === 'bonds' ? 'btn btn-primary' : 'btn btn-secondary'}
                  >
                    채권 ({dataStatus.bonds})
                  </button>
                )}
                {dataStatus.deposits > 0 && (
                  <button
                    onClick={() => setActiveTab('deposits')}
                    className={activeTab === 'deposits' ? 'btn btn-primary' : 'btn btn-secondary'}
                  >
                    예적금 ({dataStatus.deposits})
                  </button>
                )}
              </div>

              <div className="dm-tab-content">
                {activeTab === 'stocks' && dataStatus.stocks > 0 && (
                  <DataTable type="stocks" fetchData={() => api.getStocks(0, 100)} />
                )}
                {activeTab === 'etfs' && dataStatus.etfs > 0 && (
                  <DataTable type="etfs" fetchData={() => api.getETFs(0, 100)} />
                )}
                {activeTab === 'bonds' && dataStatus.bonds > 0 && (
                  <DataTable type="bonds" fetchData={() => api.getBonds(0, 100)} />
                )}
                {activeTab === 'deposits' && dataStatus.deposits > 0 && (
                  <DataTable type="deposits" fetchData={() => api.getDeposits(0, 100)} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
