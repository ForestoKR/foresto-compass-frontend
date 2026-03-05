import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScenarios, getScenarioDetail, runBacktest } from '../services/api';
import Disclaimer from '../components/Disclaimer';
import { trackEvent, trackPageView } from '../utils/analytics';
import { formatCurrency, formatPercent } from '../utils/formatting';
import { downsampleData, buildChartOptions, buildDrawdownChartData, Line } from '../utils/chartUtils';
import '../styles/ScenarioSimulation.css';

function ScenarioSimulationPage() {
  const navigate = useNavigate();
  const resultRef = useRef(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioDetail, setScenarioDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);

  // 시뮬레이션 설정
  const [periodYears, setPeriodYears] = useState(3);
  const [investmentAmount, setInvestmentAmount] = useState(10000000);
  const [maxLossLimit, setMaxLossLimit] = useState(20);

  // 인페이지 결과
  const [simulationResult, setSimulationResult] = useState(null);
  const [resultScenarioName, setResultScenarioName] = useState('');

  useEffect(() => {
    loadScenarios();
    trackPageView('scenario_simulation');
  }, []);

  useEffect(() => {
    if (selectedScenario) {
      loadScenarioDetail(selectedScenario);
    }
  }, [selectedScenario]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const response = await getScenarios();
      setScenarios(response.data);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
      setError('시나리오 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadScenarioDetail = async (scenarioId) => {
    try {
      const response = await getScenarioDetail(scenarioId);
      setScenarioDetail(response.data);
    } catch (err) {
      console.error('Failed to load scenario detail:', err);
    }
  };

  const validateAmount = () => {
    if (!investmentAmount || investmentAmount <= 0) {
      setError('투자 금액을 입력해주세요.');
      return false;
    }
    if (investmentAmount < 10000) {
      setError('투자 금액은 최소 10,000원 이상이어야 합니다.');
      return false;
    }
    if (investmentAmount > 1000000000) {
      setError('투자 금액은 최대 10억원까지 가능합니다.');
      return false;
    }
    return true;
  };

  const runSimulation = async () => {
    if (!selectedScenario || !scenarioDetail) {
      setError('시나리오를 선택해주세요.');
      return;
    }
    if (!validateAmount()) return;

    try {
      setSimulating(true);
      setError(null);

      const response = await runBacktest({
        portfolio: {
          allocation: scenarioDetail.allocation,
          securities: []
        },
        investment_amount: investmentAmount,
        period_years: periodYears,
        rebalance_frequency: 'quarterly'
      });

      const data = response.data.data;
      setSimulationResult(data);
      setResultScenarioName(scenarioDetail.name_ko);
      trackEvent('scenario_simulation_run', { scenario_id: selectedScenario, period_years: periodYears });

      // 결과 섹션으로 스크롤
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Simulation error:', err);
      if (err.response?.status === 429) {
        setError('모의실험은 시간당 5회만 가능합니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(err.response?.data?.detail || '모의실험 실행 중 오류가 발생했습니다.');
      }
    } finally {
      setSimulating(false);
    }
  };

  const formatPercentSigned = (value) => formatPercent(value, 2, true);

  // 시나리오 카드 색상
  const getScenarioColor = (scenarioId) => {
    const colors = {
      'MIN_VOL': '#4CAF50',
      'DEFENSIVE': '#2196F3',
      'GROWTH': '#FF9800'
    };
    return colors[scenarioId] || '#667eea';
  };

  // 결과 차트 데이터
  const growthChartData = useMemo(() => {
    if (!simulationResult?.daily_values) return null;
    const data = downsampleData(simulationResult.daily_values);
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary').trim() || '#667eea';
    return {
      labels: data.map(d => d.date.slice(0, 10)),
      datasets: [{
        label: '자산 가치 (원)',
        data: data.map(d => d.value),
        borderColor: primaryColor,
        backgroundColor: primaryColor + '20',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      }],
    };
  }, [simulationResult]);

  const drawdownChartData = useMemo(() => {
    if (!simulationResult?.daily_values) return null;
    const data = downsampleData(simulationResult.daily_values);
    return buildDrawdownChartData(data);
  }, [simulationResult]);

  if (loading) {
    return (
      <div className="scenario-page">
        <div className="scenario-loading" aria-busy="true" aria-live="polite">
          <div className="scenario-spinner"></div>
          <p>시나리오를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scenario-page">
      {/* 헤더 */}
      <div className="scenario-header">
        <h1>시나리오 기반 모의실험</h1>
        <p className="subtitle">
          설문 없이 바로 시작하세요. 학습 목표에 맞는 시나리오를 선택하고 모의실험을 실행해보세요.
        </p>
      </div>

      {/* 안내 섹션 (시나리오 미선택 시) */}
      {!selectedScenario && (
        <div className="info-section">
          <h3>시나리오 기반 학습이란?</h3>
          <p>
            설문 없이도 바로 투자 전략을 학습할 수 있는 방법입니다.
            미리 정의된 시나리오를 선택하고, 과거 데이터를 기반으로 모의실험을 실행하여
            각 전략의 특성을 이해할 수 있습니다.
          </p>

          <h3>어떤 시나리오를 선택해야 할까요?</h3>
          <ul>
            <li><strong>변동성 최소화</strong>: 안정성을 최우선으로 하는 전략을 학습하고 싶은 경우</li>
            <li><strong>방어형</strong>: 시장 하락에 대비하는 방어적 전략을 이해하고 싶은 경우</li>
            <li><strong>성장형</strong>: 장기적 자산 성장 전략의 특성을 파악하고 싶은 경우</li>
          </ul>

          <h3>용어가 어렵다면?</h3>
          <p>
            투자 용어가 생소하다면{' '}
            <button
              className="ss-link-btn"
              onClick={() => navigate('/terminology')}
            >
              용어학습 도구
            </button>
            를 이용해 보세요. 설문을 완료하지 않아도 모의실험은 언제든 이용 가능합니다.
          </p>
        </div>
      )}

      {/* 시나리오 선택 */}
      <div className="scenario-selection">
        <h2>1. 학습 시나리오 선택</h2>
        <div className="scenario-cards">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`scenario-card ${selectedScenario === scenario.id ? 'selected' : ''}`}
              onClick={() => setSelectedScenario(scenario.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedScenario(scenario.id); } }}
              role="button"
              tabIndex={0}
              aria-pressed={selectedScenario === scenario.id}
              style={{
                borderColor: selectedScenario === scenario.id ? getScenarioColor(scenario.id) : undefined
              }}
            >
              <div
                className="scenario-icon"
                style={{ backgroundColor: getScenarioColor(scenario.id) }}
              >
                {scenario.id === 'MIN_VOL' && '🛡️'}
                {scenario.id === 'DEFENSIVE' && '⚖️'}
                {scenario.id === 'GROWTH' && '📈'}
              </div>
              <h3>{scenario.name_ko}</h3>
              <p className="scenario-desc">{scenario.short_description}</p>
              {selectedScenario === scenario.id && (
                <div className="selected-badge">선택됨</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 시나리오 상세 정보 */}
      {scenarioDetail && (
        <div className="scenario-detail">
          <h2>선택한 시나리오: {scenarioDetail.name_ko}</h2>
          <p className="detail-description">{scenarioDetail.description}</p>

          <div className="detail-grid">
            <div className="detail-card">
              <h4>자산 배분 비율</h4>
              <div className="allocation-bars">
                <div className="allocation-item">
                  <span>주식</span>
                  <div className="bar-container">
                    <div className="bar bar-stocks" style={{ width: `${scenarioDetail.allocation.stocks}%` }} />
                  </div>
                  <span>{scenarioDetail.allocation.stocks}%</span>
                </div>
                <div className="allocation-item">
                  <span>채권</span>
                  <div className="bar-container">
                    <div className="bar bar-bonds" style={{ width: `${scenarioDetail.allocation.bonds}%` }} />
                  </div>
                  <span>{scenarioDetail.allocation.bonds}%</span>
                </div>
                <div className="allocation-item">
                  <span>단기금융</span>
                  <div className="bar-container">
                    <div className="bar bar-money-market" style={{ width: `${scenarioDetail.allocation.money_market}%` }} />
                  </div>
                  <span>{scenarioDetail.allocation.money_market}%</span>
                </div>
                <div className="allocation-item">
                  <span>금</span>
                  <div className="bar-container">
                    <div className="bar bar-gold" style={{ width: `${scenarioDetail.allocation.gold}%` }} />
                  </div>
                  <span>{scenarioDetail.allocation.gold}%</span>
                </div>
              </div>
            </div>

            <div className="detail-card risk-card">
              <h4>예상 위험 지표 (참고용)</h4>
              <div className="risk-items">
                <div className="risk-item">
                  <span className="label">예상 변동성</span>
                  <span className="value">{scenarioDetail.risk_metrics.expected_volatility}</span>
                </div>
                <div className="risk-item">
                  <span className="label">과거 최대 낙폭</span>
                  <span className="value negative">{scenarioDetail.risk_metrics.historical_max_drawdown}</span>
                </div>
                <div className="risk-item">
                  <span className="label">회복 기간 예상</span>
                  <span className="value">{scenarioDetail.risk_metrics.recovery_expectation}</span>
                </div>
              </div>
              <p className="risk-disclaimer">* 과거 데이터 기반 참고치이며, 미래 성과를 보장하지 않습니다</p>
            </div>
          </div>

          <div className="learning-points">
            <h4>이 시나리오에서 학습할 수 있는 내용</h4>
            <ul>
              {scenarioDetail.learning_points.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 시뮬레이션 설정 */}
      {selectedScenario && (
        <div className="simulation-config">
          <h2>2. 모의실험 설정</h2>

          <div className="config-grid">
            <div className="config-item">
              <label>모의실험 기간</label>
              <select value={periodYears} onChange={(e) => setPeriodYears(parseInt(e.target.value))}>
                <option value="1">1년</option>
                <option value="3">3년</option>
                <option value="5">5년</option>
                <option value="10">10년</option>
              </select>
            </div>

            <div className="config-item">
              <label>가상 투자금액</label>
              <input
                type="text"
                value={formatCurrency(investmentAmount)}
                onChange={(e) => setInvestmentAmount(parseInt(e.target.value.replace(/,/g, '')) || 0)}
              />
              <span className="unit">원</span>
            </div>

            <div className="config-item">
              <label>최대 허용 손실</label>
              <div className="loss-limit-input">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={maxLossLimit}
                  onChange={(e) => setMaxLossLimit(parseInt(e.target.value))}
                  aria-label="최대 허용 손실"
                />
                <span className="loss-value">-{maxLossLimit}%</span>
              </div>
              <p className="config-hint">
                이 수치를 초과하는 손실이 발생할 경우 알림을 받습니다
              </p>
            </div>
          </div>

          {error && (
            <div className="scenario-error" role="alert">
              <p>{error}</p>
              <button onClick={runSimulation} className="scenario-retry-btn">
                다시 시도
              </button>
            </div>
          )}

          <button
            className="btn-simulate"
            onClick={runSimulation}
            disabled={simulating || !selectedScenario}
            aria-busy={simulating}
          >
            {simulating ? (
              <>
                <span className="scenario-spinner-small"></span>
                모의실험 실행 중...
              </>
            ) : (
              '모의실험 실행'
            )}
          </button>

          <p className="simulate-note">
            * 모의실험은 과거 데이터를 기반으로 한 시뮬레이션이며, 실제 투자 결과와 다를 수 있습니다.
          </p>
        </div>
      )}

      {/* 인페이지 결과 */}
      {simulationResult && (
        <div className="scenario-result" ref={resultRef}>
          <h2>3. 모의실험 결과 — {resultScenarioName}</h2>

          {/* 기간 정보 */}
          <div className="scenario-period-info">
            <p>기간: {new Date(simulationResult.start_date).toLocaleDateString()} ~ {new Date(simulationResult.end_date).toLocaleDateString()}</p>
            <p>초기 투자: {formatCurrency(simulationResult.initial_amount ?? simulationResult.initial_investment)}원</p>
          </div>

          {/* 손실/회복 지표 */}
          <div className="scenario-risk-section">
            <h3 className="section-title">손실/회복 지표 (핵심)</h3>
            <div className="scenario-metrics-grid">
              <div className="scenario-metric-card scenario-metric-risk">
                <div className="scenario-metric-label">최대 낙폭 (MDD)</div>
                <div className="scenario-metric-value negative">
                  -{(simulationResult.risk_metrics?.max_drawdown ?? simulationResult.max_drawdown).toFixed(2)}%
                </div>
              </div>
              <div className="scenario-metric-card scenario-metric-risk">
                <div className="scenario-metric-label">최대 회복 기간</div>
                <div className="scenario-metric-value">
                  {simulationResult.risk_metrics?.max_recovery_days
                    ? `${simulationResult.risk_metrics.max_recovery_days}일`
                    : '데이터 없음'}
                </div>
              </div>
              <div className="scenario-metric-card scenario-metric-risk">
                <div className="scenario-metric-label">최악의 1개월 수익률</div>
                <div className="scenario-metric-value negative">
                  {simulationResult.risk_metrics?.worst_1m_return
                    ? `${simulationResult.risk_metrics.worst_1m_return.toFixed(2)}%`
                    : '데이터 없음'}
                </div>
              </div>
              <div className="scenario-metric-card scenario-metric-risk">
                <div className="scenario-metric-label">변동성</div>
                <div className="scenario-metric-value">
                  {formatPercent(simulationResult.risk_metrics?.volatility ?? simulationResult.volatility)}
                </div>
              </div>
            </div>

            {/* MDD가 허용 손실 초과 시 경고 */}
            {(simulationResult.risk_metrics?.max_drawdown ?? simulationResult.max_drawdown) > maxLossLimit && (
              <div className="scenario-loss-warning" role="alert">
                <p>최대 낙폭({(simulationResult.risk_metrics?.max_drawdown ?? simulationResult.max_drawdown).toFixed(1)}%)이 설정한 허용 손실(-{maxLossLimit}%)을 초과합니다.</p>
              </div>
            )}
          </div>

          {/* 차트 */}
          {growthChartData && (
            <div className="scenario-charts-section">
              <div className="scenario-chart-wrapper">
                <h3 className="section-title">자산 성장 곡선</h3>
                <div className="scenario-chart-container" aria-label="자산 성장 곡선 차트">
                  <Line data={growthChartData} options={buildChartOptions('자산 성장', 'currency')} />
                </div>
              </div>
              {drawdownChartData && (
                <div className="scenario-chart-wrapper">
                  <h3 className="section-title">Drawdown (고점 대비 낙폭)</h3>
                  <div className="scenario-chart-container" aria-label="Drawdown 차트">
                    <Line data={drawdownChartData} options={buildChartOptions('Drawdown', 'percent')} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 수익률 지표 */}
          <div className="scenario-return-section">
            <h3 className="section-title">과거 수익률 (참고용)</h3>
            <p className="section-disclaimer">* 과거 수익률은 미래 성과를 보장하지 않습니다</p>
            <div className="scenario-metrics-grid">
              <div className="scenario-metric-card">
                <div className="scenario-metric-label">총 수익률</div>
                <div className={`scenario-metric-value ${(simulationResult.historical_observation?.total_return ?? simulationResult.total_return) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentSigned(simulationResult.historical_observation?.total_return ?? simulationResult.total_return)}
                </div>
              </div>
              <div className="scenario-metric-card">
                <div className="scenario-metric-label">연평균 수익률 (CAGR)</div>
                <div className={`scenario-metric-value ${(simulationResult.historical_observation?.cagr ?? simulationResult.annualized_return) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentSigned(simulationResult.historical_observation?.cagr ?? simulationResult.annualized_return)}
                </div>
              </div>
              <div className="scenario-metric-card">
                <div className="scenario-metric-label">샤프 비율</div>
                <div className="scenario-metric-value">
                  {(simulationResult.historical_observation?.sharpe_ratio ?? simulationResult.sharpe_ratio)?.toFixed(2) ?? '-'}
                </div>
              </div>
              <div className="scenario-metric-card">
                <div className="scenario-metric-label">최종 자산</div>
                <div className="scenario-metric-value">{formatCurrency(simulationResult.final_value)}원</div>
              </div>
            </div>
          </div>

          {/* 상세 분석 이동 */}
          <div className="scenario-nav-section">
            <button
              className="btn-simulate"
              onClick={() => navigate('/backtest', {
                state: { backtestResult: simulationResult }
              })}
            >
              상세 분석 보기
            </button>
          </div>
        </div>
      )}

      <Disclaimer type="simulation" />
    </div>
  );
}

export default ScenarioSimulationPage;
