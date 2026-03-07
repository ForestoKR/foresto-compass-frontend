// frontend/src/pages/AdminPage.jsx

import { useNavigate } from 'react-router-dom';
import '../styles/Admin.css';

export default function AdminPage() {
  const navigate = useNavigate();

  const menuItems = [
    {
      icon: '🗄️',
      title: '데이터 관리',
      description: '종목 정보 수집 및 데이터베이스 관리',
      path: '/admin/data',
      colorVar: 'var(--admin-data)'
    },
    {
      icon: '⚙️',
      title: '배치 작업',
      description: '한국 주식 데이터 일괄 수집 및 작업 모니터링',
      path: '/admin/batch',
      colorVar: 'var(--admin-batch)'
    },
    {
      icon: '🗓️',
      title: '스케줄 관리',
      description: '데이터 수집 스케줄 관리 및 수동 실행',
      path: '/admin/scheduler',
      colorVar: 'var(--admin-scheduler)'
    },
    {
      icon: '\u{1F4E1}',
      title: '시스템 모니터링',
      description: 'DB 풀, 메모리, 스케줄러, API 성능 실시간 확인',
      path: '/admin/system',
      colorVar: 'var(--admin-system)'
    },
    {
      icon: '\u{1F4C5}',
      title: '휴장일 관리',
      description: '한국 주식시장 휴장일 조회, 추가, 거래일 확인',
      path: '/admin/market-calendar',
      colorVar: 'var(--admin-calendar)'
    },
    {
      icon: '🔍',
      title: '종목 조회',
      description: '기본 정보, 시계열 데이터, 재무 지표 한눈에 확인',
      path: '/admin/stock-detail',
      colorVar: 'var(--admin-stock)'
    },
    {
      icon: '👥',
      title: '사용자 관리',
      description: '사용자 목록, 역할 변경, 계정 삭제',
      path: '/admin/users',
      colorVar: 'var(--admin-users)'
    },
    {
      icon: '🧾',
      title: '동의 이력',
      description: '유의사항 동의 기록 조회',
      path: '/admin/consents',
      colorVar: 'var(--admin-consents)'
    },
    {
      icon: '📊',
      title: '포트폴리오 관리',
      description: '투자 성향별 포트폴리오 전략 및 종목 구성',
      path: '/admin/portfolio',
      colorVar: 'var(--admin-portfolio)'
    },
    {
      icon: '📈',
      title: '포트폴리오 성과 비교',
      description: '여러 포트폴리오의 수익률과 성과를 비교 분석',
      path: '/admin/portfolio-comparison',
      colorVar: 'var(--admin-comparison)'
    },
    {
      icon: '📊',
      title: '재무 분석',
      description: 'CAGR, ROE, 부채비율 등 재무제표 분석',
      path: '/admin/financial-analysis',
      colorVar: 'var(--admin-financial)'
    },
    {
      icon: '💼',
      title: '밸류에이션',
      description: 'PER/PBR 비교, DCF, 배당할인모형',
      path: '/admin/valuation',
      colorVar: 'var(--admin-valuation)'
    },
    {
      icon: '📈',
      title: '퀀트/기술 분석',
      description: 'RSI, MACD, 변동성, 베타, 알파 분석',
      path: '/admin/quant',
      colorVar: 'var(--admin-quant)'
    },
    {
      icon: '📄',
      title: '종합 리포트',
      description: '모든 분석 결과 통합 리포트 (투자 권고 없음)',
      path: '/admin/report',
      colorVar: 'var(--admin-report)'
    }
  ];

  return (
    <div className="main-content">
      <div className="result-container">
        <div className="result-card" style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div className="result-header">
            <div className="result-icon" style={{ fontSize: '3rem' }}>
              ⚙️
            </div>
            <h1 className="result-type">
              관리자 도구
            </h1>
            <p className="result-subtitle">
              투자 분석 도구 및 데이터 관리
            </p>
          </div>

          {/* Menu Grid */}
          <div className="admin-menu-grid">
            {menuItems.map((item, index) => (
              <div
                key={index}
                className="admin-menu-card"
                style={{ '--card-color': item.colorVar }}
                onClick={() => navigate(item.path)}
              >
                <div className="admin-menu-card-icon">
                  {item.icon}
                </div>
                <h3 className="admin-menu-card-title" style={{ color: item.colorVar }}>
                  {item.title}
                </h3>
                <p className="admin-menu-card-desc">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="admin-info-section">
            <h3>💡 사용 안내</h3>
            <ul>
              <li>
                <strong>데이터 관리:</strong> KRX Open API, DART를 통해 주식/ETF 데이터를 수집하고 관리합니다.
              </li>
              <li>
                <strong>재무 분석:</strong> 재무제표 기반으로 성장률, 수익성, 안정성을 종합 분석합니다.
              </li>
              <li>
                <strong>밸류에이션:</strong> 업종 평균 비교, DCF, DDM 등 다양한 방법으로 적정 주가를 산출합니다.
              </li>
              <li>
                <strong>퀀트/기술 분석:</strong> 기술적 지표와 리스크 지표를 통해 매매 타이밍과 리스크를 분석합니다.
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="admin-quick-links">
            <button
              onClick={() => navigate('/survey')}
              className="btn btn-secondary"
            >
              🏠 홈으로
            </button>
            <button
              onClick={() => navigate('/history')}
              className="btn btn-secondary"
            >
              📋 진단 이력
            </button>
            <button
              onClick={() => window.open('http://127.0.0.1:8000/docs', '_blank')}
              className="btn btn-secondary"
            >
              📚 API 문서
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
