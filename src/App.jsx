import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { ThemeContext, useThemeInit } from './hooks/useTheme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingTour from './components/OnboardingTour';
import './styles/App.css';

// Public — 정적 import (첫 화면/인증)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import GuestScreenerPage from './pages/GuestScreenerPage';
import UserGuidePage from './pages/UserGuidePage';
import NotFoundPage from './pages/NotFoundPage';
// Protected — lazy import (온디맨드 로딩)
const MarketDashboardPage = lazy(() => import('./pages/MarketDashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SurveyPage = lazy(() => import('./pages/SurveyPage'));
const TerminologyPage = lazy(() => import('./pages/TerminologyPage'));
const DiagnosisResultPage = lazy(() => import('./pages/DiagnosisResultPage'));
const DiagnosisHistoryPage = lazy(() => import('./pages/DiagnosisHistoryPage'));
const PortfolioRecommendationPage = lazy(() => import('./pages/PortfolioRecommendationPage'));
const BacktestPage = lazy(() => import('./pages/BacktestPage'));
const ScenarioSimulationPage = lazy(() => import('./pages/ScenarioSimulationPage'));
const StockScreenerPage = lazy(() => import('./pages/StockScreenerPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const PortfolioExplanationPage = lazy(() => import('./pages/PortfolioExplanationPage'));
const ReportHistoryPage = lazy(() => import('./pages/ReportHistoryPage'));
const Phase7PortfolioEvaluationPage = lazy(() => import('./pages/Phase7PortfolioEvaluationPage'));
const PortfolioBuilderPage = lazy(() => import('./pages/PortfolioBuilderPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminConsentPage = lazy(() => import('./pages/AdminConsentPage'));
const DataManagementPage = lazy(() => import('./pages/DataManagementPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const PortfolioManagementPage = lazy(() => import('./pages/PortfolioManagementPage'));
const PortfolioComparisonPage = lazy(() => import('./pages/PortfolioComparisonPage'));
const AdminMarketCalendarPage = lazy(() => import('./pages/AdminMarketCalendarPage'));
const BatchJobsPage = lazy(() => import('./pages/BatchJobsPage'));
const SchedulerPage = lazy(() => import('./pages/SchedulerPage'));
const StockDetailPage = lazy(() => import('./pages/StockDetailPage'));
const FinancialAnalysisPage = lazy(() => import('./pages/FinancialAnalysisPage'));
const ValuationPage = lazy(() => import('./pages/ValuationPage'));
const QuantAnalysisPage = lazy(() => import('./pages/QuantAnalysisPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const StockComparisonPage = lazy(() => import('./pages/StockComparisonPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentFailPage = lazy(() => import('./pages/PaymentFailPage'));
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'));

// ============================================================
// Protected Route
// ============================================================

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ============================================================
// App Component
// ============================================================

function AppContent() {
  const { isAuthenticated } = useAuth();
  const themeValue = useThemeInit();

  return (
    <ThemeContext.Provider value={themeValue}>
    <Helmet>
      <title>Foresto Compass — 종합 투자 학습 플랫폼</title>
      <meta name="description" content="Compass Score 기반 종목 분석, 포트폴리오 시뮬레이션, 투자 성향 진단. 교육 목적 참고 정보이며 투자 권유가 아닙니다." />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Foresto Compass" />
      <meta property="og:image" content="https://foresto.co.kr/og-image.png" />
      <meta property="og:locale" content="ko_KR" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <div className="app">
      {isAuthenticated && <Header />}
      {isAuthenticated && <OnboardingTour />}
      <main className="main-content">
        <ErrorBoundary>
        <Suspense fallback={<div className="loading-container"><div className="spinner"></div><p>로딩 중...</p></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/explore" element={<GuestScreenerPage />} />
          <Route path="/guide" element={<UserGuidePage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MarketDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/survey"
            element={
              <ProtectedRoute>
                <SurveyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/terminology"
            element={
              <ProtectedRoute>
                <TerminologyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result"
            element={
              <ProtectedRoute>
                <DiagnosisResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <DiagnosisHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <PortfolioRecommendationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/backtest"
            element={
              <ProtectedRoute>
                <BacktestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenarios"
            element={
              <ProtectedRoute>
                <ScenarioSimulationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/screener"
            element={
              <ProtectedRoute>
                <StockScreenerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-comparison"
            element={
              <ProtectedRoute>
                <StockComparisonPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <PortfolioExplanationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-history"
            element={
              <ProtectedRoute>
                <ReportHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/phase7-evaluation"
            element={
              <ProtectedRoute>
                <Phase7PortfolioEvaluationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio-evaluation"
            element={
              <ProtectedRoute>
                <Phase7PortfolioEvaluationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio-builder"
            element={
              <ProtectedRoute>
                <PortfolioBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data"
            element={
              <ProtectedRoute>
                <DataManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/consents"
            element={
              <ProtectedRoute>
                <AdminConsentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/market-calendar"
            element={
              <ProtectedRoute>
                <AdminMarketCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/portfolio"
            element={
              <ProtectedRoute>
                <PortfolioManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/portfolio-comparison"
            element={
              <ProtectedRoute>
                <PortfolioComparisonPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batch"
            element={
              <ProtectedRoute>
                <BatchJobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scheduler"
            element={
              <ProtectedRoute>
                <SchedulerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stock-detail"
            element={
              <ProtectedRoute>
                <StockDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/financial-analysis"
            element={
              <ProtectedRoute>
                <FinancialAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/valuation"
            element={
              <ProtectedRoute>
                <ValuationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quant"
            element={
              <ProtectedRoute>
                <QuantAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/report"
            element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute>
                <SystemHealthPage />
              </ProtectedRoute>
            }
          />

          {/* Subscription & Payment */}
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/fail"
            element={
              <ProtectedRoute>
                <PaymentFailPage />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
