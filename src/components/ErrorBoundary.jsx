import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/ErrorBoundary.css';

function isChunkLoadError(error) {
  if (error.name === 'ChunkLoadError') return true;
  const msg = error.message || '';
  return msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically imported module');
}

/**
 * Wrapper that passes location.pathname to the class component
 * so it can reset error state on route changes.
 */
function ErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundaryInner key={location.pathname}>
      {children}
    </ErrorBoundaryInner>
  );
}

class ErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);

    // Chunk load error → auto reload once
    if (isChunkLoadError(error)) {
      const key = 'chunk_reload_attempted';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(key);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isChunk = isChunkLoadError(this.state.error);

    return (
      <div className="error-boundary-container">
        <div className="error-boundary-card">
          <div className="error-boundary-icon">
            {isChunk ? '🔌' : '⚠️'}
          </div>
          <h2 className="error-boundary-title">
            {isChunk ? '페이지 로딩 실패' : '오류 발생'}
          </h2>
          <p className="error-boundary-message">
            {isChunk
              ? '페이지를 불러오는 중 네트워크 오류가 발생했습니다.'
              : '예기치 않은 오류가 발생했습니다.'}
          </p>
          <p className="error-boundary-hint">
            {isChunk
              ? '인터넷 연결을 확인한 후 다시 시도해 주세요.'
              : '문제가 계속되면 페이지를 새로고침하거나 홈으로 이동해 주세요.'}
          </p>
          <div className="error-boundary-actions">
            <button
              className="error-boundary-btn error-boundary-btn-primary"
              onClick={() => window.location.reload()}
            >
              다시 시도
            </button>
            <button
              className="error-boundary-btn error-boundary-btn-secondary"
              onClick={() => { window.location.href = '/'; }}
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
