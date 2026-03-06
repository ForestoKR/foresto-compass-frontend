import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useStepCompletion } from '../hooks/useStepCompletion';
import { getProfileCompletionStatus } from '../services/api';
import { trackEvent } from '../utils/analytics';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { steps: completedSteps } = useStepCompletion();
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const navRef = useRef(null);
  const drawerRef = useRef(null);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setOpenGroup(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isAnyActive = (paths = []) => {
    return paths.some((path) => isActive(path));
  };

  // --- Journey steps (1-4) ---
  const journeySteps = useMemo(() => [
    {
      step: 1,
      label: '시장 탐색',
      items: [
        { label: '시장현황', path: '/dashboard' },
        { label: '종목 스크리너', path: '/screener' },
        { label: '종목 비교', path: '/stock-comparison' },
        { label: '관심 종목', path: '/watchlist' },
      ],
    },
    {
      step: 2,
      label: '투자성향 진단',
      skippable: true,
      items: [
        { label: '투자성향진단', path: '/survey', recommended: true },
        { label: '진단이력', path: '/history' },
      ],
    },
    {
      step: 3,
      label: '포트폴리오 구성',
      items: [
        { label: 'AI 추천', separator: true },
        { label: 'AI 시뮬레이션', path: '/portfolio', requiresDiagnosis: true },
        { label: '직접 구성', separator: true },
        { label: '포트폴리오 구성', path: '/portfolio-builder', recommended: true },
        {
          label: '포트폴리오 평가',
          path: '/portfolio-evaluation',
          activePaths: ['/portfolio-evaluation', '/phase7-evaluation'],
        },
      ],
    },
    {
      step: 4,
      label: '시뮬레이션·검증',
      items: [
        { label: '백테스팅', path: '/backtest' },
        { label: '시나리오', path: '/scenarios' },
        { label: '성과해석', path: '/analysis' },
        { label: '리포트', path: '/report-history' },
      ],
    },
  ], []);

  // --- Auxiliary groups (no step numbers) ---
  const auxiliaryGroups = useMemo(() => {
    const groups = [
      {
        label: '학습',
        items: [
          { label: '용어학습', path: '/terminology' },
          { label: '사용 설명서', path: '/guide' },
          { label: '시작 가이드', action: 'startTour' },
        ],
      },
      {
        label: '계정',
        items: [
          { label: '프로필', path: '/profile' },
          { label: '구독 관리', path: '/subscription' },
        ],
      },
    ];

    if (user && user.role === 'admin') {
      groups.push({
        label: '관리',
        items: [
          { label: '운영', separator: true },
          { label: '관리자 홈', path: '/admin' },
          { label: '사용자 관리', path: '/admin/users' },
          { label: '동의 이력', path: '/admin/consents' },
          { label: '시스템 상태', path: '/admin/system' },
          { label: '데이터', separator: true },
          { label: '데이터 관리', path: '/admin/data' },
          { label: '휴장일 관리', path: '/admin/market-calendar' },
          { label: '배치 작업', path: '/admin/batch' },
          { label: '스케줄러', path: '/admin/scheduler' },
          { label: '포트폴리오', separator: true },
          { label: '포트폴리오 관리', path: '/admin/portfolio' },
          { label: '포트폴리오 비교', path: '/admin/portfolio-comparison' },
          { label: '분석', separator: true },
          { label: '종목 상세', path: '/admin/stock-detail' },
          { label: '재무 분석', path: '/admin/financial-analysis' },
          { label: '밸류에이션', path: '/admin/valuation' },
          { label: '퀀트 분석', path: '/admin/quant' },
          { label: '리포트', path: '/admin/report' },
        ],
      });
    }

    return groups;
  }, [user]);

  const handleToggleGroup = (label) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  const handleNavigate = (path) => {
    setOpenGroup(null);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleLockedNavigate = (item) => {
    if (item.requiresDiagnosis && !completedSteps[2]) {
      setOpenGroup(null);
      setMobileMenuOpen(false);
      navigate('/survey');
      return;
    }
    handleNavigate(item.path);
  };

  const handleAction = (action) => {
    setOpenGroup(null);
    setMobileMenuOpen(false);
    if (action === 'startTour') {
      localStorage.removeItem('onboarding_tour_completed');
      window.dispatchEvent(new CustomEvent('startOnboardingTour'));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        navRef.current && !navRef.current.contains(event.target) &&
        (!drawerRef.current || !drawerRef.current.contains(event.target))
      ) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 프로필 완성 여부 확인
  useEffect(() => {
    if (!user) return;
    getProfileCompletionStatus()
      .then((res) => setProfileIncomplete(!res.data.is_complete))
      .catch(() => {});
  }, [user]);

  // body 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // 라우트 변경 시 메뉴 닫기
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileMenuOpen(false);
    setOpenGroup(null);
  }

  // --- Helpers ---
  const getGroupPaths = (items) =>
    items
      .filter((item) => !item.separator && !item.action)
      .flatMap((item) => (item.activePaths ? item.activePaths : [item.path]));

  const isStepActive = (stepObj) => isAnyActive(getGroupPaths(stepObj.items));

  // Determine which step is "current" for styling the active circle
  const activeStep = journeySteps.find((s) => isStepActive(s))?.step ?? null;

  // --- Dropdown renderer (shared desktop & mobile) ---
  const renderDropdownItems = (items, isMobile = false) => {
    const itemClass = isMobile ? 'mobile-nav-item' : 'nav-dropdown-item';
    const sepClass = isMobile ? 'mobile-nav-separator' : 'nav-dropdown-separator';

    return items.map((item) => {
      if (item.separator) {
        return (
          <div key={item.label} className={sepClass}>
            {item.label}
          </div>
        );
      }
      if (item.action) {
        return (
          <button
            key={item.label}
            type="button"
            className={itemClass}
            onClick={() => handleAction(item.action)}
          >
            {item.label}
          </button>
        );
      }

      const itemPaths = item.activePaths || [item.path];
      const isItemActive = isAnyActive(itemPaths);
      const isLocked = item.requiresDiagnosis && !completedSteps[2];

      return (
        <button
          key={item.label}
          type="button"
          className={`${itemClass} ${isItemActive ? 'active' : ''} ${isLocked ? 'nav-locked' : ''}`}
          onClick={() => handleLockedNavigate(item)}
        >
          {item.label}
          {item.recommended && <span className="nav-recommended-badge">시작</span>}
          {isLocked && <span className="nav-locked-badge">진단 필요</span>}
        </button>
      );
    });
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* 로고 */}
        <div className="header-logo">
          <button
            className="logo-button"
            onClick={() => navigate('/dashboard')}
            title="Foresto Compass 홈"
          >
            <span className="logo-icon">🌲</span>
            <span className="logo-text">Foresto Compass</span>
          </button>
        </div>

        {/* 모바일 햄버거 */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={mobileMenuOpen}
        >
          <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>

        {/* 데스크톱 네비게이션 */}
        <nav className="header-nav" ref={navRef}>
          {/* Step journey area */}
          <div className="step-journey">
            {journeySteps.map((stepObj, idx) => {
              const isOpen = openGroup === stepObj.label;
              const isCompleted = completedSteps[stepObj.step];
              const isCurrent = activeStep === stepObj.step;

              return (
                <div key={stepObj.step} className="step-indicator-group step-nav-group">
                  {idx > 0 && (
                    <div className={`step-connector ${completedSteps[stepObj.step - 1] ? 'completed' : ''}`} />
                  )}
                  <div className="step-button-wrapper">
                    <button
                      type="button"
                      className="step-button"
                      onClick={() => handleToggleGroup(stepObj.label)}
                      aria-haspopup="true"
                      aria-expanded={isOpen}
                    >
                      <span
                        className={`step-circle ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                      >
                        {isCompleted ? '\u2713' : stepObj.step}
                      </span>
                      <span className="step-label">{stepObj.label}</span>
                    </button>
                    {stepObj.skippable && (
                      <span className="step-skip-hint">건너뛰기 가능</span>
                    )}
                  </div>
                  {isOpen && (
                    <div className="nav-dropdown">
                      {renderDropdownItems(stepObj.items)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Auxiliary menu area */}
          <div className="aux-nav">
            {auxiliaryGroups.map((group) => {
              const groupPaths = getGroupPaths(group.items);
              const isGroupActive = isAnyActive(groupPaths);
              const isOpen = openGroup === group.label;
              return (
                <div key={group.label} className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-button ${isGroupActive ? 'active' : ''}`}
                    onClick={() => handleToggleGroup(group.label)}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                  >
                    {group.label}
                    <span className="nav-caret">▾</span>
                  </button>
                  {isOpen && (
                    <div className="nav-dropdown">
                      {renderDropdownItems(group.items)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* 다크모드 토글 */}
        <button
          className="theme-toggle"
          onClick={() => { toggleTheme(); trackEvent('theme_toggled', { new_theme: theme === 'light' ? 'dark' : 'light' }); }}
          title={theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환'}
          aria-label="테마 전환"
        >
          <span className="icon-sun" style={{ opacity: theme === 'light' ? 1 : 0, transform: theme === 'light' ? 'rotate(0deg)' : 'rotate(90deg)', position: 'absolute', transition: 'opacity 0.3s, transform 0.3s' }}>&#9728;&#65039;</span>
          <span className="icon-moon" style={{ opacity: theme === 'dark' ? 1 : 0, transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(-90deg)', position: 'absolute', transition: 'opacity 0.3s, transform 0.3s' }}>&#127769;</span>
        </button>

        {/* 사용자 정보 및 로그아웃 */}
        <div className="header-user">
          {user && (
            <div className="user-info">
              <div className="user-name-section">
                <span className="user-name">{user.name || user.email}</span>
                <span className="user-email">({user.email})</span>
                {profileIncomplete && (
                  <button
                    className="profile-incomplete-tag"
                    onClick={(e) => { e.stopPropagation(); navigate('/profile'); }}
                  >
                    프로필 입력하기
                  </button>
                )}
              </div>
              <div className="user-tier-section">
                <span
                  className="tier-badge vip-tier"
                  style={{
                    color: user.vip_tier === 'diamond' ? '#b9f2ff' :
                           user.vip_tier === 'platinum' ? '#e5e4e2' :
                           user.vip_tier === 'gold' ? '#ffd700' :
                           user.vip_tier === 'silver' ? '#c0c0c0' : '#cd7f32'
                  }}
                  title={`활동 점수: ${user.activity_points || 0}점`}
                >
                  {user.vip_tier === 'diamond' && '💠'}
                  {user.vip_tier === 'platinum' && '💎'}
                  {user.vip_tier === 'gold' && '🥇'}
                  {user.vip_tier === 'silver' && '🥈'}
                  {(!user.vip_tier || user.vip_tier === 'bronze') && '🥉'}
                  {' '}
                  {(user.vip_tier || 'bronze').toUpperCase()}
                </span>
                <span
                  className="tier-badge membership-tier"
                  style={{
                    color: user.membership_plan === 'enterprise' ? '#8b5cf6' :
                           user.membership_plan === 'pro' ? '#3b82f6' :
                           user.membership_plan === 'starter' ? '#10b981' : '#6b7280'
                  }}
                >
                  {user.membership_plan === 'enterprise' && '🏢'}
                  {user.membership_plan === 'pro' && '🚀'}
                  {user.membership_plan === 'starter' && '🌱'}
                  {(!user.membership_plan || user.membership_plan === 'free') && '🆓'}
                  {' '}
                  {(user.membership_plan || 'free').toUpperCase()}
                </span>
              </div>
            </div>
          )}
          <button
            className="btn btn-logout"
            onClick={handleLogout}
            title="로그아웃"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 모바일 드로어 */}
      {mobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={closeMobileMenu} />
      )}
      <div ref={drawerRef} className={`mobile-menu-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span>메뉴</span>
          <button
            className="mobile-menu-close"
            onClick={closeMobileMenu}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        {/* Mobile step indicator row */}
        <div className="mobile-step-row">
          {journeySteps.map((stepObj, idx) => {
            const isCompleted = completedSteps[stepObj.step];
            const isCurrent = activeStep === stepObj.step;
            return (
              <div key={stepObj.step} className="mobile-step-item">
                {idx > 0 && (
                  <div className={`mobile-step-connector ${completedSteps[stepObj.step - 1] ? 'completed' : ''}`} />
                )}
                <button
                  className={`mobile-step-circle ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => handleToggleGroup(stepObj.label)}
                  title={stepObj.label}
                >
                  {isCompleted ? '\u2713' : stepObj.step}
                </button>
              </div>
            );
          })}
        </div>

        <nav className="mobile-nav">
          {/* Journey steps */}
          {journeySteps.map((stepObj) => {
            const isOpen = openGroup === stepObj.label;
            return (
              <div key={stepObj.label} className="mobile-nav-group">
                <button
                  className={`mobile-nav-group-button ${isOpen ? 'open' : ''}`}
                  onClick={() => handleToggleGroup(stepObj.label)}
                >
                  <span className="mobile-nav-group-label">
                    <span className="mobile-nav-step-num">{stepObj.step}</span>
                    {stepObj.label}
                  </span>
                  <span className={`mobile-nav-caret ${isOpen ? 'open' : ''}`}>▾</span>
                </button>
                {isOpen && (
                  <div className="mobile-nav-items">
                    {renderDropdownItems(stepObj.items, true)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Auxiliary divider */}
          <div className="mobile-aux-divider">기타</div>

          {/* Auxiliary groups */}
          {auxiliaryGroups.map((group) => {
            const isOpen = openGroup === group.label;
            return (
              <div key={group.label} className="mobile-nav-group">
                <button
                  className={`mobile-nav-group-button ${isOpen ? 'open' : ''}`}
                  onClick={() => handleToggleGroup(group.label)}
                >
                  {group.label}
                  <span className={`mobile-nav-caret ${isOpen ? 'open' : ''}`}>▾</span>
                </button>
                {isOpen && (
                  <div className="mobile-nav-items">
                    {renderDropdownItems(group.items, true)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {user && (
          <div className="mobile-menu-user">
            <div className="mobile-user-info">
              <span className="mobile-user-name">{user.name || user.email}</span>
              {profileIncomplete && (
                <button
                  className="profile-incomplete-tag"
                  onClick={(e) => { e.stopPropagation(); navigate('/profile'); closeMobileMenu(); }}
                >
                  프로필 입력하기
                </button>
              )}
              <div className="mobile-user-tiers">
                <span
                  className="tier-badge vip-tier"
                  style={{
                    color: user.vip_tier === 'diamond' ? '#b9f2ff' :
                           user.vip_tier === 'platinum' ? '#e5e4e2' :
                           user.vip_tier === 'gold' ? '#ffd700' :
                           user.vip_tier === 'silver' ? '#c0c0c0' : '#cd7f32'
                  }}
                >
                  {user.vip_tier === 'diamond' && '💠'}
                  {user.vip_tier === 'platinum' && '💎'}
                  {user.vip_tier === 'gold' && '🥇'}
                  {user.vip_tier === 'silver' && '🥈'}
                  {(!user.vip_tier || user.vip_tier === 'bronze') && '🥉'}
                  {' '}{(user.vip_tier || 'bronze').toUpperCase()}
                </span>
                <span
                  className="tier-badge membership-tier"
                  style={{
                    color: user.membership_plan === 'enterprise' ? '#8b5cf6' :
                           user.membership_plan === 'pro' ? '#3b82f6' :
                           user.membership_plan === 'starter' ? '#10b981' : '#6b7280'
                  }}
                >
                  {user.membership_plan === 'enterprise' && '🏢'}
                  {user.membership_plan === 'pro' && '🚀'}
                  {user.membership_plan === 'starter' && '🌱'}
                  {(!user.membership_plan || user.membership_plan === 'free') && '🆓'}
                  {' '}{(user.membership_plan || 'free').toUpperCase()}
                </span>
              </div>
            </div>
            <button className="btn btn-logout mobile-logout" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
