import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getTopCompassScores } from '../services/api';
import Disclaimer from '../components/Disclaimer';
import { trackEvent, trackPageView } from '../utils/analytics';
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
      const resultType = total <= 4 ? 'conservative' : total <= 7 ? 'moderate' : 'aggressive';
      setDiagnosisResult(DIAGNOSIS_RESULTS[resultType]);
      trackEvent('mini_diagnosis_completed', { result_type: resultType });
    }
  };

  useEffect(() => {
    getTopCompassScores(5)
      .then(res => setTopStocks(res.data.stocks || []))
      .catch(() => {});
    trackPageView('landing');
  }, []);

  const ctaAction = () => {
    trackEvent('landing_cta_clicked', { destination: isAuthenticated ? 'dashboard' : 'signup' });
    navigate(isAuthenticated ? '/dashboard' : '/signup');
  };

  const ctaLabel = isAuthenticated ? '대시보드로 이동' : '무료로 시작하기';

  return (
    <div className="landing-container">
      <Helmet>
        <title>Foresto Compass — 종합 투자 학습 플랫폼</title>
        <meta name="description" content="Compass Score 기반 종목 분석과 포트폴리오 시뮬레이션으로 투자를 학습하세요." />
        <meta property="og:title" content="Foresto Compass — 종합 투자 학습 플랫폼" />
        <meta property="og:description" content="Compass Score 기반 종목 분석과 포트폴리오 시뮬레이션으로 투자를 학습하세요." />
      </Helmet>

      {/* Section 1: Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <p className="lp-hero-eyebrow">투자, 어디서부터 시작해야 할지 모르겠다면</p>
          <h1 className="lp-hero-title">
            Foresto Compass가
            <br />
            <span className="lp-gradient-text">당신의 첫 번째 나침반이 됩니다</span>
          </h1>
          <p className="lp-hero-sub">
            데이터 기반 학습과 시뮬레이션으로
            <br />
            투자의 기초부터 차근차근 배워보세요.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={ctaAction}>
              {ctaLabel}
            </button>
            {!isAuthenticated && (
              <button className="lp-btn-secondary" onClick={() => navigate('/explore')}>
                먼저 둘러보기
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: 문제 인식 */}
      <section className="lp-problems">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2>혹시 이런 경험, 있으신가요?</h2>
          </div>
          <div className="lp-problems-grid">
            <div className="lp-problem-card">
              <div className="lp-problem-icon">&#x1F4F1;</div>
              <p className="lp-problem-text">
                유튜브, 블로그 정보가 너무 많아서
                <br />
                뭘 믿어야 할지 모르겠다
              </p>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon">&#x1F4D6;</div>
              <p className="lp-problem-text">
                주식 용어가 어렵고,
                <br />
                재무제표는 외국어 같다
              </p>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon">&#x1F3AF;</div>
              <p className="lp-problem-text">
                모의투자를 해보고 싶은데
                <br />
                안전한 연습 환경이 없다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: 3분 투자 진단 */}
      <section className="lp-diagnosis">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2>3분이면 충분합니다</h2>
            <p>간단한 질문 3개로 나의 투자 성향을 파악해보세요</p>
          </div>
          <div className="lp-diagnosis-widget">
            {!diagnosisResult ? (
              <div className="lp-diagnosis-questions">
                {MINI_QUESTIONS.map((q, idx) => (
                  <div key={idx} className={`lp-q-card ${miniStep === idx ? 'active' : miniStep > idx ? 'done' : ''}`}>
                    <div className="lp-q-number">{idx + 1}/3</div>
                    <p className="lp-q-text">{q.question}</p>
                    <div className="lp-q-options">
                      {q.options.map(opt => (
                        <button key={opt.value} className="lp-q-option" onClick={() => handleMiniAnswer(idx, opt.score)}>
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lp-diagnosis-result">
                <div className="lp-result-icon">{diagnosisResult.icon}</div>
                <h3>{diagnosisResult.type}</h3>
                <p>{diagnosisResult.description}</p>
                <button className="lp-btn-primary" onClick={() => navigate(isAuthenticated ? '/survey' : '/signup')}>
                  자세한 진단 받기
                </button>
              </div>
            )}
          </div>
          <p className="lp-disclaimer-text">교육 목적 참고 정보이며 투자 권유가 아닙니다</p>
        </div>
      </section>

      {/* Section 4: 데이터 연습장 + Compass Score 축소판 */}
      <section className="lp-playground">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2>실제 데이터로 연습하세요</h2>
            <p>가상의 숫자가 아닌, 진짜 시장 데이터로 학습합니다</p>
          </div>
          <div className="lp-playground-grid">
            <div className="lp-playground-card">
              <div className="lp-playground-icon">&#x1F4BC;</div>
              <h3>포트폴리오 시뮬레이션</h3>
              <p>실제 수익률 기반 모의 투자</p>
            </div>
            <div className="lp-playground-card">
              <div className="lp-playground-icon">&#x1F4C8;</div>
              <h3>백테스팅</h3>
              <p>과거 데이터로 전략 검증</p>
            </div>
            <div className="lp-playground-card">
              <div className="lp-playground-icon">&#x1F50D;</div>
              <h3>종목 스크리너</h3>
              <p>조건별 종목 필터링</p>
            </div>
            <div className="lp-playground-card">
              <div className="lp-playground-icon">&#x1F30D;</div>
              <h3>시나리오 분석</h3>
              <p>금리 변동, 환율 변화 시뮬레이션</p>
            </div>
          </div>

          {/* Compass Score 축소판 */}
          {topStocks.length > 0 && (
            <div className="lp-compass-mini">
              <h3 className="lp-compass-mini-title">Compass Score 상위 종목</h3>
              <div className="lp-compass-mini-list">
                {topStocks.map(stock => (
                  <div key={stock.ticker} className="lp-compass-mini-card">
                    <span className="lp-compass-mini-name">{stock.name}</span>
                    <span className="lp-compass-mini-score">{stock.compass_score?.toFixed(1)}</span>
                    <span className={`lp-compass-mini-grade ${GRADE_CLASS_MAP[stock.compass_grade] || ''}`}>
                      {stock.compass_grade}
                    </span>
                  </div>
                ))}
              </div>
              <button className="lp-btn-link" onClick={() => navigate('/explore')}>
                전체 스크리너 보기 &rarr;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: AI 해설 */}
      <section className="lp-ai">
        <div className="lp-section-inner">
          <div className="lp-section-header lp-section-header-light">
            <h2>AI가 쉽게 설명해줍니다</h2>
            <p>어려운 재무 데이터, AI가 한국어로 풀어서 알려드려요</p>
          </div>
          <div className="lp-ai-features">
            <div className="lp-ai-card">
              <div className="lp-ai-card-icon">&#x1F4CA;</div>
              <h3>재무제표 핵심 지표 자동 해석</h3>
              <p>ROE, 부채비율, 영업이익률 등 핵심 수치를 한눈에 이해할 수 있도록 정리합니다</p>
            </div>
            <div className="lp-ai-card">
              <div className="lp-ai-card-icon">&#x1F4AC;</div>
              <h3>투자 판단에 필요한 맥락 설명</h3>
              <p>숫자 뒤에 숨겨진 의미와 산업 내 위치를 비교 분석합니다</p>
            </div>
            <div className="lp-ai-card">
              <div className="lp-ai-card-icon">&#x1F4DD;</div>
              <h3>교육 목적의 참고 분석 제공</h3>
              <p>학습용 리포트로 투자 분석의 기초를 다질 수 있습니다</p>
            </div>
          </div>
          {/* AI 분석 예시 모킹 */}
          <div className="lp-ai-mock">
            <div className="lp-ai-mock-header">AI 분석 예시</div>
            <div className="lp-ai-mock-bubble">
              <span className="lp-ai-mock-label">AI</span>
              <p>
                이 기업의 ROE는 15.2%로, 동종 업계 평균(10.8%)을 상회하며
                자기자본을 효율적으로 활용하고 있습니다. 다만, 부채비율이
                120%로 다소 높은 편이니 재무 안정성도 함께 고려해보세요.
              </p>
            </div>
            <p className="lp-ai-mock-note">* 실제 서비스에서 제공되는 분석 예시입니다</p>
          </div>
        </div>
      </section>

      {/* Section 6: 안전하고 합법적 */}
      <section className="lp-safety">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2>안전하게, 합법적으로</h2>
          </div>
          <div className="lp-safety-grid">
            <div className="lp-safety-card">
              <div className="lp-safety-icon">&#x1F393;</div>
              <h3>교육 목적 플랫폼</h3>
              <p>투자 권유 없이 순수하게 학습과 시뮬레이션에 집중합니다</p>
            </div>
            <div className="lp-safety-card">
              <div className="lp-safety-icon">&#x2696;&#xFE0F;</div>
              <h3>자본시장법 제6조 준수</h3>
              <p>관련 법규를 철저히 준수하여 안전한 교육 환경을 제공합니다</p>
            </div>
            <div className="lp-safety-card">
              <div className="lp-safety-icon">&#x1F512;</div>
              <h3>개인정보 암호화 보관</h3>
              <p>모든 개인정보는 암호화되어 안전하게 관리됩니다</p>
            </div>
          </div>
          <div className="lp-safety-disclaimer">
            <Disclaimer />
          </div>
        </div>
      </section>

      {/* Section 7: CTA */}
      <section className="lp-final-cta">
        <div className="lp-section-inner">
          <h2 className="lp-final-cta-title">지금 시작하세요</h2>
          <p className="lp-final-cta-sub">
            무료로 투자 진단을 받고, 나만의 포트폴리오를 만들어보세요
          </p>
          <div className="lp-final-cta-actions">
            <button className="lp-btn-primary lp-btn-lg" onClick={ctaAction}>
              {ctaLabel}
            </button>
            <button className="lp-btn-ghost" onClick={() => navigate('/explore')}>
              먼저 둘러보기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
