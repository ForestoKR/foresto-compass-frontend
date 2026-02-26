import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../utils/analytics';
import '../styles/SignupPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 입력값 검증
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // API 호출
      const response = await loginApi({
        email,
        password,
      });

      // 성공
      const { access_token, user } = response.data;
      login(user, access_token);
      trackEvent('login_completed');

      // 역할에 따라 다른 페이지로 이동
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (!err.response) {
        setError(err.code === 'ECONNABORTED'
          ? '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          : '네트워크 연결을 확인해주세요. 서버에 연결할 수 없습니다.');
      } else if (err.response.status >= 500) {
        setError('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(err.response.data?.error?.message || err.response.data?.detail || '로그인에 실패했습니다.');
      }
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>로그인</h1>
        <p className="subtitle">Foresto Compass에 로그인하세요</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            계정이 없으신가요?{' '}
            <Link to="/signup" className="link">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;