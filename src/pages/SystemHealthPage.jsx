import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSystemHealth, getApiPerformance } from '../services/api';
import '../styles/SystemHealth.css';

const STATUS_BADGE = {
  ok: { label: '정상', className: 'syshealth-badge-ok' },
  warning: { label: '주의', className: 'syshealth-badge-warning' },
  error: { label: '오류', className: 'syshealth-badge-error' },
  not_configured: { label: '미설정', className: 'syshealth-badge-muted' },
  healthy: { label: '정상', className: 'syshealth-badge-ok' },
  degraded: { label: '저하', className: 'syshealth-badge-warning' },
};

function Badge({ status }) {
  const info = STATUS_BADGE[status] || { label: status, className: 'syshealth-badge-muted' };
  return <span className={`syshealth-badge ${info.className}`}>{info.label}</span>;
}

export default function SystemHealthPage() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [apiPerf, setApiPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, perfRes] = await Promise.all([
        getSystemHealth(),
        getApiPerformance(),
      ]);
      setHealth(healthRes.data);
      setApiPerf(perfRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="main-content">
        <div className="result-container">
          <div className="result-card syshealth-loading">
            <p>시스템 상태를 확인하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="result-container">
          <div className="result-card syshealth-error-card">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchData}>다시 시도</button>
          </div>
        </div>
      </div>
    );
  }

  const checks = health?.checks || {};

  return (
    <div className="main-content">
      <div className="result-container">
        <div className="result-card" style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div className="result-header">
            <div className="result-icon" style={{ fontSize: '3rem' }}>
              {health?.status === 'healthy' ? '\u{2705}' : '\u{26A0}\u{FE0F}'}
            </div>
            <h1 className="result-type">
              시스템 모니터링
            </h1>
            <p className="result-subtitle">
              서버 상태, DB, 메모리, 스케줄러, API 성능
            </p>
            <div className="syshealth-header-actions">
              <Badge status={health?.status} />
              <span className="syshealth-timestamp">{health?.timestamp}</span>
              <label className="syshealth-toggle">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                />
                30s 자동 갱신
              </label>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                새로고침
              </button>
            </div>
          </div>

          {/* Health Check Cards */}
          <div className="syshealth-grid">
            {/* Database */}
            <div className="syshealth-card">
              <div className="syshealth-card-header">
                <h3>Database</h3>
                <Badge status={checks.database?.status} />
              </div>
              <div className="syshealth-card-body">
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Pool Size</span>
                  <span className="syshealth-stat-value">{checks.database?.pool_size}</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Checked Out</span>
                  <span className="syshealth-stat-value">{checks.database?.checked_out}</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Overflow</span>
                  <span className="syshealth-stat-value">{checks.database?.overflow}</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Max Connections</span>
                  <span className="syshealth-stat-value">{checks.database?.max_connections}</span>
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="syshealth-card">
              <div className="syshealth-card-header">
                <h3>Memory</h3>
                <Badge status={checks.memory?.status} />
              </div>
              <div className="syshealth-card-body">
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Process RSS</span>
                  <span className="syshealth-stat-value">{checks.memory?.process_rss_mb} MB</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Process VMS</span>
                  <span className="syshealth-stat-value">{checks.memory?.process_vms_mb} MB</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">System Usage</span>
                  <span className="syshealth-stat-value">{checks.memory?.system_percent}%</span>
                </div>
              </div>
            </div>

            {/* Scheduler */}
            <div className="syshealth-card">
              <div className="syshealth-card-header">
                <h3>Scheduler</h3>
                <Badge status={checks.scheduler?.is_running ? 'ok' : 'warning'} />
              </div>
              <div className="syshealth-card-body">
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Running</span>
                  <span className="syshealth-stat-value">{checks.scheduler?.is_running ? 'Yes' : 'No'}</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Jobs</span>
                  <span className="syshealth-stat-value">{checks.scheduler?.job_count}</span>
                </div>
              </div>
            </div>

            {/* Errors */}
            <div className="syshealth-card">
              <div className="syshealth-card-header">
                <h3>Errors</h3>
                <Badge status={checks.errors?.status} />
              </div>
              <div className="syshealth-card-body">
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">24h Errors</span>
                  <span className="syshealth-stat-value">{checks.errors?.last_24h}</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">7d Errors</span>
                  <span className="syshealth-stat-value">{checks.errors?.last_7d}</span>
                </div>
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">24h Critical</span>
                  <span className={`syshealth-stat-value ${checks.errors?.critical_24h > 0 ? 'syshealth-danger' : ''}`}>
                    {checks.errors?.critical_24h}
                  </span>
                </div>
              </div>
            </div>

            {/* Redis */}
            <div className="syshealth-card">
              <div className="syshealth-card-header">
                <h3>Redis</h3>
                <Badge status={checks.redis?.status} />
              </div>
              <div className="syshealth-card-body">
                <div className="syshealth-stat">
                  <span className="syshealth-stat-label">Configured</span>
                  <span className="syshealth-stat-value">{checks.redis?.configured ? 'Yes' : 'No'}</span>
                </div>
                {checks.redis?.error && (
                  <div className="syshealth-stat">
                    <span className="syshealth-stat-label">Error</span>
                    <span className="syshealth-stat-value syshealth-danger">{checks.redis.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scheduler Jobs Detail */}
          {checks.scheduler?.jobs?.length > 0 && (
            <div className="syshealth-section">
              <h2 className="syshealth-section-title">Scheduler Jobs</h2>
              <div className="syshealth-table-wrap">
                <table className="syshealth-table">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Next Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.scheduler.jobs.map((job) => (
                      <tr key={job.id}>
                        <td>{job.id}</td>
                        <td>{job.next_run || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* API Performance */}
          {apiPerf && apiPerf.endpoints?.length > 0 && (
            <div className="syshealth-section">
              <h2 className="syshealth-section-title">
                API Performance ({apiPerf.endpoint_count} endpoints)
              </h2>
              <div className="syshealth-table-wrap">
                <table className="syshealth-table">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Count</th>
                      <th>Mean</th>
                      <th>P50</th>
                      <th>P95</th>
                      <th>P99</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiPerf.endpoints.map((ep) => (
                      <tr key={ep.endpoint}>
                        <td className="syshealth-endpoint">{ep.endpoint}</td>
                        <td>{ep.count}</td>
                        <td>{ep.mean_ms} ms</td>
                        <td>{ep.p50_ms} ms</td>
                        <td className={ep.p95_ms > 1000 ? 'syshealth-danger' : ''}>
                          {ep.p95_ms} ms
                        </td>
                        <td className={ep.p99_ms > 2000 ? 'syshealth-danger' : ''}>
                          {ep.p99_ms} ms
                        </td>
                        <td>{ep.max_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="syshealth-nav">
            <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
              관리자 메뉴
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/scheduler')}>
              스케줄러 관리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
