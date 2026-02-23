import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPayment } from '../services/api';
import '../styles/SubscriptionPage.css';

function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const authKey = searchParams.get('authKey');
  const customerKey = searchParams.get('customerKey');
  const orderId = searchParams.get('orderId');
  const missingParams = !authKey || !customerKey || !orderId;

  const [status, setStatus] = useState(missingParams ? 'error' : 'processing');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(
    missingParams ? { message: '필수 파라미터가 누락되었습니다.' } : null
  );

  useEffect(() => {
    if (missingParams) return;

    const confirm = async () => {
      try {
        const res = await confirmPayment({
          auth_key: authKey,
          customer_key: customerKey,
          order_id: orderId,
        });
        setResult(res.data);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError({
          message: err.response?.data?.detail || '결제 확인 중 오류가 발생했습니다.',
          code: err.response?.status,
        });
      }
    };

    confirm();
  }, [searchParams, missingParams, authKey, customerKey, orderId]);

  if (status === 'processing') {
    return (
      <div className="sub-callback">
        <div className="sub-callback-card">
          <div className="sub-spinner" />
          <h2>결제 처리 중...</h2>
          <p>잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="sub-callback">
        <div className="sub-callback-card">
          <div className="sub-callback-icon">&#10060;</div>
          <h2>결제 확인 실패</h2>
          <div className="sub-error-box">
            {error?.message}
            {error?.code && (
              <div className="sub-error-code">Error code: {error.code}</div>
            )}
          </div>
          <button
            className="sub-callback-btn"
            onClick={() => navigate('/subscription')}
          >
            구독 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sub-callback">
      <div className="sub-callback-card">
        <div className="sub-callback-icon">&#9989;</div>
        <h2>구독이 시작되었습니다!</h2>
        <p>결제가 성공적으로 완료되었습니다.</p>
        {result && (
          <div className="sub-callback-details">
            {result.plan_name && (
              <div className="sub-detail-row">
                <span className="label">플랜</span>
                <span className="value">{result.plan_name}</span>
              </div>
            )}
            {result.amount != null && (
              <div className="sub-detail-row">
                <span className="label">결제 금액</span>
                <span className="value">
                  {Number(result.amount).toLocaleString()}원
                </span>
              </div>
            )}
            {result.next_billing_date && (
              <div className="sub-detail-row">
                <span className="label">다음 결제일</span>
                <span className="value">{result.next_billing_date}</span>
              </div>
            )}
          </div>
        )}
        <button
          className="sub-callback-btn"
          onClick={() => navigate('/subscription')}
        >
          구독 관리로 이동
        </button>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
