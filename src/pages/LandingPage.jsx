import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getTopCompassScores } from '../services/api';
import '../styles/LandingPage.css';

const MINI_QUESTIONS = [
  {
    question: '투자 경험은 어느 정도인가요?',
    options: [
      { value: 'A', text: '처음입니다', score: 1 },
      { value: 'B', text: '약간의 경험이 있습니다', score: 2 },
      { value: 'C', text: '충분한 경험이 있습니다', score: 3 },
    ],
  },
  {
    question: '자산 가격의 변동성을 어느 정도까지 감내할 수 있나요?',
    options: [
      { value: 'A', text: '거의 감내하기 어렵습니다', score: 1 },
      { value: 'B', text: '어느 정도는 감내할 수 있습니다', score: 2 },
      { value: 'C', text: '높은 변동성도 감내할 수 있습니다', score: 3 },
    ],
  },
  {
    question: '주로 고려하는 투자 기간은?',
    options: [
      { value: 'A', text: '1년 이하', score: 1 },
      { value: 'B', text: '1~3년', score: 2 },
      { value: 'C', text: '3년 이상', score: 3 },
    ],
  },
];

const DIAGNOSIS_RESULTS = {
  conservative: { type: '안정형', icon: '\u{1F6E1}\uFE0F', description: '원금 보존을 중시하며, 안정적인 수익을 추구하는 성향입니다.' },
  moderate: { type: '중립형', icon: '\u2696\uFE0F', description: '안정성과 수익성의 균형을 추구하는 성향입니다.' },
  aggressive: { type: '공격형', icon: '\u{1F680}', description: '높은 수익을 위해 적극적인 위험 감수를 선호하는 성향입니다.' },
};

