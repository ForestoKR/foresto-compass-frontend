import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { trackPageView } from '../utils/analytics';
import '../styles/DiagnosisResult.css';

function DiagnosisResultPage() {
  const navigate = useNavigate();

  const [result] = useState(() => {
    const savedResult = sessionStorage.getItem('diagnosisResult');
    if (savedResult) {
      try {
        return JSON.parse(savedResult);
      } catch (error) {
        console.error('Failed to parse diagnosis result:', error);
        return null;
      }
    }
    return null;
  });

  const [isLoading] = useState(false);

  useEffect(() => {
    if (!result) {
      navigate('/survey');
    } else {
      trackPageView('diagnosis_result');
    }
  }, [result, navigate]);

  if (isLoading) {
    return (
      <div className="dr-loading">
        <div className="dr-spinner"></div>
        <p>결과를 준비 중입니다...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-container">
        <div className="dr-error-message">진단 결과를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const { investment_type, score, confidence, description, characteristics, scenario_ratio, reference_only, monthly_investment, ai_analysis } = result;

  // 학습 성향별 색상 및 아이콘
  const typeConfig = {
    conservative: {
      label: '안정성 중심 학습 성향',
      color: '#4CAF50',
      icon: '🛡️',
      description: '변동성이 낮은 자산 운용 전략을 학습하고자 하는 성향입니다.',
    },
    moderate: {
      label: '균형형 학습 성향',
      color: '#FF9800',
      icon: '⚖️',
      description: '안정성과 성장성의 균형을 이해하고자 하는 학습 성향입니다.',
    },
    aggressive: {
      label: '성장성 중심 학습 성향',
      color: '#F44336',
      icon: '🚀',
      description: '성장성 높은 자산군의 특성을 학습하고자 하는 성향입니다.',
    },
  };

  const config = typeConfig[investment_type] || typeConfig.moderate;

  return (
    <div className="result-container">
      <Helmet>
        <title>진단 결과 | Foresto Compass</title>
        <meta name="description" content="투자 학습 성향 분석 결과 및 맞춤 포트폴리오 전략." />
        <meta property="og:title" content="진단 결과 | Foresto Compass" />
        <meta property="og:description" content="투자 학습 성향 분석 결과 및 맞춤 포트폴리오 전략." />
      </Helmet>
      <div className="result-card">
        {/* 1. 학습 성향 결과 */}
        <div className="result-header">
          <div className="result-icon dr-result-icon">
            {config.icon}
          </div>
          <h1 className="result-type" style={{ color: config.color }}>
            {config.label}
          </h1>
          <p className="result-subtitle">{config.description}</p>
        </div>

        {/* 2. 점수 및 신뢰도 */}
        <div className="scores-section">
          <div className="score-card">
            <div className="score-label">진단 점수</div>
            <div className="score-value" style={{ color: config.color }}>
              {score.toFixed(2)} / 10
            </div>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{
                  width: `${(score / 10) * 100}%`,
                  backgroundColor: config.color,
                }}
              ></div>
            </div>
          </div>

          <div className="score-card">
            <div className="score-label">신뢰도</div>
            <div className="score-value" style={{ color: config.color }}>
              {(confidence * 100).toFixed(0)}%
            </div>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{
                  width: `${confidence * 100}%`,
                  backgroundColor: config.color,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* 3. 학습 성향 설명 + 특징 */}
        <div className="description-section">
          <h2>학습 성향 설명</h2>
          <p>{description}</p>
        </div>

        {characteristics && characteristics.length > 0 && (
          <div className="characteristics-section">
            <h2>당신의 특징</h2>
            <ul className="characteristics-list">
              {characteristics.map((char, index) => (
                <li key={index}>{char}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. AI 분석 */}
        {ai_analysis && (
          <div className="ai-analysis-section">
            <h2>
              <span className="ai-badge">🤖 AI 분석</span>
            </h2>

            {ai_analysis.personalized_analysis && (
              <div className="ai-card">
                <h3>개인화된 학습 성향 분석</h3>
                <p className="ai-content">{ai_analysis.personalized_analysis}</p>
              </div>
            )}

            {ai_analysis.investment_advice && (
              <div className="ai-card">
                <h3>학습 방향 제안</h3>
                <p className="ai-content">{ai_analysis.investment_advice}</p>
              </div>
            )}

            {ai_analysis.risk_warning && (
              <div className="ai-card risk-warning">
                <h3>⚠️ 위험 주의사항</h3>
                <p className="ai-content">{ai_analysis.risk_warning}</p>
              </div>
            )}
          </div>
        )}

        {/* 5. 시뮬레이션 정보 (자산 배분 + 수익률 + 월 투입) */}
        <div className="portfolio-section">
          <h2>시뮬레이션용 자산 배분 예시</h2>
          <p className="dr-disclaimer-text">
            ⚠️ 본 배분은 교육 목적의 일반적 예시이며, 특정인에 대한 맞춤형 투자 권유가 아닙니다.
          </p>
          <div className="portfolio-grid">
            {scenario_ratio &&
              Object.entries(scenario_ratio).map(([asset, ratio]) => (
                <div key={asset} className="portfolio-item">
                  <div className="asset-name">{getAssetLabel(asset)}</div>
                  <div className="asset-ratio">{ratio}%</div>
                  <div className="asset-bar">
                    <div
                      className="asset-fill"
                      style={{
                        width: `${ratio}%`,
                        backgroundColor: getAssetColor(asset),
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>

          {reference_only && (
            <div className="dr-sim-sub-info">
              <span className="dr-sim-label">과거 평균 수익률 (참고)</span>
              <span className="dr-sim-value" style={{ color: config.color }}>
                {reference_only.historical_avg_return}
              </span>
              <p className="dr-reference-disclaimer">* {reference_only.disclaimer}</p>
            </div>
          )}

          {monthly_investment && (
            <div className="dr-sim-sub-info">
              <span className="dr-sim-label">시뮬레이션 월 투입 금액</span>
              <span className="dr-sim-value">{monthly_investment}만원</span>
            </div>
          )}
        </div>

        {/* 6. CTA 버튼 */}
        <div className="button-section">
          <button
            className="dr-btn dr-btn-primary dr-btn-primary-wide"
            onClick={() => navigate('/scenarios')}
          >
            시나리오 모의실험 시작하기
          </button>
          <button
            className="dr-btn dr-btn-secondary"
            onClick={() => navigate('/history')}
          >
            진단 이력
          </button>
          <button
            className="dr-btn dr-btn-secondary"
            onClick={() => navigate('/survey')}
          >
            다시 진단
          </button>
        </div>

        {/* 7. 면책 안내 (1회) */}
        <div className="result-info">
          <p>
            📖 이 결과는 투자 용어를 이해하기 위한 읽기 가이드입니다. 실제 모의실험은 시나리오 페이지에서 직접 선택하세요.
          </p>
          <p className="dr-info-sub">
            ⚠️ 본 서비스는 교육 목적의 학습 도구이며, 투자 권유·자문 서비스를 제공하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 자산 이름을 한글로 변환
 */
function getAssetLabel(asset) {
  const assetMap = {
    stocks: '주식',
    bonds: '채권',
    money_market: '머니마켓',
    gold: '금',
    other: '기타',
  };
  return assetMap[asset] || asset;
}

/**
 * 자산별 색상
 */
function getAssetColor(asset) {
  const colorMap = {
    stocks: '#FF6B6B',
    bonds: '#4ECDC4',
    money_market: '#45B7D1',
    gold: '#FFA500',
    other: '#95E1D3',
  };
  return colorMap[asset] || '#999';
}

export default DiagnosisResultPage;