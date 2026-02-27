import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { subscribeMarketEmail } from '../services/api';
import '../styles/SignupPage.css';

function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSubDone, setEmailSubDone] = useState(false);
  const [emailSubLoading, setEmailSubLoading] = useState(false);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (token && !hasVerifiedRef.current) {
      verifyEmail(token);
    } else if (!token) {
      setStatus('error');
      setMessage('유효하지 않은 인증 링크입니다.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    if (hasVerifiedRef.current) return; // 중복 호출 방지

    try {
      hasVerifiedRef.current = true; // 호출 시작 시 플래그 설정
      setStatus('verifying');
      const response = await api.get(`/auth/verify-email?token=${verificationToken}`);
      setStatus('success');
      setMessage(response.data.message || '이메일 인증이 완료되었습니다.');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || '이메일 인증에 실패했습니다.';

      // 이미 인증된 경우는 성공으로 처리
      if (errorMessage.includes('이미 인증된')) {
        setStatus('success');
        setMessage('이미 인증이 완료된 이메일입니다.');
      } else {
        setStatus('error');
        setMessage(errorMessage);
      }

      console.error('Email verification error:', err);
    }
  };

  const handleSubscribeEmail = async () => {
    setEmailSubLoading(true);
    try {
      await subscribeMarketEmail();
      setEmailSubDone(true);
    } catch {
      /* ignore */
    } finally {
      setEmailSubLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const email = prompt('이메일 주소를 입력해주세요:');
    if (!email) return;

    setIsLoading(true);
    try {
      await api.post('/auth/resend-verification-email', { email });
      alert('인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.');
    } catch (err) {
      alert(err.response?.data?.detail || '이메일 재발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 아이콘 */}
        <div className="verification-icon">
          {status === 'verifying' && <div className="loading-spinner">🔄</div>}
          {status === 'success' && <div className="success-icon">✅</div>}
          {status === 'error' && <div className="error-icon">❌</div>}
        </div>

        {/* 제목 */}
        <h1>이메일 인증</h1>

        {/* 상태별 메시지 */}
        {status === 'verifying' && (
          <div className="verification-message">
            <p>이메일을 인증하는 중입니다...</p>
            <div className="loading-spinner"></div>
          </div>
        )}

        {status === 'success' && (
          <div className="verification-message success">
            <p className="success-message">{message}</p>
            <p className="subtitle">
              이제 Foresto Compass의 모든 기능을 사용하실 수 있습니다.
            </p>

            {/* 시장 이메일 구독 카드 */}
            <div className="verify-sub-card">
              {emailSubDone ? (
                <p className="verify-sub-done">&#10003; 구독 완료!</p>
              ) : (
                <>
                  <div className="verify-sub-icon">&#128202;</div>
                  <div className="verify-sub-title">시장 요약 이메일</div>
                  <p className="verify-sub-desc">
                    매일 아침 시장 현황과 관심 종목 변동을 이메일로 받아보세요.
                  </p>
                  <button
                    className="verify-sub-btn"
                    onClick={handleSubscribeEmail}
                    disabled={emailSubLoading}
                  >
                    {emailSubLoading ? '처리 중...' : '구독하기'}
                  </button>
                </>
              )}
              <p className="verify-sub-note">교육 목적 참고 정보이며 투자 권유가 아닙니다</p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/survey')}
            >
              시작하기
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="verification-message error">
            <p className="error-message">{message}</p>
            <p className="subtitle">
              인증 링크가 만료되었거나 유효하지 않습니다.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleResendEmail}
              disabled={isLoading}
            >
              {isLoading ? '발송 중...' : '인증 이메일 재발송'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="auth-footer">
          <p>
            <Link to="/login" className="link">
              로그인으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationPage;
