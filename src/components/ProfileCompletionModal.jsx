import { useState, useEffect, useRef, useCallback } from 'react';
import { getProfileCompletionStatus, updateProfile } from '../services/api';
import { trackEvent } from '../utils/analytics';
import '../styles/ProfileCompletionModal.css';

const FIELD_CONFIG = {
  name: { label: '이름', type: 'text', placeholder: '홍길동' },
  age_group: {
    label: '연령대',
    type: 'select',
    options: [
      { value: '', label: '선택해주세요' },
      { value: '10s', label: '10대' },
      { value: '20s', label: '20대' },
      { value: '30s', label: '30대' },
      { value: '40s', label: '40대' },
      { value: '50s', label: '50대' },
      { value: '60s_plus', label: '60대 이상' },
    ],
  },
  investment_experience: {
    label: '투자 경험',
    type: 'select',
    options: [
      { value: '', label: '선택해주세요' },
      { value: 'none', label: '없음' },
      { value: 'beginner', label: '1년 미만' },
      { value: 'intermediate', label: '1~3년' },
      { value: 'advanced', label: '3년 이상' },
    ],
  },
  risk_tolerance: {
    label: '위험 성향',
    type: 'select',
    options: [
      { value: '', label: '선택해주세요' },
      { value: 'conservative', label: '안정형' },
      { value: 'moderate', label: '중립형' },
      { value: 'aggressive', label: '적극형' },
    ],
  },
};

function ProfileCompletionModal({ onClose, onComplete }) {
  const [status, setStatus] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    loadStatus();
  }, []);

  // Esc 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 포커스 트랩
  const handleFocusTrap = useCallback((e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  // 마운트 시 첫 포커스 가능 요소로 이동 + 포커스 트랩 등록
  useEffect(() => {
    if (!modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [status, handleFocusTrap]);

  const loadStatus = async () => {
    try {
      const res = await getProfileCompletionStatus();
      setStatus(res.data);
      // 미입력 필드만 폼에 초기화
      const initial = {};
      res.data.missing_fields.forEach((f) => {
        initial[f.field] = '';
      });
      setFormData(initial);
    } catch {
      setError('프로필 정보를 불러오지 못했습니다.');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 빈 값 검증
    const empty = Object.entries(formData).filter(([, v]) => !v);
    if (empty.length > 0) {
      setError('모든 항목을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ ...formData });
      trackEvent('profile_completed');
      onComplete?.();
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (!status) return null;
  if (status.is_complete) return null;

  return (
    <div className="pcm-overlay" onClick={onClose}>
      <div className="pcm-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="pcm-title" onClick={(e) => e.stopPropagation()}>
        <div className="pcm-header">
          <h2 id="pcm-title">30초면 나만의 투자 학습이 시작됩니다</h2>
          <p className="pcm-subtitle">
            {status.missing_fields.length}개 항목만 입력하면 바로 이용할 수 있어요
          </p>
          <ul className="pcm-benefits">
            <li>내 성향에 맞는 포트폴리오 시뮬레이션</li>
            <li>맞춤 종목 스크리닝 및 Compass Score</li>
            <li>투자 학습 진단 리포트 제공</li>
          </ul>
          <div className="pcm-progress-bar">
            <div
              className="pcm-progress-fill"
              style={{ width: `${status.completion_percent}%` }}
            />
          </div>
          <span className="pcm-progress-text">{status.completion_percent}% 완료</span>
        </div>

        {error && <div className="pcm-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          {status.missing_fields.map((f) => {
            const config = FIELD_CONFIG[f.field];
            if (!config) return null;

            return (
              <div key={f.field} className="pcm-field">
                <label htmlFor={`pcm-${f.field}`}>{config.label}</label>
                {config.type === 'select' ? (
                  <select
                    id={`pcm-${f.field}`}
                    value={formData[f.field] || ''}
                    onChange={(e) => handleChange(f.field, e.target.value)}
                  >
                    {config.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`pcm-${f.field}`}
                    type={config.type}
                    placeholder={config.placeholder}
                    value={formData[f.field] || ''}
                    onChange={(e) => handleChange(f.field, e.target.value)}
                  />
                )}
              </div>
            );
          })}

          <div className="pcm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              다음에 할게요
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '저장 중...' : '맞춤 학습 시작하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileCompletionModal;
