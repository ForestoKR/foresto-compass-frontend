import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp as signUpApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../utils/analytics';
import { captureException } from '../utils/sentry';
import '../styles/SignupPage.css';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateEmail = (e) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !passwordConfirm) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (!validateEmail(email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signUpApi({ email, password });
      const { access_token, user } = response.data;
      login(user, access_token);
      trackEvent('signup_completed');
      navigate('/dashboard');
    } catch (err) {
      let errorType;
      if (err.response?.status === 409) {
        setError('이미 사용 중인 이메일입니다.');
        errorType = 'duplicate_email';
      } else if (!err.response) {
        setError(err.code === 'ECONNABORTED'
          ? '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          : '네트워크 연결을 확인해주세요. 서버에 연결할 수 없습니다.');
        errorType = err.code === 'ECONNABORTED' ? 'timeout' : 'network_error';
        captureException(err, { action: 'signup', error_type: errorType });
      } else if (err.response.status >= 500) {
        setError('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        errorType = 'server_error';
        captureException(err, { action: 'signup', error_type: errorType, status: err.response.status });
      } else {
        setError(err.response.data?.error?.message || err.response.data?.detail || '회원가입에 실패했습니다.');
        errorType = `http_${err.response.status}`;
      }
      trackEvent('signup_failed', { error_type: errorType });
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <h1>회원가입</h1>
        <p className="subtitle">Foresto Compass에 가입하세요</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="example@email.com"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="8자 이상"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => { setPasswordConfirm(e.target.value); setError(''); }}
              placeholder="비밀번호를 다시 입력하세요"
              disabled={isLoading}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? '가입 중...' : '회원가입'}
            </button>
          </div>
        </form>

        <p className="signup-hint">
          추가 정보는 맞춤 서비스 이용 시 안내드립니다.
        </p>

        <div className="auth-footer">
          <p>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="link">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
