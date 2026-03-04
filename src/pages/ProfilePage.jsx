import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { changePassword, listConsents, getMarketSubscriptionStatus, subscribeMarketEmail, unsubscribeMarketEmail, getProfileCompletionStatus } from '../services/api';
import { trackEvent } from '../utils/analytics';
import '../styles/ProfilePage.css';

const REQUIRED_FIELDS = new Set(['name', 'age_group', 'investment_experience', 'risk_tolerance']);

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [consents, setConsents] = useState([]);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentError, setConsentError] = useState('');

  // 시장 이메일 구독 관련 상태
  const [marketSub, setMarketSub] = useState(null);
  const [marketSubLoading, setMarketSubLoading] = useState(true);
  const [marketSubToggling, setMarketSubToggling] = useState(false);

  // 프로필 완성도
  const [completionStatus, setCompletionStatus] = useState(null);

  // 비밀번호 변경 관련 상태
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isFieldEmpty = (field) => {
    const val = formData[field];
    return val === null || val === undefined || val === '';
  };

  const fieldLabel = (label, field) => (
    <>
      {label}
      {REQUIRED_FIELDS.has(field)
        ? <span className="pp-required-badge">필수</span>
        : <span className="pp-optional-badge">선택</span>}
    </>
  );

  const fieldClass = (field) => {
    if (REQUIRED_FIELDS.has(field) && isEditing && isFieldEmpty(field)) {
      return 'profile-field pp-field-incomplete';
    }
    return 'profile-field';
  };

  // 프로필 조회
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/auth/profile');
      setProfile(response.data);
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(err.response?.data?.detail || '프로필을 불러오는데 실패했습니다.');

      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConsents = async () => {
    try {
      setConsentLoading(true);
      setConsentError('');
      const response = await listConsents();
      setConsents(response.data.consents || []);
    } catch {
      setConsentError('동의 이력을 불러오는데 실패했습니다.');
    } finally {
      setConsentLoading(false);
    }
  };

  const fetchMarketSub = async () => {
    try {
      setMarketSubLoading(true);
      const res = await getMarketSubscriptionStatus();
      setMarketSub(res.data);
    } catch {
      // 조회 실패 시 무시
    } finally {
      setMarketSubLoading(false);
    }
  };

  const handleMarketSubToggle = async () => {
    setMarketSubToggling(true);
    try {
      if (marketSub?.subscribed) {
        await unsubscribeMarketEmail();
      } else {
        await subscribeMarketEmail();
      }
      await fetchMarketSub();
    } catch (err) {
      setError(err.response?.data?.detail || '구독 설정 변경에 실패했습니다.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setMarketSubToggling(false);
    }
  };

  const fetchCompletionStatus = async () => {
    try {
      const res = await getProfileCompletionStatus();
      setCompletionStatus(res.data);
    } catch {
      // 실패 시 무시
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchConsents();
    fetchMarketSub();
    fetchCompletionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 프로필 수정
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    try {
      const updateData = {
        name: formData.name || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        age_group: formData.age_group || null,
        occupation: formData.occupation || null,
        company: formData.company || null,
        annual_income: formData.annual_income ? parseInt(formData.annual_income) : null,
        total_assets: formData.total_assets ? parseInt(formData.total_assets) : null,
        city: formData.city || null,
        district: formData.district || null,
        investment_experience: formData.investment_experience || null,
        investment_goal: formData.investment_goal || null,
        risk_tolerance: formData.risk_tolerance || null,
      };

      const response = await api.put('/auth/profile', updateData);
      setProfile(response.data);
      setFormData(response.data);
      setIsEditing(false);
      fetchCompletionStatus();
      setSuccessMessage('saved');
      trackEvent('profile_completed');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.detail || '프로필 업데이트에 실패했습니다.');
    }
  };

  // 수정 취소
  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
    setError(null);
  };

  // 입력 변경
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 비밀번호 변경 처리
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // 유효성 검증
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setIsChangingPassword(false);
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.response?.data?.detail || '비밀번호 변경에 실패했습니다.');
    }
  };

  // 비밀번호 변경 취소
  const handlePasswordCancel = () => {
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    setIsChangingPassword(false);
    setPasswordError('');
  };

  // 이메일 인증 메일 발송
  const handleSendVerificationEmail = async () => {
    try {
      await api.post('/auth/send-verification-email');
      setSuccessMessage('인증 이메일이 발송되었습니다. 이메일을 확인해주세요.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to send verification email:', err);
      setError(err.response?.data?.detail || '이메일 발송에 실패했습니다.');
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">프로필을 불러오는 중...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="error-message">프로필을 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>내 프로필</h1>
        <div className="header-actions">
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              프로필 수정
            </button>
          ) : (
            <>
              <button className="btn-cancel" onClick={handleCancel}>
                취소
              </button>
              <button className="btn-save" onClick={handleUpdate}>
                저장
              </button>
            </>
          )}
        </div>
      </div>

      {completionStatus && !completionStatus.is_complete && (
        <div className="profile-completion-banner">
          <div className="completion-info">
            <span>프로필 완성도 {completionStatus.completion_percent}%</span>
            <span className="completion-hint">
              미입력: {completionStatus.missing_fields.map(f => f.label).join(', ')}
            </span>
          </div>
          <div className="completion-bar">
            <div
              className="completion-fill"
              style={{ width: `${completionStatus.completion_percent}%` }}
            />
          </div>
        </div>
      )}

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {successMessage === 'saved' && (
        <div className="pp-next-actions">
          <div className="pp-next-header">
            프로필이 저장되었습니다. 다음 단계를 시작해보세요!
          </div>
          <div className="pp-next-grid">
            <button className="pp-next-card" onClick={() => navigate('/survey')}>
              <span className="pp-next-icon">&#127919;</span>
              <span className="pp-next-label">학습 성향 진단</span>
              <span className="pp-next-desc">나에게 맞는 전략 찾기</span>
            </button>
            <button className="pp-next-card" onClick={() => navigate('/screener')}>
              <span className="pp-next-icon">&#128202;</span>
              <span className="pp-next-label">종목 스크리너</span>
              <span className="pp-next-desc">Foresto IQ로 탐색</span>
            </button>
            <button className="pp-next-card" onClick={() => navigate('/dashboard')}>
              <span className="pp-next-icon">&#128200;</span>
              <span className="pp-next-label">대시보드</span>
              <span className="pp-next-desc">시장 현황 확인</span>
            </button>
          </div>
        </div>
      )}

      {successMessage !== 'saved' && (
        <div className="pp-guidance-text">
          필수 항목을 입력하면 맞춤 서비스를 이용할 수 있습니다
        </div>
      )}

      <form onSubmit={handleUpdate}>
        {/* 기본 정보 */}
        <div className="profile-section">
          <h2>기본 정보</h2>
          <div className="profile-grid">
            <div className="profile-field">
              <label>이메일</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="disabled-input"
              />
              <div className="pp-email-status">
                {profile.is_email_verified ? (
                  <span className="pp-verified">
                    ✓ 인증 완료
                  </span>
                ) : (
                  <>
                    <span className="pp-unverified">
                      ✗ 미인증
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary pp-verify-btn"
                      onClick={handleSendVerificationEmail}
                    >
                      인증 이메일 발송
                    </button>
                  </>
                )}
              </div>
              <small>이메일은 변경할 수 없습니다</small>
            </div>

            {/* 등급 정보 표시 */}
            <div className="profile-field">
              <label>VIP 등급</label>
              <div className="pp-tier-row">
                <span style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: profile.vip_tier === 'diamond' ? '#b9f2ff' :
                         profile.vip_tier === 'platinum' ? '#e5e4e2' :
                         profile.vip_tier === 'gold' ? '#ffd700' :
                         profile.vip_tier === 'silver' ? '#c0c0c0' : '#cd7f32'
                }}>
                  {profile.vip_tier === 'diamond' && '💠'}
                  {profile.vip_tier === 'platinum' && '💎'}
                  {profile.vip_tier === 'gold' && '🥇'}
                  {profile.vip_tier === 'silver' && '🥈'}
                  {profile.vip_tier === 'bronze' && '🥉'}
                  {' '}
                  {profile.vip_tier?.toUpperCase() || 'BRONZE'}
                </span>
                <span className="pp-activity-points">
                  활동 점수: {profile.activity_points || 0}점
                </span>
              </div>
            </div>

            <div className="profile-field">
              <label>멤버십 플랜</label>
              <div className="pp-tier-row">
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: profile.membership_plan === 'enterprise' ? '#8b5cf6' :
                         profile.membership_plan === 'pro' ? '#3b82f6' :
                         profile.membership_plan === 'starter' ? '#10b981' : '#6b7280'
                }}>
                  {profile.membership_plan === 'enterprise' && '🏢'}
                  {profile.membership_plan === 'pro' && '🚀'}
                  {profile.membership_plan === 'starter' && '🌱'}
                  {profile.membership_plan === 'free' && '🆓'}
                  {' '}
                  {profile.membership_plan?.toUpperCase() || 'FREE'}
                </span>
              </div>
              <small>등급에 따라 시뮬레이션 생성 횟수, AI 학습 분석 횟수 등이 제한됩니다</small>
              <button
                type="button"
                className="pp-verify-btn"
                style={{ marginTop: '0.5rem' }}
                onClick={() => navigate('/subscription')}
              >
                구독 관리
              </button>
            </div>

            <div className={fieldClass('name')}>
              <label>{fieldLabel('이름', 'name')}</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={!isEditing}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className={fieldClass('phone')}>
              <label>{fieldLabel('전화번호', 'phone')}</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={!isEditing}
                placeholder="010-1234-5678"
              />
            </div>

            <div className={fieldClass('age_group')}>
              <label>{fieldLabel('연령대', 'age_group')}</label>
              <select
                value={formData.age_group || ''}
                onChange={(e) => handleChange('age_group', e.target.value)}
                disabled={!isEditing}
              >
                <option value="">선택해주세요</option>
                <option value="10s">10대</option>
                <option value="20s">20대</option>
                <option value="30s">30대</option>
                <option value="40s">40대</option>
                <option value="50s">50대</option>
                <option value="60s_plus">60대 이상</option>
              </select>
            </div>
          </div>
        </div>

        {/* 직업 및 재무 정보 */}
        <div className="profile-section">
          <h2>직업 및 재무 정보</h2>
          <p className="pp-section-disclaimer">
            ⚠️ 입력하신 정보는 학습용 시뮬레이션 생성에만 참고되며, 투자 권유·추천 목적으로 사용되지 않습니다.
          </p>
          <div className="profile-grid">
            <div className={fieldClass('occupation')}>
              <label>{fieldLabel('직업', 'occupation')}</label>
              <input
                type="text"
                value={formData.occupation || ''}
                onChange={(e) => handleChange('occupation', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 소프트웨어 엔지니어"
              />
            </div>

            <div className={fieldClass('company')}>
              <label>{fieldLabel('회사명', 'company')}</label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 테크컴퍼니"
              />
            </div>

            <div className={fieldClass('annual_income')}>
              <label>{fieldLabel('연봉 (만원)', 'annual_income')}</label>
              <input
                type="number"
                value={formData.annual_income || ''}
                onChange={(e) => handleChange('annual_income', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 5000"
                min="0"
              />
            </div>

            <div className={fieldClass('total_assets')}>
              <label>{fieldLabel('총 자산 (만원)', 'total_assets')}</label>
              <input
                type="number"
                value={formData.total_assets || ''}
                onChange={(e) => handleChange('total_assets', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 10000"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* 주소 정보 */}
        <div className="profile-section">
          <h2>주소 정보</h2>
          <div className="profile-grid">
            <div className={fieldClass('city')}>
              <label>{fieldLabel('거주 도시', 'city')}</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 서울"
              />
            </div>

            <div className={fieldClass('district')}>
              <label>{fieldLabel('구/군', 'district')}</label>
              <input
                type="text"
                value={formData.district || ''}
                onChange={(e) => handleChange('district', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 강남구"
              />
            </div>
          </div>
        </div>

        {/* 학습 성향 */}
        <div className="profile-section">
          <h2>학습 성향</h2>
          <p className="pp-section-disclaimer">
            ⚠️ 학습 성향 정보는 교육 목적의 시뮬레이션 예시 생성에 활용되며, 실제 투자 권유가 아닙니다.
          </p>
          <div className="profile-grid">
            <div className={fieldClass('investment_experience')}>
              <label>{fieldLabel('자산 운용 학습 수준', 'investment_experience')}</label>
              <select
                value={formData.investment_experience || ''}
                onChange={(e) => handleChange('investment_experience', e.target.value)}
                disabled={!isEditing}
              >
                <option value="">선택해주세요</option>
                <option value="초보">초보 - 자산 운용 지식이 거의 없음</option>
                <option value="중급">중급 - 기초적인 학습 완료</option>
                <option value="고급">고급 - 중급 이상의 학습 완료</option>
                <option value="전문가">전문가 - 전문적인 지식 보유</option>
              </select>
            </div>

            <div className={fieldClass('risk_tolerance')}>
              <label>{fieldLabel('리스크 학습 선호도', 'risk_tolerance')}</label>
              <select
                value={formData.risk_tolerance || ''}
                onChange={(e) => handleChange('risk_tolerance', e.target.value)}
                disabled={!isEditing}
              >
                <option value="">선택해주세요</option>
                <option value="보수적">보수적 - 안정성 중심 전략 학습 선호</option>
                <option value="중립적">중립적 - 균형잡힌 전략 학습 선호</option>
                <option value="공격적">공격적 - 성장성 중심 전략 학습 선호</option>
              </select>
            </div>

            <div className={`${fieldClass('investment_goal')} full-width`}>
              <label>{fieldLabel('학습 목표', 'investment_goal')}</label>
              <input
                type="text"
                value={formData.investment_goal || ''}
                onChange={(e) => handleChange('investment_goal', e.target.value)}
                disabled={!isEditing}
                placeholder="예: 자산 배분 전략 이해, 재무지표 분석 학습, 퀀트 지표 학습 등"
              />
            </div>
          </div>
        </div>

        {/* 시스템 정보 */}
        <div className="profile-section">
          <h2>시스템 정보</h2>
          <div className="profile-grid">
            <div className="profile-field">
              <label>사용자 ID</label>
              <input
                type="text"
                value={profile.id}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="profile-field">
              <label>역할</label>
              <input
                type="text"
                value={profile.role === 'admin' ? '관리자' : '일반 사용자'}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="profile-field">
              <label>가입일</label>
              <input
                type="text"
                value={new Date(profile.created_at).toLocaleString('ko-KR')}
                disabled
                className="disabled-input"
              />
            </div>
          </div>
        </div>

        {/* 동의 이력 */}
        <div className="profile-section">
          <h2>동의 이력</h2>
          {consentLoading && <div className="info-message">불러오는 중...</div>}
          {consentError && <div className="error-message" role="alert">{consentError}</div>}
          {!consentLoading && !consentError && consents.length === 0 && (
            <div className="info-message">동의 이력이 없습니다.</div>
          )}
          {!consentLoading && !consentError && consents.length > 0 && (
            <div className="consent-table">
              <div className="consent-row consent-header">
                <span>유형</span>
                <span>버전</span>
                <span>동의 일시</span>
              </div>
              {consents.map((consent) => (
                <div key={consent.consent_id} className="consent-row">
                  <span>{consent.consent_type}</span>
                  <span>{consent.consent_version}</span>
                  <span>{new Date(consent.agreed_at).toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* 시장 정보 이메일 수신 */}
      <div className="profile-section">
        <h2>시장 정보 이메일 수신</h2>
        <p className="pp-section-disclaimer">
          매일 아침 7:30에 전일 시장 현황 요약을 이메일로 받아보세요. (교육 목적 정보 제공)
        </p>

        {marketSubLoading ? (
          <div className="info-message">불러오는 중...</div>
        ) : !profile?.is_email_verified ? (
          <div className="pp-market-sub-warning">
            이메일 인증 후 구독이 가능합니다. 위 이메일 항목에서 인증을 완료해주세요.
          </div>
        ) : (
          <div className="pp-market-sub-row">
            <label className="pp-toggle-switch">
              <input
                type="checkbox"
                checked={marketSub?.subscribed || false}
                onChange={handleMarketSubToggle}
                disabled={marketSubToggling}
              />
              <span className="pp-toggle-slider"></span>
            </label>
            <div className="pp-market-sub-info">
              {marketSub?.subscribed ? (
                <span className="pp-sub-active">
                  구독 중
                  {marketSub.subscribed_at && (
                    <> ({new Date(marketSub.subscribed_at).toLocaleDateString('ko-KR')}부터)</>
                  )}
                </span>
              ) : (
                <span className="pp-sub-inactive">미구독</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 비밀번호 변경 */}
      <div className="profile-section">
        <h2>비밀번호 변경</h2>

        {passwordSuccess && (
          <div className="success-message">{passwordSuccess}</div>
        )}

        {!isChangingPassword ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsChangingPassword(true)}
          >
            비밀번호 변경
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="password-form">
            {passwordError && (
              <div className="error-message" role="alert">{passwordError}</div>
            )}

            <div className="profile-field">
              <label>현재 비밀번호 *</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                placeholder="현재 비밀번호를 입력하세요"
                required
              />
            </div>

            <div className="profile-field">
              <label>새 비밀번호 *</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                placeholder="새 비밀번호 (최소 8자)"
                required
                minLength={8}
              />
            </div>

            <div className="profile-field">
              <label>새 비밀번호 확인 *</label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                placeholder="새 비밀번호를 다시 입력하세요"
                required
                minLength={8}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                비밀번호 변경
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePasswordCancel}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>

      {isEditing && (
        <div className="pp-sticky-actions">
          <button className="btn-cancel" onClick={handleCancel}>취소</button>
          <button className="btn-save" onClick={handleUpdate}>저장</button>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
