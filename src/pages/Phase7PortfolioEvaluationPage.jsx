import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Disclaimer from '../components/Disclaimer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  listPhase7Portfolios,
  evaluatePhase7Portfolio,
  listPhase7Evaluations,
  getPhase7EvaluationDetail,
  comparePhase7Portfolios,
  getPhase7AvailablePeriod,
} from '../services/api';
import { trackEvent, trackPageView } from '../utils/analytics';
import '../styles/Phase7PortfolioEvaluation.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const MAX_NAV_POINTS = 200;
const COMPARISON_Y_RANGE = 40;
const COMPARISON_COLORS = [
  '#2563eb',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
];

const downsampleNavSeries = (series, maxPoints = MAX_NAV_POINTS) => {
  if (!Array.isArray(series) || series.length <= maxPoints) {
    return series || [];
  }
  const stride = Math.ceil(series.length / maxPoints);
  const sampled = series.filter((_, index) => index % stride === 0);
  const last = series[series.length - 1];
  if (last && sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
};

function Phase7PortfolioEvaluationPage() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [rebalance, setRebalance] = useState('NONE');
  const [assetClass, setAssetClass] = useState('');
  const [currency, setCurrency] = useState('');
  const [returnType, setReturnType] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyDetailError, setHistoryDetailError] = useState('');
  const [comparisonSelection, setComparisonSelection] = useState({});
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonChartData, setComparisonChartData] = useState(null);
  const [comparisonChartError, setComparisonChartError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [availablePeriod, setAvailablePeriod] = useState(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatRebalance = (value) => {
    if (!value) return '-';
    const labelMap = {
      NONE: '리밸런싱 없음',
      MONTHLY: '월간 리밸런싱',
      QUARTERLY: '분기 리밸런싱',
    };
    return labelMap[value] || value;
  };

  const buildReturnSeries = (navSeries) => {
    if (!Array.isArray(navSeries) || navSeries.length < 2) {
      return [];
    }
    const initialNav = navSeries[0]?.nav ?? 1;
    if (!initialNav) {
      return [];
    }
    return navSeries.map((point) => ({
      date: point.date,
      value: ((point.nav - initialNav) / initialNav) * 100,
    }));
  };

  const buildComparisonChartData = (seriesList) => {
    if (!seriesList || seriesList.length < 2) {
      return null;
    }
    const maps = seriesList.map((series) => {
      const map = new Map();
      series.data.forEach((point) => {
        if (point.date) {
          map.set(point.date, point.value);
        }
      });
      return map;
    });
    const dateSets = maps.map((map) => new Set(map.keys()));
    let intersection = [...dateSets[0]];
    for (let i = 1; i < dateSets.length; i += 1) {
      const nextSet = dateSets[i];
      intersection = intersection.filter((date) => nextSet.has(date));
    }
    if (intersection.length < 2) {
      return null;
    }
    intersection.sort();
    if (intersection.length > MAX_NAV_POINTS) {
      const stride = Math.ceil(intersection.length / MAX_NAV_POINTS);
      intersection = intersection.filter((_, index) => index % stride === 0);
    }
    const baseDate = intersection[0];
    return {
      labels: intersection,
      datasets: seriesList.map((series, idx) => {
        const baseValue = series.map.get(baseDate) ?? 0;
        return {
          label: series.label,
          data: intersection.map((date) => (series.map.get(date) ?? 0) - baseValue),
          borderColor: COMPARISON_COLORS[idx % COMPARISON_COLORS.length],
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          tension: 0.35,
          fill: false,
          pointRadius: 0,
          normalized: true,
        };
      }),
    };
  };

  const comparisonChartOptions = useMemo(() => {
    if (!comparisonChartData) {
      return null;
    }
    const allValues = comparisonChartData.datasets.flatMap((dataset) => dataset.data || []);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range === 0 ? 0.2 : Math.max(range * 0.05, 0.2);
    const stepSize = range === 0 ? 1 : Math.max(Math.ceil(range / 6), 1);
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: { display: false },
        y: {
          min: minValue - padding,
          max: maxValue + padding,
          grace: 0,
          ticks: {
            stepSize,
            maxTicksLimit: 7,
            callback: (value) => `${value.toFixed(0)}%`,
          },
        },
      },
    };
  }, [comparisonChartData]);

  const getToneClass = (value, type) => {
    if (value === null || value === undefined) return 'neutral';
    const abs = Math.abs(value);
    if (type === 'cumulative' || type === 'cagr') {
      if (value >= 0.12) return 'good';
      if (value >= 0.05) return 'caution';
      return 'bad';
    }
    if (type === 'volatility') {
      if (abs <= 0.15) return 'good';
      if (abs <= 0.25) return 'caution';
      return 'bad';
    }
    if (type === 'mdd') {
      if (abs <= 0.1) return 'good';
      if (abs <= 0.2) return 'caution';
      return 'bad';
    }
    return 'neutral';
  };

  const getMetricLevel = (value, type) => {
    if (value === null || value === undefined) return '정보 부족';
    const abs = Math.abs(value);
    if (type === 'cagr') {
      if (value >= 0.12) return '높음';
      if (value >= 0.08) return '양호';
      if (value >= 0.05) return '보통';
      return '낮음';
    }
    if (type === 'volatility') {
      if (abs <= 0.15) return '낮음';
      if (abs <= 0.25) return '보통';
      return '높음';
    }
    if (type === 'mdd') {
      if (abs <= 0.1) return '낮음';
      if (abs <= 0.2) return '보통';
      return '높음';
    }
    return '보통';
  };

  const buildStatusSummary = (metrics) => {
    if (!metrics) {
      return {
        title: '데이터 부족',
        grade: 'N/A',
        strengths: [],
        cautions: ['지표를 계산할 데이터가 부족합니다.'],
        tip: '기간을 넓혀 다시 평가해 보세요.',
      };
    }

    const cagrLevel = getMetricLevel(metrics.cagr, 'cagr');
    const volLevel = getMetricLevel(metrics.volatility, 'volatility');
    const mddLevel = getMetricLevel(metrics.max_drawdown, 'mdd');

    let title = '균형형';
    let grade = 'B';
    if (cagrLevel === '높음' && volLevel !== '높음' && mddLevel !== '높음') {
      title = '안정적 성장형';
      grade = 'B+';
    } else if (cagrLevel === '낮음' && (volLevel === '높음' || mddLevel === '높음')) {
      title = '방어 필요형';
      grade = 'C';
    } else if (cagrLevel === '높음' && (volLevel === '높음' || mddLevel === '높음')) {
      title = '공격적 성장형';
      grade = 'B';
    }

    const strengths = [];
    const cautions = [];

    if (cagrLevel === '높음' || cagrLevel === '양호') {
      strengths.push(`CAGR ${formatPercent(metrics.cagr)}로 수익성이 ${cagrLevel} 수준입니다.`);
    } else {
      cautions.push(`CAGR ${formatPercent(metrics.cagr)}로 수익성이 ${cagrLevel} 수준입니다.`);
    }

    if (mddLevel === '낮음' || mddLevel === '보통') {
      strengths.push(`MDD ${formatPercent(metrics.max_drawdown)}로 최대 손실폭이 관리되고 있습니다.`);
    } else {
      cautions.push(`MDD ${formatPercent(metrics.max_drawdown)}로 큰 하락 구간이 있었습니다.`);
    }

    if (volLevel === '높음') {
      cautions.push(`변동성 ${formatPercent(metrics.volatility)}로 단기 등락이 큽니다.`);
    } else {
      strengths.push(`변동성 ${formatPercent(metrics.volatility)}로 변동폭이 ${volLevel} 수준입니다.`);
    }

    return {
      title,
      grade,
      strengths,
      cautions,
      tip: '섹터 분산과 비중 조절로 변동성을 낮춰보세요.',
    };
  };

  const portfolioMap = useMemo(() => {
    const map = new Map();
    portfolios.forEach((portfolio) => map.set(portfolio.portfolio_id, portfolio));
    return map;
  }, [portfolios]);

  const uniqueHistoryItems = useMemo(() => {
    const seen = new Set();
    return historyItems.filter((item) => {
      const hash = item.result_hash;
      if (!hash) {
        return true;
      }
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }, [historyItems]);

  const summaryChartData = useMemo(() => {
    const navSeries = evaluationResult?.extensions?.nav_series || [];
    const sampledSeries = downsampleNavSeries(navSeries);
    if (sampledSeries.length < 2) {
      return null;
    }
    const initialNav = sampledSeries[0]?.nav ?? 1;
    const returns = sampledSeries.map((point) => {
      if (!initialNav) return 0;
      return ((point.nav - initialNav) / initialNav) * 100;
    });

    const minReturn = Math.min(...returns);
    const maxReturn = Math.max(...returns);
    const minIndex = returns.indexOf(minReturn);
    const maxIndex = returns.indexOf(maxReturn);
    const markers = [
      {
        x: sampledSeries[minIndex]?.date,
        y: minReturn,
        type: '최저',
      },
      {
        x: sampledSeries[maxIndex]?.date,
        y: maxReturn,
        type: '최고',
      },
    ].filter((point) => point.x);

    return {
      labels: sampledSeries.map((point) => point.date),
      datasets: [
        {
          label: '수익률(%)',
          data: returns,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          normalized: true,
        },
        {
          label: '극값',
          data: markers,
          parsing: { xAxisKey: 'x', yAxisKey: 'y' },
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false,
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
        },
      ],
    };
  }, [evaluationResult]);

  const summaryChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const base = `수익률 ${context.parsed.y.toFixed(2)}%`;
              if (context.dataset.label === '극값') {
                const type = context.raw?.type ? ` (${context.raw.type})` : '';
                return `${base}${type}`;
              }
              return base;
            },
          },
        },
      },
      scales: {
        x: { display: false },
        y: {
          ticks: {
            callback: (value) => `${value.toFixed(0)}%`,
          },
        },
      },
    }),
    []
  );

  const returnExtremes = useMemo(() => {
    const navSeries = evaluationResult?.extensions?.nav_series || [];
    if (navSeries.length < 2) {
      return null;
    }
    const initialNav = navSeries[0]?.nav ?? 1;
    const returns = navSeries.map((point) => {
      if (!initialNav) return 0;
      return ((point.nav - initialNav) / initialNav) * 100;
    });
    const minReturn = Math.min(...returns);
    const maxReturn = Math.max(...returns);
    const minIndex = returns.indexOf(minReturn);
    const maxIndex = returns.indexOf(maxReturn);
    return {
      min: {
        date: navSeries[minIndex]?.date,
        value: minReturn,
      },
      max: {
        date: navSeries[maxIndex]?.date,
        value: maxReturn,
      },
    };
  }, [evaluationResult]);

  const refreshPortfolios = async () => {
    const response = await listPhase7Portfolios();
    setPortfolios(response.data.portfolios || []);
  };

  const refreshHistory = async (portfolioId) => {
    if (!portfolioId) {
      setHistoryItems([]);
      return;
    }
    const response = await listPhase7Evaluations(portfolioId);
    setHistoryItems(response.data.evaluations || []);
  };

  useEffect(() => {
    refreshPortfolios();
    trackPageView('portfolio_evaluation');
  }, []);

  // Auto-select portfolio from navigation state (e.g., from PortfolioBuilder)
  const autoSelectDone = useRef(false);
  useEffect(() => {
    const stateId = location.state?.selectedPortfolioId;
    if (stateId && portfolios.length > 0 && !autoSelectDone.current) {
      const match = portfolios.find((p) => String(p.portfolio_id) === String(stateId));
      if (match) {
        autoSelectDone.current = true;
        setSelectedPortfolioId(String(match.portfolio_id));
      }
    }
  }, [portfolios, location.state]);

  useEffect(() => {
    if (!selectedPortfolioId) {
      setAvailablePeriod(null);
      return;
    }

    const fetchAvailablePeriod = async () => {
      try {
        const response = await getPhase7AvailablePeriod(selectedPortfolioId);
        setAvailablePeriod(response.data);
        if (response.data?.has_overlap && response.data?.start && response.data?.end) {
          setPeriodStart(response.data.start);
          setPeriodEnd(response.data.end);
        }
      } catch (err) {
        console.error('Failed to fetch available period:', err);
        setAvailablePeriod(null);
      }
    };

    fetchAvailablePeriod();
  }, [selectedPortfolioId]);

  useEffect(() => {
    refreshHistory(selectedPortfolioId);
  }, [selectedPortfolioId]);

  const handleEvaluate = async () => {
    setStatusMessage('');
    if (!selectedPortfolioId) {
      setStatusMessage('평가할 포트폴리오를 선택해 주세요.');
      return;
    }
    if (!periodStart || !periodEnd) {
      setStatusMessage('분석 기간을 입력해 주세요.');
      return;
    }
    const extensions = {};
    if (assetClass) {
      extensions.asset_class = assetClass;
    }
    if (currency) {
      extensions.currency = currency;
    }
    if (returnType) {
      extensions.return_type = returnType;
    }
    const response = await evaluatePhase7Portfolio({
      portfolio_id: Number(selectedPortfolioId),
      period: { start: periodStart, end: periodEnd },
      rebalance,
      extensions: Object.keys(extensions).length ? extensions : undefined,
    });
    setEvaluationResult(response.data);
    trackEvent('portfolio_evaluated', { portfolio_id: selectedPortfolioId, rebalance });
    console.log(
      'Phase7 evaluation extensions.nav_series length:',
      response.data?.extensions?.nav_series?.length
    );
    await refreshHistory(selectedPortfolioId);
  };

  const handleHistoryDetail = async (evaluationId) => {
    setHistoryDetailLoading(true);
    setHistoryDetailError('');
    try {
      const response = await getPhase7EvaluationDetail(evaluationId);
      setHistoryDetail(response.data);
    } catch (err) {
      console.error('Failed to load evaluation detail:', err);
      setHistoryDetail(null);
      setHistoryDetailError('상세 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const handleToggleComparison = (portfolioId) => {
    setComparisonSelection((prev) => ({
      ...prev,
      [portfolioId]: !prev[portfolioId],
    }));
  };

  const handleCompare = async () => {
    const selectedIds = Object.keys(comparisonSelection)
      .filter((id) => comparisonSelection[id])
      .map((id) => Number(id));
    if (selectedIds.length < 2) {
      setStatusMessage('비교 대상은 최소 2개가 필요합니다.');
      return;
    }
    setComparisonChartError('');
    setComparisonChartData(null);
    const response = await comparePhase7Portfolios({
      portfolio_ids: selectedIds,
    });
    setComparisonResult(response.data);
    trackEvent('portfolios_compared', { portfolio_count: selectedIds.length });
    try {
    const seriesResponses = await Promise.all(
        selectedIds.map(async (portfolioId) => {
          const historyResponse = await listPhase7Evaluations(portfolioId, 1, 0);
          const latest = historyResponse.data?.evaluations?.[0];
          if (!latest) {
            return null;
          }
          const detailResponse = await getPhase7EvaluationDetail(latest.evaluation_id);
          const navSeries = detailResponse.data?.result?.extensions?.nav_series || [];
          const returnSeries = buildReturnSeries(navSeries);
          if (returnSeries.length < 2) {
            return null;
          }
          return {
            label: portfolioMap.get(portfolioId)?.portfolio_name || `#${portfolioId}`,
            period: detailResponse.data?.result?.period,
            data: returnSeries,
            map: new Map(returnSeries.map((point) => [point.date, point.value])),
          };
        })
      );
      const validSeries = seriesResponses.filter(Boolean);
      const chartData = buildComparisonChartData(validSeries);
      if (!chartData) {
        setComparisonChartError('비교할 수 있는 공통 기간 데이터가 없습니다.');
        return;
      }
      setComparisonChartData(chartData);
      if (chartData.labels.length) {
        const start = chartData.labels[0];
        const end = chartData.labels[chartData.labels.length - 1];
        setComparisonResult((prev) => (prev ? { ...prev, common_period: { start, end } } : prev));
      }
    } catch (err) {
      console.error('Failed to build comparison chart:', err);
      setComparisonChartError('비교 차트를 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="phase7-eval-page">
      <h1 className="phase7-title">📊 포트폴리오 평가</h1>
      <p className="phase7-subtitle">
        사용자가 직접 구성한 포트폴리오의 과거 데이터 기반 성과·리스크를 확인합니다.
      </p>

      {statusMessage && <div className="phase7-status" role="alert">{statusMessage}</div>}

      <section className="phase7-card">
        <h2>1) 평가 실행</h2>
        <div className="phase7-form-row">
          <label>
            포트폴리오 선택
            <select
              value={selectedPortfolioId}
              onChange={(event) => setSelectedPortfolioId(event.target.value)}
            >
              <option value="">선택</option>
              {portfolios.map((portfolio) => (
                <option key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                  {portfolio.portfolio_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            시작일
            <div className="phase7-date-field">
              <input
                ref={startDateRef}
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
              <button
                type="button"
                className="phase7-date-button"
                onClick={() => {
                  if (startDateRef.current?.showPicker) {
                    startDateRef.current.showPicker();
                  } else {
                    startDateRef.current?.focus();
                  }
                }}
              >
                📅
              </button>
            </div>
          </label>
          <label>
            종료일
            <div className="phase7-date-field">
              <input
                ref={endDateRef}
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
              <button
                type="button"
                className="phase7-date-button"
                onClick={() => {
                  if (endDateRef.current?.showPicker) {
                    endDateRef.current.showPicker();
                  } else {
                    endDateRef.current?.focus();
                  }
                }}
              >
                📅
              </button>
            </div>
          </label>
          <label>
            리밸런싱
            <select
              value={rebalance}
              onChange={(event) => setRebalance(event.target.value)}
            >
              <option value="NONE">없음</option>
              <option value="MONTHLY">월간</option>
              <option value="QUARTERLY">분기</option>
            </select>
          </label>
        </div>
        {availablePeriod && (
          <div className="phase7-period-hint">
            {availablePeriod.has_overlap && availablePeriod.start && availablePeriod.end
              ? `사용 가능 기간: ${availablePeriod.start} ~ ${availablePeriod.end}`
              : '선택한 포트폴리오에 사용할 수 있는 기간이 없습니다.'}
          </div>
        )}
        <div className="phase7-advanced">
          <button
            type="button"
            className="phase7-advanced-toggle"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? '고급 옵션 닫기' : '고급 옵션 열기'}
          </button>
          {showAdvanced && (
            <div className="phase7-form-row phase7-advanced-panel">
              <label>
                자산군
                <select value={assetClass} onChange={(event) => setAssetClass(event.target.value)}>
                  <option value="">선택</option>
                  <option value="EQUITY">국내 주식</option>
                  <option value="BOND">채권</option>
                  <option value="COMMODITY">원자재</option>
                  <option value="GOLD">금</option>
                  <option value="REIT">리츠</option>
                  <option value="ETF">ETF</option>
                </select>
              </label>
              <label>
                통화 기준
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="">선택</option>
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label>
                수익 기준
                <select value={returnType} onChange={(event) => setReturnType(event.target.value)}>
                  <option value="">선택</option>
                  <option value="PRICE">가격 수익</option>
                  <option value="TOTAL_RETURN">총수익(배당 포함)</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <button type="button" className="phase7-primary" onClick={handleEvaluate}>
          평가 실행
        </button>

        {evaluationResult && (
          <div className="phase7-result">
            <div className="phase7-tab-header">
              <button
                type="button"
                className={`phase7-tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                요약
              </button>
              <button
                type="button"
                className={`phase7-tab ${activeTab === 'detail' ? 'active' : ''}`}
                onClick={() => setActiveTab('detail')}
              >
                분석 상세
              </button>
            </div>

            {activeTab === 'summary' && (
              <>
                <div className="phase7-summary-card">
                  <div>
                    <h3>포트폴리오 성과 요약</h3>
                    <p>
                      기간: {evaluationResult.period.start} ~ {evaluationResult.period.end}
                    </p>
                    <div className="phase7-summary-metrics">
                      <div className={`phase7-summary-metric ${getToneClass(evaluationResult.metrics.cumulative_return, 'cumulative')}`}>
                        <span>누적수익률</span>
                        <strong>{formatPercent(evaluationResult.metrics.cumulative_return)}</strong>
                      </div>
                      <div className={`phase7-summary-metric ${getToneClass(evaluationResult.metrics.cagr, 'cagr')}`}>
                        <span>CAGR</span>
                        <strong>{formatPercent(evaluationResult.metrics.cagr)}</strong>
                      </div>
                      <div className={`phase7-summary-metric ${getToneClass(evaluationResult.metrics.volatility, 'volatility')}`}>
                        <span>변동성</span>
                        <strong>{formatPercent(evaluationResult.metrics.volatility)}</strong>
                      </div>
                      <div className={`phase7-summary-metric ${getToneClass(evaluationResult.metrics.max_drawdown, 'mdd')}`}>
                        <span>MDD</span>
                        <strong>{formatPercent(evaluationResult.metrics.max_drawdown)}</strong>
                      </div>
                    </div>
                    <p className="phase7-summary-note">
                      이 지표들은 과거 데이터를 기반으로 한 학습용 분석입니다. 실제 투자 시 시장 변동성을 고려해 주세요.
                    </p>
                  </div>
                  <div className="phase7-summary-chart" role="img" aria-label="포트폴리오 평가 차트">
                    {summaryChartData ? (
                      <Line data={summaryChartData} options={summaryChartOptions} />
                    ) : (
                      <span>기간별 수익 곡선을 준비 중입니다.</span>
                    )}
                    {returnExtremes && (
                      <div className="phase7-chart-extremes">
                        <div>
                          최저 수익률: {returnExtremes.min.date} ({returnExtremes.min.value.toFixed(2)}%)
                        </div>
                        <div>
                          최고 수익률: {returnExtremes.max.date} ({returnExtremes.max.value.toFixed(2)}%)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="phase7-metric-grid">
                  <div className="phase7-metric-card">
                    <h4>누적수익률</h4>
                    <strong className={`phase7-metric-value ${getToneClass(evaluationResult.metrics.cumulative_return, 'cumulative')}`}>
                      {formatPercent(evaluationResult.metrics.cumulative_return)}
                    </strong>
                    <p>
                      시작 시점부터 현재까지의 총 수익률입니다. 기간이 길수록 복리 효과가 반영됩니다.
                    </p>
                  </div>
                  <div className="phase7-metric-card">
                    <h4>CAGR</h4>
                    <strong className={`phase7-metric-value ${getToneClass(evaluationResult.metrics.cagr, 'cagr')}`}>
                      {formatPercent(evaluationResult.metrics.cagr)}
                    </strong>
                    <p>
                      연평균 복리 수익률입니다. 장기 성과 비교에 적합하며, {getMetricLevel(evaluationResult.metrics.cagr, 'cagr')} 수준입니다.
                    </p>
                  </div>
                  <div className="phase7-metric-card">
                    <h4>변동성</h4>
                    <strong className={`phase7-metric-value ${getToneClass(evaluationResult.metrics.volatility, 'volatility')}`}>
                      {formatPercent(evaluationResult.metrics.volatility)}
                    </strong>
                    <p>
                      수익률의 표준편차로 가격 등락 폭을 의미합니다. 현재 변동성은 {getMetricLevel(evaluationResult.metrics.volatility, 'volatility')}입니다.
                    </p>
                  </div>
                  <div className="phase7-metric-card">
                    <h4>MDD</h4>
                    <strong className={`phase7-metric-value ${getToneClass(evaluationResult.metrics.max_drawdown, 'mdd')}`}>
                      {formatPercent(evaluationResult.metrics.max_drawdown)}
                    </strong>
                    <p>
                      최고점 대비 최대 하락 폭입니다. 손실 폭이 {getMetricLevel(evaluationResult.metrics.max_drawdown, 'mdd')} 수준입니다.
                    </p>
                  </div>
                </div>

                {(() => {
                  const status = buildStatusSummary(evaluationResult.metrics);
                  return (
                    <div className="phase7-status-card">
                      <div className="phase7-status-header">
                        <h4>포트폴리오 상태: {status.title}</h4>
                        <span className="phase7-grade">{status.grade}</span>
                      </div>
                      {status.strengths.length > 0 && (
                        <div className="phase7-status-line">
                          ✅ {status.strengths.join(' ')}
                        </div>
                      )}
                      {status.cautions.length > 0 && (
                        <div className="phase7-status-line">
                          ⚠️ {status.cautions.join(' ')}
                        </div>
                      )}
                      <div className="phase7-status-line">
                        💡 학습 팁: {status.tip}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {activeTab === 'detail' && (
              <>
                <h3>분석 상세</h3>
                <div className="phase7-detail-grid">
                  <div className="phase7-detail-card">
                    <h4>롤링 수익률</h4>
                    <p>3Y 데이터: {evaluationResult.extensions?.rolling_returns?.window_3y?.length || 0}건</p>
                    <p>5Y 데이터: {evaluationResult.extensions?.rolling_returns?.window_5y?.length || 0}건</p>
                  </div>
                  <div className="phase7-detail-card">
                    <h4>롤링 변동성</h4>
                    <p>3Y 데이터: {evaluationResult.extensions?.rolling_volatility?.window_3y?.length || 0}건</p>
                  </div>
                  <div className="phase7-detail-card">
                    <h4>연도별 성과</h4>
                    <p>연도 수: {evaluationResult.extensions?.yearly_returns?.length || 0}</p>
                  </div>
                  <div className="phase7-detail-card">
                    <h4>기여도</h4>
                    <p>항목 수: {evaluationResult.extensions?.contributions?.length || 0}</p>
                  </div>
                  <div className="phase7-detail-card">
                    <h4>드로다운 구간</h4>
                    <p>구간 수: {evaluationResult.extensions?.drawdown_segments?.length || 0}</p>
                  </div>
                </div>
                <div className="phase7-note">
                  표와 그래프는 계산 기준 값만 제공합니다.
                </div>
              </>
            )}

          </div>
        )}

        {evaluationResult && (
          <div className="phase7-nav-link">
            <button
              type="button"
              className="phase7-btn-link"
              onClick={() => navigate('/portfolio-builder')}
            >
              포트폴리오 수정하기 →
            </button>
          </div>
        )}
      </section>

      <section className="phase7-card">
        <h2>2) 평가 히스토리</h2>
        {uniqueHistoryItems.length === 0 ? (
          <p>평가 이력이 없습니다.</p>
        ) : (
          <ul className="phase7-history">
            {uniqueHistoryItems.map((item) => (
              <li
                key={item.evaluation_id}
                className={
                  historyDetail && historyDetail.evaluation_id === item.evaluation_id
                    ? 'phase7-history-item active'
                    : 'phase7-history-item'
                }
              >
                <span>
                  {item.period.start} ~ {item.period.end} ({formatRebalance(item.rebalance)})
                </span>
                <span className="phase7-hash">{item.result_hash}</span>
                <button type="button" onClick={() => handleHistoryDetail(item.evaluation_id)}>
                  평가보기
                </button>
                {historyDetail && historyDetail.evaluation_id === item.evaluation_id && (
                  <div className="phase7-result phase7-result-inline">
                    <h3>상세 결과</h3>
                    <p>
                      기간: {historyDetail.result.period.start} ~ {historyDetail.result.period.end}
                    </p>
                    <div className="phase7-metrics">
                      <div className="phase7-metric">
                        <span>누적수익률</span>
                        <strong>{historyDetail.result.metrics.cumulative_return}</strong>
                      </div>
                      <div className="phase7-metric">
                        <span>CAGR</span>
                        <strong>{historyDetail.result.metrics.cagr}</strong>
                      </div>
                      <div className="phase7-metric">
                        <span>변동성</span>
                        <strong>{historyDetail.result.metrics.volatility}</strong>
                      </div>
                      <div className="phase7-metric">
                        <span>MDD</span>
                        <strong>{historyDetail.result.metrics.max_drawdown}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {historyDetailLoading && <p className="phase7-muted">상세 정보를 불러오는 중입니다...</p>}
        {historyDetailError && <p className="phase7-error" role="alert">{historyDetailError}</p>}
      </section>

      <section className="phase7-card">
        <h2>3) 포트폴리오 비교</h2>
        <div className="phase7-compare-list">
          {portfolios.map((portfolio) => (
            <label key={`compare-${portfolio.portfolio_id}`}>
              <input
                type="checkbox"
                checked={!!comparisonSelection[portfolio.portfolio_id]}
                onChange={() => handleToggleComparison(portfolio.portfolio_id)}
              />
              {portfolio.portfolio_name}
            </label>
          ))}
        </div>
        <button type="button" className="phase7-primary" onClick={handleCompare}>
          비교 실행
        </button>
        {comparisonResult && (
          <div className="phase7-result">
            <h3>비교 결과</h3>
            <div className="phase7-compare-chart" role="img" aria-label="포트폴리오 비교 차트">
              {comparisonResult?.common_period && (
                <p className="phase7-compare-period">
                  공통 비교 기간: {comparisonResult.common_period.start} ~{' '}
                  {comparisonResult.common_period.end}
                </p>
              )}
              {comparisonChartData ? (
                <Line
                  data={comparisonChartData}
                  options={comparisonChartOptions}
                />
              ) : (
                <span>비교 차트를 준비 중입니다.</span>
              )}
              {comparisonChartError && <p className="phase7-error">{comparisonChartError}</p>}
            </div>
            <div className="phase7-compare-grid">
              {comparisonResult.portfolios.map((item) => (
                <div key={`compare-result-${item.portfolio_id}`} className="phase7-compare-card">
                  <div className="phase7-compare-header">
                    <span>포트폴리오</span>
                    <strong>
                      {portfolioMap.get(item.portfolio_id)?.portfolio_name ||
                        `#${item.portfolio_id}`}
                    </strong>
                  </div>
                  <p>
                    기간: {item.period.start} ~ {item.period.end}
                  </p>
                  <div className="phase7-metric">
                    <span>누적수익률</span>
                    <strong>{item.metrics.cumulative_return}</strong>
                  </div>
                  <div className="phase7-metric">
                    <span>CAGR</span>
                    <strong>{item.metrics.cagr}</strong>
                  </div>
                  <div className="phase7-metric">
                    <span>변동성</span>
                    <strong>{item.metrics.volatility}</strong>
                  </div>
                  <div className="phase7-metric">
                    <span>MDD</span>
                    <strong>{item.metrics.max_drawdown}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <div className="phase7-disclaimer phase7-disclaimer-bottom">
        <Disclaimer type="portfolio" />
      </div>
    </div>
  );
}

export default Phase7PortfolioEvaluationPage;
