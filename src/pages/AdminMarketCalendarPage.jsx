import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMarketHolidays,
  createMarketHoliday,
  deleteMarketHoliday,
  checkTradingDay,
} from '../services/api';
import '../styles/AdminMarketCalendar.css';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function AdminMarketCalendarPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(2026);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ holiday_date: '', holiday_name: '', holiday_type: 'PUBLIC' });
  const [addLoading, setAddLoading] = useState(false);

  // 거래일 확인
  const [checkDate, setCheckDate] = useState(getToday);
  const [checkResult, setCheckResult] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);

  // 페이지 로드 시 오늘 거래일 여부 자동 확인
  useEffect(() => {
    const fetchTodayCheck = async () => {
      setCheckLoading(true);
      try {
        const response = await checkTradingDay(getToday());
        setCheckResult(response.data.data);
      } catch {
        // 자동 조회 실패는 무시
      } finally {
        setCheckLoading(false);
      }
    };
    fetchTodayCheck();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getMarketHolidays(year);
      setHolidays(response.data.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || '휴장일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.holiday_date || !addForm.holiday_name) return;
    setAddLoading(true);
    try {
      await createMarketHoliday(addForm);
      showSuccess('휴장일이 추가되었습니다.');
      setShowAddModal(false);
      setAddForm({ holiday_date: '', holiday_name: '', holiday_type: 'PUBLIC' });
      await fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.detail || '휴장일 추가에 실패했습니다.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id, holidayName) => {
    if (!window.confirm(`"${holidayName}" 휴장일을 삭제하시겠습니까?`)) return;
    try {
      await deleteMarketHoliday(id);
      showSuccess('휴장일이 삭제되었습니다.');
      await fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.detail || '휴장일 삭제에 실패했습니다.');
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!checkDate) return;
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const response = await checkTradingDay(checkDate);
      setCheckResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || '거래일 확인에 실패했습니다.');
    } finally {
      setCheckLoading(false);
    }
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return DAYS_KO[d.getDay()];
  };

  const publicCount = holidays.filter((h) => h.holiday_type === 'PUBLIC').length;
  const krxCount = holidays.filter((h) => h.holiday_type === 'KRX_SPECIAL').length;

  return (
    <div className="amc-container">
      <div className="amc-card">
        <button className="admin-back-btn" onClick={() => navigate('/admin')}>
          &larr; 관리자 홈
        </button>

        <div className="amc-header">
          <h1>휴장일 관리</h1>
          <p>한국 주식시장 휴장일을 조회, 추가, 삭제할 수 있습니다.</p>
        </div>

        {/* 거래일 확인 섹션 */}
        <div className="amc-check-section amc-check-top">
          <h2>거래일 확인</h2>
          <form className="amc-check-form" onSubmit={handleCheck}>
            <input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={checkLoading}>
              {checkLoading ? '확인 중...' : '확인'}
            </button>
          </form>
          {checkResult && (
            <div className={`amc-check-result ${checkResult.is_trading_day ? 'amc-trading' : 'amc-non-trading'}`}>
              <strong>{checkResult.date}</strong>
              {' '}({checkResult.day_of_week})
              {' — '}
              {checkResult.is_trading_day ? (
                <span>거래일입니다</span>
              ) : (
                <span>
                  비거래일
                  {checkResult.is_weekend && checkResult.is_holiday
                    ? ' (주말 + 휴장일)'
                    : checkResult.is_weekend ? ' (주말)' : ' (휴장일)'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 연도 선택 + 추가 버튼 */}
        <div className="amc-toolbar">
          <div className="amc-year-select">
            <label htmlFor="amc-year">연도</label>
            <select
              id="amc-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + 휴장일 추가
          </button>
        </div>

        {/* 알림 */}
        {error && <div className="amc-alert amc-alert-error">{error}</div>}
        {successMessage && <div className="amc-alert amc-alert-success">{successMessage}</div>}

        {/* 통계 카드 */}
        <div className="amc-stats">
          <div className="amc-stat-card">
            <h3>전체 휴장일</h3>
            <p className="amc-stat-value">{holidays.length}건</p>
          </div>
          <div className="amc-stat-card">
            <h3>공휴일 (PUBLIC)</h3>
            <p className="amc-stat-value">{publicCount}건</p>
          </div>
          <div className="amc-stat-card">
            <h3>KRX 특별 휴장</h3>
            <p className="amc-stat-value">{krxCount}건</p>
          </div>
        </div>

        {/* 휴장일 목록 */}
        {loading && <div className="amc-loading">불러오는 중...</div>}
        {!loading && holidays.length === 0 && !error && (
          <div className="amc-empty">{year}년 등록된 휴장일이 없습니다.</div>
        )}
        {!loading && holidays.length > 0 && (
          <div className="amc-table-wrap">
            <table className="amc-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>요일</th>
                  <th>이름</th>
                  <th>유형</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id}>
                    <td>{h.holiday_date}</td>
                    <td>{getDayName(h.holiday_date)}</td>
                    <td>{h.holiday_name}</td>
                    <td>
                      <span className={`amc-type-badge amc-type-${h.holiday_type?.toLowerCase()}`}>
                        {h.holiday_type === 'PUBLIC' ? '공휴일' : 'KRX 특별'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="amc-btn-delete"
                        onClick={() => handleDelete(h.id, h.holiday_name)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="amc-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="amc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="amc-modal-header">
              <h2>휴장일 추가</h2>
              <button className="amc-modal-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <form className="amc-modal-body" onSubmit={handleAdd}>
              <div className="amc-form-field">
                <label>날짜</label>
                <input
                  type="date"
                  required
                  value={addForm.holiday_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, holiday_date: e.target.value }))}
                />
              </div>
              <div className="amc-form-field">
                <label>이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 설날"
                  value={addForm.holiday_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, holiday_name: e.target.value }))}
                />
              </div>
              <div className="amc-form-field">
                <label>유형</label>
                <select
                  value={addForm.holiday_type}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, holiday_type: e.target.value }))}
                >
                  <option value="PUBLIC">공휴일 (PUBLIC)</option>
                  <option value="KRX_SPECIAL">KRX 특별 (KRX_SPECIAL)</option>
                </select>
              </div>
              <div className="amc-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMarketCalendarPage;
