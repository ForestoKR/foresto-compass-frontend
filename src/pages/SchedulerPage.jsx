import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSchedulerStatus,
  getCollectionLogs,
  getCollectionLogDetail,
  getCollectionSummary,
  triggerSchedulerJob,
} from '../services/api';
import '../styles/Scheduler.css';

const JOB_ICONS = {
  daily_incremental_prices: '📈',
  daily_compass_score: '🎯',
  weekly_stock_refresh: '🔄',
  weekly_dart_financials: '📋',
  monthly_financial_products: '💰',
  daily_market_email: '📧',
  watchlist_score_alerts: '🔔',
  b2b_usage_log_cleanup: '🧹',
  daily_index_prices: '📊',
};

const JOB_LABELS_KO = {
  daily_incremental_prices: '일별 시세 증분 적재',
  daily_compass_score: 'Foresto IQ 일괄 계산',
  weekly_stock_refresh: '주간 종목 마스터 갱신',
  weekly_dart_financials: 'DART 재무제표 적재',
  monthly_financial_products: '월간 금융상품 적재',
  daily_market_email: '일간 시장 요약 이메일',
  watchlist_score_alerts: '관심종목 점수 변동 알림',
  b2b_usage_log_cleanup: 'B2B 사용량 로그 정리',
  daily_index_prices: '일별 지수 시세 적재',
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MAP = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };

function formatCron(trigger) {
  if (!trigger) return '-';
  // cron[day_of_week='mon-fri', hour='16', minute='30'] 파싱
  const params = {};
  const matches = trigger.matchAll(/(\w+)='([^']+)'/g);
  for (const m of matches) {
    params[m[1]] = m[2];
  }

  const hour = params.hour ? `${params.hour}시` : '';
  const minute = params.minute && params.minute !== '0' ? ` ${params.minute}분` : '';
  const time = `${hour}${minute}`;

  if (params.day_of_week) {
    const dow = params.day_of_week;
    if (dow === 'mon-fri') return `평일 ${time}`;
    if (dow === 'sat-sun') return `주말 ${time}`;
    const dayKo = dow.split(',').map((d) => DAY_MAP[d.trim()] || d).join('/');
    return `매주 ${dayKo}요일 ${time}`;
  }
  if (params.day) {
    return `매월 ${params.day}일 ${time}`;
  }
  return `매일 ${time}`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}초`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
}

function formatTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatNextRun(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES[d.getDay()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 (${dow}) ${hours}:${minutes}`;
}

function formatDateOnly(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES[d.getDay()];
  return `${month}/${day} (${dow})`;
}

