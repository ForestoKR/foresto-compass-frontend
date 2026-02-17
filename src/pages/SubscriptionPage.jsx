import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPaymentPlans,
  getSubscription,
  createCheckout,
  cancelSubscription,
  getPaymentHistory,
} from '../services/api';
import '../styles/SubscriptionPage.css';

const TOSS_SDK_URL = 'https://js.tosspayments.com/v2/standard';

function SubscriptionPage() {
  const navigate = useNavigate();

  // tabs
  const [activeTab, setActiveTab] = useState('plans'); // plans | my | history

  // data
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0 });
  const [historyPage, setHistoryPage] = useState(1);

  // UI state
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Load Toss SDK ──
  useEffect(() => {
    if (document.querySelector(`script[src="${TOSS_SDK_URL}"]`)) return;
    const script = document.createElement('script');
    script.src = TOSS_SDK_URL;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // ── Initial data load ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [plansRes, subRes] = await Promise.all([
          getPaymentPlans(),
          getSubscription().catch(() => null),
        ]);
        setPlans(plansRes.data?.plans || plansRes.data || []);
        const sub = subRes?.data?.subscription || subRes?.data || null;
        setSubscription(sub);

        // default tab
        if (sub && sub.status === 'active') {
          setActiveTab('my');
        }
      } catch (err) {
        setError('데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Load payment history ──
  const loadHistory = useCallback(async (page = 1) => {
    try {
      const res = await getPaymentHistory(page);
      setHistory({
        items: res.data?.items || res.data?.payments || [],
        total: res.data?.total || 0,
      });
      setHistoryPage(page);
    } catch {
      setHistory({ items: [], total: 0 });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(1);
    }
  }, [activeTab, loadHistory]);

  // ── Checkout flow ──
  const handleCheckout = async (plan) => {
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
    if (!clientKey || clientKey.includes('REPLACE')) {
      setError('토스 클라이언트 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
      return;
    }

    setCheckoutLoading(plan.id || plan.name);
    setError(null);

    try {
      const billingCycle = isAnnual ? 'yearly' : 'monthly';
      const res = await createCheckout({
        plan_id: plan.id,
        billing_cycle: billingCycle,
      });

      const { order_id, amount, customer_key, order_name } = res.data;

      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: customer_key });

      await payment.requestBillingAuth({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId: order_id,
        orderName: order_name || plan.name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      if (err.code !== 'USER_CANCEL') {
        setError(err.response?.data?.detail || err.message || '결제 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  // ── Cancel subscription ──
  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await cancelSubscription();
      const subRes = await getSubscription().catch(() => null);
      setSubscription(subRes?.data?.subscription || subRes?.data || null);
      setCancelConfirm(false);
    } catch (err) {
      setError(err.response?.data?.detail || '구독 해지 중 오류가 발생했습니다.');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Price helpers ──
  const getPrice = (plan) => {
    if (isAnnual) {
      const yearly = plan.yearly_price ?? plan.price * 10;
      return Math.round(yearly / 12);
    }
    return plan.price ?? 0;
  };

  const getTotalPrice = (plan) => {
    if (isAnnual) {
      return plan.yearly_price ?? plan.price * 10;
    }
    return plan.price ?? 0;
  };

  const formatPrice = (val) => Number(val).toLocaleString();

  // ── Render ──
  if (loading) {
    return (
      <div className="sub-page">
        <h1>구독 관리</h1>
        <div className="sub-loading">
          <div className="sub-spinner" />
          <p>불러오는 중...</p>
        </div>
      </div>
    );
  }

  const paidPlans = plans.filter(
    (p) => (p.price ?? 0) > 0 || p.slug !== 'free'
  );

  return (
    <div className="sub-page">
      <h1>구독 관리</h1>

      {error && (
        <div className="sub-error-box">
          {error}
          <button
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#991b1b',
              fontWeight: 'bold',
            }}
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="sub-tabs">
        <button
          className={`sub-tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          플랜 선택
        </button>
        <button
          className={`sub-tab ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          내 구독
        </button>
        <button
          className={`sub-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          결제 내역
        </button>
      </div>

      {/* ── Plans Tab ── */}
      {activeTab === 'plans' && (
        <>
          {/* Billing toggle */}
          <div className="sub-billing-toggle">
            <span className={!isAnnual ? 'active' : ''}>월간</span>
            <button
              className={`sub-toggle-switch ${isAnnual ? 'on' : ''}`}
              onClick={() => setIsAnnual(!isAnnual)}
              aria-label="결제 주기 전환"
            />
            <span className={isAnnual ? 'active' : ''}>연간</span>
            {isAnnual && <span className="sub-save-badge">20% 할인</span>}
          </div>

          {/* Plan cards */}
          <div className="sub-plans-grid">
            {/* Free plan */}
            <div className="sub-plan-card">
              <div className="sub-plan-name">Free</div>
              <div className="sub-plan-price">
                무료
              </div>
              <div className="sub-plan-desc">기본 기능을 무료로 이용하세요</div>
              <ul className="sub-plan-features">
                <li>시장현황 대시보드</li>
                <li>투자성향 진단 (월 3회)</li>
                <li>기본 종목 스크리너</li>
                <li>용어 학습</li>
              </ul>
              <button
                className="sub-plan-btn secondary"
                disabled={!subscription || subscription.status !== 'active'}
              >
                {!subscription || subscription.status !== 'active'
                  ? '현재 플랜'
                  : '무료로 전환'}
              </button>
            </div>

            {/* Paid plans */}
            {paidPlans.map((plan) => {
              const isCurrent =
                subscription &&
                subscription.status === 'active' &&
                subscription.plan_id === plan.id;
              const monthlyPrice = getPrice(plan);

              return (
                <div
                  key={plan.id || plan.slug}
                  className={`sub-plan-card ${isCurrent ? 'current' : ''} ${
                    !isCurrent ? 'recommended' : ''
                  }`}
                >
                  {!isCurrent && (
                    <span className="sub-plan-badge">추천</span>
                  )}
                  {isCurrent && (
                    <span className="sub-plan-badge">현재 플랜</span>
                  )}
                  <div className="sub-plan-name">{plan.name}</div>
                  <div className="sub-plan-price">
                    {formatPrice(monthlyPrice)}원
                    <span className="sub-price-unit"> /월</span>
                  </div>
                  {isAnnual && (
                    <div className="sub-plan-original">
                      월 {formatPrice(plan.price)}원
                    </div>
                  )}
                  {isAnnual && (
                    <div className="sub-plan-desc" style={{ marginBottom: '0.5rem' }}>
                      연 {formatPrice(getTotalPrice(plan))}원 결제
                    </div>
                  )}
                  <div className="sub-plan-desc">
                    {plan.description || '프리미엄 기능을 모두 이용하세요'}
                  </div>
                  <ul className="sub-plan-features">
                    {(plan.features || []).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                    {(!plan.features || plan.features.length === 0) && (
                      <>
                        <li>무제한 투자성향 진단</li>
                        <li>AI 포트폴리오 추천</li>
                        <li>고급 종목 스크리닝</li>
                        <li>실시간 관심 종목 알림</li>
                        <li>상세 리포트 생성</li>
                      </>
                    )}
                  </ul>
                  <button
                    className={`sub-plan-btn ${isCurrent ? 'secondary' : 'primary'}`}
                    disabled={isCurrent || checkoutLoading != null}
                    onClick={() => !isCurrent && handleCheckout(plan)}
                  >
                    {isCurrent
                      ? '현재 플랜'
                      : checkoutLoading === (plan.id || plan.name)
                        ? '처리 중...'
                        : '구독하기'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── My Subscription Tab ── */}
      {activeTab === 'my' && (
        <>
          {subscription && subscription.status ? (
            <div className="sub-my-card">
              <h3>구독 정보</h3>
              <div className="sub-info-grid">
                <div className="sub-info-item">
                  <span className="sub-info-label">플랜</span>
                  <span className="sub-info-value">
                    {subscription.plan_name || subscription.plan || '-'}
                  </span>
                </div>
                <div className="sub-info-item">
                  <span className="sub-info-label">상태</span>
                  <span className="sub-info-value">
                    <span
                      className={`sub-status-badge ${
                        subscription.cancel_at_period_end
                          ? 'canceled'
                          : subscription.status === 'active'
                            ? 'active'
                            : 'pending'
                      }`}
                    >
                      {subscription.cancel_at_period_end
                        ? '해지 예정'
                        : subscription.status === 'active'
                          ? '활성'
                          : subscription.status}
                    </span>
                  </span>
                </div>
                <div className="sub-info-item">
                  <span className="sub-info-label">결제 주기</span>
                  <span className="sub-info-value">
                    {subscription.billing_cycle === 'yearly' ? '연간' : '월간'}
                  </span>
                </div>
                <div className="sub-info-item">
                  <span className="sub-info-label">구독 시작일</span>
                  <span className="sub-info-value">
                    {subscription.started_at
                      ? new Date(subscription.started_at).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="sub-info-item">
                  <span className="sub-info-label">현재 기간 종료</span>
                  <span className="sub-info-value">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="sub-info-item">
                  <span className="sub-info-label">다음 결제일</span>
                  <span className="sub-info-value">
                    {subscription.cancel_at_period_end
                      ? '결제 없음'
                      : subscription.next_billing_date
                        ? new Date(subscription.next_billing_date).toLocaleDateString('ko-KR')
                        : '-'}
                  </span>
                </div>
              </div>

              {subscription.cancel_at_period_end && (
                <div className="sub-cancel-notice">
                  구독이 현재 기간 종료 후 해지됩니다. 종료일까지 모든 기능을 이용할 수 있습니다.
                </div>
              )}

              {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <>
                  {!cancelConfirm ? (
                    <button
                      className="sub-cancel-btn"
                      onClick={() => setCancelConfirm(true)}
                    >
                      구독 해지
                    </button>
                  ) : (
                    <div className="sub-cancel-confirm">
                      <p>
                        구독을 해지하시겠습니까? 현재 결제 기간이 끝날 때까지 서비스를 계속 이용할 수 있습니다.
                      </p>
                      <div className="sub-cancel-actions">
                        <button
                          className="confirm"
                          onClick={handleCancel}
                          disabled={cancelLoading}
                        >
                          {cancelLoading ? '처리 중...' : '해지 확인'}
                        </button>
                        <button
                          className="dismiss"
                          onClick={() => setCancelConfirm(false)}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="sub-empty">
              <p>활성 구독이 없습니다.</p>
              <button onClick={() => setActiveTab('plans')}>
                플랜 둘러보기
              </button>
            </div>
          )}
        </>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'history' && (
        <div className="sub-history-wrap">
          {history.items.length > 0 ? (
            <>
              <table className="sub-history-table">
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>금액</th>
                    <th>상태</th>
                    <th>유형</th>
                    <th>영수증</th>
                  </tr>
                </thead>
                <tbody>
                  {history.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>
                        {item.paid_at || item.created_at
                          ? new Date(item.paid_at || item.created_at).toLocaleString('ko-KR')
                          : '-'}
                      </td>
                      <td>{formatPrice(item.amount || 0)}원</td>
                      <td>
                        <span
                          className={`sub-status-badge ${
                            item.status === 'paid' || item.status === 'DONE'
                              ? 'active'
                              : item.status === 'failed'
                                ? 'canceled'
                                : 'pending'
                          }`}
                        >
                          {item.status === 'paid' || item.status === 'DONE'
                            ? '완료'
                            : item.status === 'failed'
                              ? '실패'
                              : item.status || '-'}
                        </span>
                      </td>
                      <td>{item.type || item.order_name || '-'}</td>
                      <td>
                        {item.receipt_url ? (
                          <a
                            href={item.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sub-receipt-link"
                          >
                            보기
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.total > 20 && (
                <div className="sub-pagination">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => loadHistory(historyPage - 1)}
                  >
                    이전
                  </button>
                  <span style={{ padding: '0.375rem 0.5rem', fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                    {historyPage} / {Math.ceil(history.total / 20)}
                  </span>
                  <button
                    disabled={historyPage >= Math.ceil(history.total / 20)}
                    onClick={() => loadHistory(historyPage + 1)}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="sub-empty">
              <p>결제 내역이 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SubscriptionPage;