const GRADE_CLASS_MAP = {
  'S': 'grade-s',
  'A+': 'grade-aplus',
  'A': 'grade-a',
  'B+': 'grade-bplus',
  'B': 'grade-b',
  'C+': 'grade-cplus',
  'C': 'grade-c',
  'D': 'grade-d',
  'F': 'grade-f',
};

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [topStocks, setTopStocks] = useState([]);
  const [miniAnswers, setMiniAnswers] = useState([]);
  const [diagnosisResult, setDiagnosisResult] = useState(null);

  const miniStep = miniAnswers.filter(a => a != null).length;

  const handleMiniAnswer = (questionIndex, score) => {
    const newAnswers = [...miniAnswers];
    newAnswers[questionIndex] = score;
    setMiniAnswers(newAnswers);

    if (newAnswers.filter(a => a != null).length === 3) {
      const total = newAnswers.reduce((sum, s) => sum + s, 0);
      if (total <= 4) setDiagnosisResult(DIAGNOSIS_RESULTS.conservative);
      else if (total <= 7) setDiagnosisResult(DIAGNOSIS_RESULTS.moderate);
      else setDiagnosisResult(DIAGNOSIS_RESULTS.aggressive);
    }
  };

  // 이미 로그인한 사용자는 설문조사 페이지로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/survey');
    }
  }, [isAuthenticated, navigate]);

  // Compass Score 상위 종목 로드
  useEffect(() => {
    getTopCompassScores(5)
      .then(res => setTopStocks(res.data.stocks || []))
      .catch(() => {});
  }, []);

  const features = [
    {
      icon: '📊',
      title: '학습 성향 분석',
      description: '교육 목적의 성향 분석과 다양한 전략 구성 예시를 제공합니다'
    },
    {
      icon: '💼',
      title: '재무 데이터 학습',
      description: 'CAGR, ROE, 부채비율 등 재무지표를 이해하고 학습합니다'
    },
    {
      icon: '📈',
      title: '퀀트 지표 학습',
      description: '데이터 기반 분석 기법을 이해하고 학습할 수 있습니다'
    },
    {
      icon: '🎯',
      title: '전략 시뮬레이션',
      description: '다양한 자산 배분 전략을 시뮬레이션으로 학습합니다 (교육용)'
    },
    {
      icon: '📰',
      title: '정보 분석 학습',
      description: 'AI 기반 감성 분석 기법과 시장 정보를 학습합니다'
    },
    {
      icon: '📉',
      title: '리스크 개념 학습',
      description: '포트폴리오의 리스크 개념과 분석 방법을 이해합니다'
    }
  ];

  return (
    <div className="landing-container">
      <Helmet>
        <title>Foresto Compass — 종합 투자 학습 플랫폼</title>
        <meta name="description" content="Compass Score 기반 종목 분석과 포트폴리오 시뮬레이션으로 투자를 학습하세요." />
        <meta property="og:title" content="Foresto Compass — 종합 투자 학습 플랫폼" />
        <meta property="og:description" content="Compass Score 기반 종목 분석과 포트폴리오 시뮬레이션으로 투자를 학습하세요." />
      </Helmet>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🌲 Foresto Compass</div>
          <h1 className="hero-title">
            투자 전략을 학습하는
            <br />
            <span className="gradient-text">교육용 시뮬레이션 플랫폼</span>
          </h1>
          <p className="hero-description">
            AI 기반 분석 기법을 이해하고 다양한 전략을 학습합니다.
            <br />
            지금 시작하여 자산 운용 지식을 쌓아보세요.
          </p>
          <div className="hero-actions">
            <button
              className="btn-primary-large"
              onClick={() => navigate('/signup')}
            >
              무료로 시작하기
            </button>
            <button
              className="btn-secondary-large"
              onClick={() => navigate('/login')}
            >
              로그인
            </button>
            <a
              href="https://blog.foresto.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-blog-link"
            >
              📝 블로그
            </a>
          </div>
        </div>
        <div className="hero-illustration">
          <div className="illustration-card card-1">
            <div className="card-icon">📊</div>
            <div className="card-text">성향 분석</div>
          </div>
          <div className="illustration-card card-2">
            <div className="card-icon">📈</div>
            <div className="card-text">전략 시뮬레이션</div>
          </div>
          <div className="illustration-card card-3">
            <div className="card-icon">🎯</div>
            <div className="card-text">지식 학습</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Foresto Compass의 특별한 기능</h2>
          <p>다양한 분석 기법과 투자 지식을 학습해보세요</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compass Score Showcase Section */}
      {topStocks.length > 0 && (
        <section className="compass-showcase-section">
          <div className="section-header">
            <h2>실시간 Compass Score</h2>
            <p>AI 기반 4축 분석으로 평가된 상위 종목</p>
          </div>
          <div className="compass-cards-grid">
            {topStocks.map(stock => (
              <div key={stock.ticker} className="compass-card">
                <div className="compass-card-header">
                  <span className="compass-ticker">{stock.ticker}</span>
                  <span className={`compass-grade ${GRADE_CLASS_MAP[stock.compass_grade] || ''}`}>
                    {stock.compass_grade}
                  </span>
                </div>
                <div className="compass-card-name">{stock.name}</div>
                <div className="compass-score-display">
                  {stock.compass_score?.toFixed(1)}
                </div>
                <div className="compass-axes">
                  <div className="compass-axis">
                    <span className="compass-axis-label">재무</span>
                    <div className="compass-axis-bar">
                      <div
                        className="compass-axis-fill axis-financial"
                        style={{ width: `${Math.min(stock.compass_financial_score || 0, 100)}%` }}
                      />
                    </div>
                    <span className="compass-axis-value">{stock.compass_financial_score?.toFixed(0)}</span>
                  </div>
                  <div className="compass-axis">
                    <span className="compass-axis-label">밸류</span>
                    <div className="compass-axis-bar">
                      <div
                        className="compass-axis-fill axis-valuation"
                        style={{ width: `${Math.min(stock.compass_valuation_score || 0, 100)}%` }}
                      />
                    </div>
                    <span className="compass-axis-value">{stock.compass_valuation_score?.toFixed(0)}</span>
                  </div>
                  <div className="compass-axis">
                    <span className="compass-axis-label">기술</span>
                    <div className="compass-axis-bar">
                      <div
                        className="compass-axis-fill axis-technical"
                        style={{ width: `${Math.min(stock.compass_technical_score || 0, 100)}%` }}
                      />
                    </div>
                    <span className="compass-axis-value">{stock.compass_technical_score?.toFixed(0)}</span>
                  </div>
                  <div className="compass-axis">
                    <span className="compass-axis-label">리스크</span>
                    <div className="compass-axis-bar">
                      <div
                        className="compass-axis-fill axis-risk"
                        style={{ width: `${Math.min(stock.compass_risk_score || 0, 100)}%` }}
                      />
                    </div>
                    <span className="compass-axis-value">{stock.compass_risk_score?.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="compass-cta">
            <button onClick={() => navigate('/explore')}>
              더 많은 종목 탐색하기
            </button>
          </div>
          <p className="compass-disclaimer">교육 목적 참고 정보이며 투자 권유가 아닙니다</p>
        </section>
      )}

      {/* Mini Diagnosis Section */}
      <section className="mini-diagnosis-section">
        <div className="section-header">
          <h2>나의 투자 성향은?</h2>
          <p>3개의 질문으로 간단히 알아보세요</p>
        </div>
        <div className="mini-diagnosis-widget">
          {!diagnosisResult ? (
            <div className="mini-diagnosis-questions">
              {MINI_QUESTIONS.map((q, idx) => (
                <div key={idx} className={`mini-q-card ${miniStep === idx ? 'active' : miniStep > idx ? 'done' : ''}`}>
                  <div className="mini-q-number">{idx + 1}/3</div>
                  <p className="mini-q-text">{q.question}</p>
                  <div className="mini-q-options">
                    {q.options.map(opt => (
                      <button key={opt.value} className="mini-q-option" onClick={() => handleMiniAnswer(idx, opt.score)}>
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-diagnosis-result">
              <div className="mini-result-icon">{diagnosisResult.icon}</div>
              <h3>{diagnosisResult.type}</h3>
              <p>{diagnosisResult.description}</p>
              <button className="mini-result-cta" onClick={() => navigate('/signup')}>
                전체 15문항 정밀 진단 받기
              </button>
            </div>
          )}
        </div>
        <p className="compass-disclaimer">교육 목적 참고 정보이며 투자 권유가 아닙니다</p>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-header">
          <h2>간단한 3단계로 시작하세요</h2>
          <p>복잡한 절차 없이 빠르게 학습 성향 분석을 받아보실 수 있습니다</p>
        </div>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">회원가입</h3>
            <p className="step-description">
              간단한 정보 입력으로 계정을 만들고 학습 환경을 설정합니다
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">학습 성향 진단</h3>
            <p className="step-description">
              설문조사를 통해 학습 성향과 관심 분야를 분석합니다
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">전략 시뮬레이션</h3>
            <p className="step-description">
              다양한 자산 배분 전략의 구성 예시를 시뮬레이션으로 확인합니다
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">지금 바로 시작하세요</h2>
          <p className="cta-description">
            무료 회원가입으로 투자 전략 학습과 시뮬레이션을 경험해보세요
          </p>
          <button
            className="btn-cta"
            onClick={() => navigate('/signup')}
          >
            무료로 시작하기
          </button>
        </div>
      </section>

    </div>
  );
}

export default LandingPage;