export default function SchedulerPage() {
  const navigate = useNavigate();
  const [schedulerData, setSchedulerData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [triggeringJob, setTriggeringJob] = useState(null);
  const [logDetail, setLogDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, logsRes, summaryRes] = await Promise.all([
        getSchedulerStatus(),
        getCollectionLogs({ limit: 20 }),
        getCollectionSummary(),
      ]);
      setSchedulerData(statusRes.data.data);
      setLogs(logsRes.data.data?.items || []);
      setSummary(summaryRes.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch scheduler data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-polling when any job is running
  useEffect(() => {
    const hasRunning = schedulerData?.jobs?.some((j) => j.is_running);
    if (hasRunning) {
      pollingRef.current = setInterval(fetchData, 5000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [schedulerData, fetchData]);

  const handleTrigger = async (jobId) => {
    if (triggeringJob) return;
    setTriggeringJob(jobId);
    try {
      await triggerSchedulerJob(jobId, { force: true });
      // Refresh after short delay to let the task start
      setTimeout(fetchData, 1000);
    } catch (err) {
      const detail = err.response?.data?.detail || '실행에 실패했습니다.';
      alert(detail);
    } finally {
      setTriggeringJob(null);
    }
  };

  const handleLogClick = async (logId) => {
    try {
      const res = await getCollectionLogDetail(logId);
      setLogDetail(res.data.data);
    } catch {
      alert('상세 정보를 불러오는데 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="result-container">
          <div className="result-card" style={{ maxWidth: '1100px' }}>
            <div className="sc-loading">
              <div className="spinner" />
              <p>스케줄러 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="result-container">
        <div className="result-card" style={{ maxWidth: '1100px' }}>
          {/* Header */}
          <div className="sc-header-bar">
            <div className="sc-header-left">
              <button className="sc-back-btn" onClick={() => navigate('/admin')}>
                ← 관리자 홈
              </button>
              <h2 style={{ margin: 0, color: 'var(--text)' }}>🗓️ 스케줄 관리</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="sc-refresh-btn"
                onClick={fetchData}
                disabled={loading}
              >
                🔄 새로고침
              </button>
              {schedulerData && (
                <span
                  className={`sc-scheduler-badge ${schedulerData.scheduler_active ? 'active' : 'inactive'}`}
                >
                  {schedulerData.scheduler_active ? '✅ 활성화' : '⛔ 비활성'}
                </span>
              )}
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 20px' }}>
            데이터 수집 스케줄 관리 및 수동 실행
          </p>

          {error && (
            <div style={{ color: 'var(--stock-down, #dc2626)', marginBottom: '16px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {/* 30-day Summary */}
          {summary?.overall && (
            <div className="sc-summary-grid">
              <div className="sc-summary-card">
                <span className="sc-summary-label">30일 실행</span>
                <span className="sc-summary-value sc-summary-info">
                  {summary.overall.total_runs_30d || 0}회
                </span>
              </div>
              <div className="sc-summary-card">
                <span className="sc-summary-label">성공률</span>
                <span className="sc-summary-value sc-summary-success">
                  {summary.overall.success_rate_30d != null
                    ? `${summary.overall.success_rate_30d}%`
                    : '-'}
                </span>
              </div>
              <div className="sc-summary-card">
                <span className="sc-summary-label">7일 실패</span>
                <span className={`sc-summary-value ${(summary.overall.recent_failures_7d || 0) > 0 ? 'sc-summary-danger' : 'sc-summary-success'}`}>
                  {summary.overall.recent_failures_7d || 0}건
                </span>
              </div>
            </div>
          )}

          {/* Job Cards Grid */}
          {schedulerData?.jobs && (
            <div className="sc-jobs-grid">
              {schedulerData.jobs.map((job) => (
                <JobCard
                  key={job.scheduler_id}
                  job={job}
                  triggering={triggeringJob === job.scheduler_id}
                  onTrigger={handleTrigger}
                />
              ))}
            </div>
          )}

          {/* Collection Logs */}
          <div className="sc-section">
            <div className="sc-section-header">
              <span className="sc-section-title">📜 최근 실행 이력</span>
              <button className="sc-refresh-btn" onClick={fetchData}>
                🔄 새로고침
              </button>
            </div>
            <LogTable logs={logs} onRowClick={handleLogClick} />
          </div>

          {/* Log Detail Modal */}
          {logDetail && (
            <LogDetailModal detail={logDetail} onClose={() => setLogDetail(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, triggering, onTrigger }) {
  const icon = JOB_ICONS[job.scheduler_id] || '📦';
  const isRunning = job.is_running;
  const canTrigger = job.scheduler_id !== 'b2b_usage_log_cleanup';
  const lastRun = job.last_run;

  return (
    <div className={`sc-job-card ${isRunning ? 'running' : ''}`}>
      <div className="sc-job-card-header">
        <div className="sc-job-card-title">
          <span className="sc-job-card-icon">{icon}</span>
          <span className="sc-job-card-name">{JOB_LABELS_KO[job.scheduler_id] || job.job_label}</span>
        </div>
        <span className={`sc-status-badge ${isRunning ? 'sc-status-running' : 'sc-status-idle'}`}>
          {isRunning ? '실행 중' : '대기'}
        </span>
      </div>

      <div className="sc-job-info">
        {job.trigger && (
          <div className="sc-job-info-row">
            <span className="sc-job-info-label">스케줄</span>
            <span className="sc-job-info-value">{formatCron(job.trigger)}</span>
          </div>
        )}
        {job.next_run_time && (
          <div className="sc-job-info-row">
            <span className="sc-job-info-label">다음</span>
            <span className="sc-job-info-value">
              {job.holiday_info ? (
                <>
                  <span className="sc-next-run-strike">{formatNextRun(job.next_run_time)}</span>
                  <span className="sc-holiday-badge">{job.holiday_info.holiday_name} · 스킵</span>
                </>
              ) : (
                formatNextRun(job.next_run_time)
              )}
            </span>
          </div>
        )}
        {job.holiday_info?.actual_next_trading_day && (
          <div className="sc-job-info-row">
            <span className="sc-job-info-label">실행</span>
            <span className="sc-job-info-value sc-actual-next">
              {formatDateOnly(job.holiday_info.actual_next_trading_day)}
            </span>
          </div>
        )}
      </div>

      {lastRun && (
        <div className="sc-last-run">
          <div className="sc-last-run-header">
            <span className="sc-last-run-label">마지막 실행</span>
            <span className={`sc-status-badge sc-status-${lastRun.status}`}>
              {lastRun.status === 'completed' ? '성공' : lastRun.status === 'failed' ? '실패' : lastRun.status}
            </span>
          </div>
          <div className="sc-last-run-detail">
            {formatTime(lastRun.created_at)}
            {lastRun.duration_seconds != null && ` · ${formatDuration(lastRun.duration_seconds)}`}
            {lastRun.success_count != null && ` · 성공 ${lastRun.success_count}`}
            {lastRun.fail_count > 0 && ` / 실패 ${lastRun.fail_count}`}
            {lastRun.validation_status && (
              <span className={`sc-validation-badge sc-validation-${lastRun.validation_status.toLowerCase()}`}>
                {lastRun.validation_status}
              </span>
            )}
          </div>
        </div>
      )}

      {!lastRun && (
        <div className="sc-last-run">
          <span className="sc-last-run-label">실행 이력 없음</span>
        </div>
      )}

      {canTrigger && (
        <button
          className="sc-trigger-btn"
          disabled={isRunning || triggering}
          onClick={() => onTrigger(job.scheduler_id)}
        >
          {triggering ? (
            <>
              <span className="sc-trigger-spinner" />
              실행 요청 중...
            </>
          ) : isRunning ? (
            '실행 중...'
          ) : (
            '즉시 실행'
          )}
        </button>
      )}
    </div>
  );
}

function LogTable({ logs, onRowClick }) {
  if (!logs || logs.length === 0) {
    return <div className="sc-empty">실행 이력이 없습니다.</div>;
  }

  return (
    <div className="sc-log-table-wrap">
      <table className="sc-log-table">
        <thead>
          <tr>
            <th>작업명</th>
            <th>상태</th>
            <th>시작</th>
            <th>소요</th>
            <th>성공/실패</th>
            <th>검증</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="sc-log-row"
              onClick={() => onRowClick(log.id)}
            >
              <td>{log.job_label || log.job_name}</td>
              <td>
                <span className={`sc-status-badge sc-status-${log.status}`}>
                  {log.status === 'completed' ? '성공' : log.status === 'failed' ? '실패' : log.status === 'running' ? '실행 중' : log.status}
                </span>
              </td>
              <td className="sc-log-time">{formatTime(log.created_at)}</td>
              <td>{formatDuration(log.duration_seconds)}</td>
              <td>
                {log.success_count ?? '-'} / {log.fail_count ?? '-'}
              </td>
              <td>
                {log.validation_status ? (
                  <span className={`sc-validation-badge sc-validation-${log.validation_status.toLowerCase()}`}>
                    {log.validation_status}
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogDetailModal({ detail, onClose }) {
  return (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <span className="sc-modal-title">
            {detail.job_label || detail.job_name} 실행 상세
          </span>
          <button className="sc-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sc-modal-grid">
          <div>
            <span className="sc-modal-label">상태</span>
            <span className="sc-modal-value">
              <span className={`sc-status-badge sc-status-${detail.status}`}>
                {detail.status === 'completed' ? '성공' : detail.status === 'failed' ? '실패' : detail.status}
              </span>
            </span>
          </div>
          <div>
            <span className="sc-modal-label">시작 시간</span>
            <span className="sc-modal-value">{formatTime(detail.created_at)}</span>
          </div>
          <div>
            <span className="sc-modal-label">소요 시간</span>
            <span className="sc-modal-value">{formatDuration(detail.duration_seconds)}</span>
          </div>
          <div>
            <span className="sc-modal-label">성공 / 실패</span>
            <span className="sc-modal-value">
              {detail.success_count ?? '-'} / {detail.fail_count ?? '-'}
            </span>
          </div>
          {detail.validation_status && (
            <div>
              <span className="sc-modal-label">검증</span>
              <span className="sc-modal-value">
                <span className={`sc-validation-badge sc-validation-${detail.validation_status.toLowerCase()}`}>
                  {detail.validation_status}
                </span>
              </span>
            </div>
          )}
          {detail.retry_count > 0 && (
            <div>
              <span className="sc-modal-label">재시도</span>
              <span className="sc-modal-value">{detail.retry_count}회</span>
            </div>
          )}
        </div>

        {detail.validation_detail && (
          <div style={{ marginBottom: '12px' }}>
            <span className="sc-modal-label">검증 상세</span>
            <pre className="sc-modal-pre">
              {typeof detail.validation_detail === 'string'
                ? detail.validation_detail
                : JSON.stringify(detail.validation_detail, null, 2)}
            </pre>
          </div>
        )}

        {detail.error_message && (
          <div style={{ marginBottom: '12px' }}>
            <span className="sc-modal-label">에러 메시지</span>
            <pre className="sc-modal-pre">{detail.error_message}</pre>
          </div>
        )}

        {detail.error_traceback && (
          <div>
            <span className="sc-modal-label">트레이스백</span>
            <pre className="sc-modal-pre">{detail.error_traceback}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
