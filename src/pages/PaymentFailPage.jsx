import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/SubscriptionPage.css';

function PaymentFailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const code = searchParams.get('code') || 'UNKNOWN';
  const message = searchParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다.';

  return (
    <div className="sub-callback">
      <div className="sub-callback-card">
        <div className="sub-callback-icon">&#9888;&#65039;</div>
        <h2>결제 실패</h2>
        <div className="sub-error-box">
          {message}
          <div className="sub-error-code">Error code: {code}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            className="sub-callback-btn"
            onClick={() => navigate('/subscription')}
          >
            다시 시도하기
          </button>
          <button
            className="sub-callback-btn secondary"
            onClick={() => navigate('/dashboard')}
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailPage;
