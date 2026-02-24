import { useEffect, useRef, useState } from 'react';
import * as api from '../services/api';
import '../styles/ProgressModal.css';

const PIPELINE_STEPS = [
  { name: 'FDR 종목 마스터', group: 'Step 1' },
  { name: '주식 데이터 수집', group: 'Step 2' },
  { name: 'ETF 데이터 수집', group: 'Step 2' },
  { name: '시계열 증분 적재', group: 'Step 3' },
  { name: '배당이력 전체종목', group: 'Step 4' },
  { name: '기업액션 5년', group: 'Step 4' },
  { name: '채권 전체', group: 'Step 4' },
  { name: '재무제표 FY2021', group: 'Step 5' },
  { name: '재무제표 FY2022', group: 'Step 5' },
  { name: '재무제표 FY2023', group: 'Step 5' },
  { name: '재무제표 FY2024', group: 'Step 5' },
  { name: '재무제표 FY2025', group: 'Step 5' },
  { name: '금융상품 6종', group: 'Step 6' },
];

function ProgressModal({ taskId, onComplete, onClose }) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [, setLogs] = useState([]);
  const lastHistoryLenRef = useRef(0);

  const getEstimatedTime = (tid) => {
    if (!tid) return '약 2-3분';
    if (tid.startsWith('pipeline_')) return '약 60-90분';
    if (tid.startsWith('incremental_')) return '약 30-40분';
    if (tid.startsWith('dart_fin_')) return '약 5-10분';
    if (tid.startsWith('compass_')) return '약 20-30분';
    if (tid.startsWith('stocks_') || tid.startsWith('fdr_')) return '약 3-5분';
    if (tid.startsWith('etf_')) return '약 1-2분';
    if (tid.startsWith('dividends_')) return '약 3-5분';
    if (tid.startsWith('corp_action_')) return '약 10-30초';
    if (tid.startsWith('bonds_')) return '약 3-5분';
    if (tid.startsWith('deposits_') || tid.startsWith('savings_')) return '약 1-2분';
    if (tid.startsWith('annuity_') || tid.startsWith('mortgage_') || tid.startsWith('rentloan_') || tid.startsWith('creditloan_')) return '약 1-2분';
    return '약 2-3분';
  };

  const formatLogTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(timestamp);
    const isoTimestamp = hasTimezone ? timestamp : `${timestamp}Z`;
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  };

  useEffect(() => {
    if (!taskId) return;

    setProgress(null);
    setError(null);
    setLogs([]);
    lastHistoryLenRef.current = 0;

    // 임시 task_id인지 확인
    const isTempTask = taskId.startsWith('temp_');
    let notFoundCount = 0; // 404 에러 카운트

    // 진행 상황을 1초마다 폴링
    const interval = setInterval(async () => {
      // 임시 task_id면 실제 데이터를 기다림
      if (isTempTask) {
        return;
      }

      try {
        const response = await api.getProgress(taskId);
        const data = response.data;
        notFoundCount = 0; // 성공하면 카운트 초기화

        // 디버깅 로깅
        console.log('[ProgressModal] API Response:', {
          taskId,
          status: data.status,
          current: data.current,
          total: data.total,
          success_count: data.success_count,
          phase: data.phase,
          current_item: data.current_item
        });

        setProgress(data);

        // items_history를 사용하여 로그 업데이트
        if (data.items_history && data.items_history.length > lastHistoryLenRef.current) {
          const newItems = data.items_history.slice(lastHistoryLenRef.current);
          lastHistoryLenRef.current = data.items_history.length;
          const newLogs = newItems.map((item) => {
            const timestamp = formatLogTimestamp(item.timestamp);
            const status = item.success ? '✅' : '❌';
            return {
              id: `${item.index}-${item.timestamp}`,
              text: `[${timestamp}] ${status} ${item.item}`,
              timestamp: item.timestamp
            };
          });

          setLogs(prev => [...prev, ...newLogs].slice(-50));
        }

        // 완료되면 폴링 중지
        if (data.status === 'completed' || data.status === 'failed') {
          console.log('[ProgressModal] Task completed with status:', data.status);
          clearInterval(interval);
          if (onComplete) {
            onComplete(data);
          }
          // 자동 종료 제거 - 사용자가 버튼 클릭할 때까지 대기
        }
      } catch (err) {
        if (err.response?.status === 404) {
          // 404가 3회 연속 발생하면 폴링 중지 (작업이 완료되고 정리됨)
          notFoundCount++;
          if (notFoundCount >= 3) {
            clearInterval(interval);
            // 진행 상황 모달 자동 종료
            if (onClose) {
              onClose();
            }
          }
        } else {
          setError('진행 상황을 가져올 수 없습니다');
        }
      }
    }, 1000);

    // 컴포넌트 언마운트 시 정리
    return () => {
      clearInterval(interval);
    };
  }, [taskId, onComplete, onClose]);

  // Esc 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!progress) {
    return (
      <div className="modal-overlay">
        <div className="progress-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title-loading">
          <div className="modal-header">
            <h3 id="pm-title-loading">📊 데이터 적재</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="progress-section" aria-live="polite">
              <div className="loading-spinner">
                <div className="spinner-animation"></div>
              </div>
              <h3 style={{ marginTop: '20px', textAlign: 'center' }}>⏳ Phase 1: 데이터 수집 중</h3>
              <p style={{ marginTop: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                FSC API를 통해 주식 정보를 병렬로 수집 중입니다...
              </p>
              <p style={{ marginTop: '5px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ({getEstimatedTime(taskId)} 소요)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const isComplete = progress.status === 'completed' || progress.status === 'failed';

  // 파이프라인 작업 여부
  const isPipeline = taskId && taskId.startsWith('pipeline_');

  // 단일 Phase 작업 - Phase 배지 숨김 (채권/예금/적금/연금저축/주담대/전세대출/DART재무제표/파이프라인)
  const isBondTask = taskId && (taskId.startsWith('bonds_') || taskId.startsWith('deposits_') || taskId.startsWith('savings_') || taskId.startsWith('annuity_') || taskId.startsWith('mortgage_') || taskId.startsWith('rentloan_') || taskId.startsWith('creditloan_') || taskId.startsWith('dart_fin_') || taskId.startsWith('corp_action_') || isPipeline);

  // Phase 판별: backend의 phase 필드 사용, 없으면 current_item 기반으로 판단
  const currentPhase = progress.phase ||
    (progress.current_item && progress.current_item.includes('[Phase 1]') ? 'Phase 1' : 'Phase 2');
  const isPhase1 = !isBondTask && progress.status === 'running' && currentPhase === 'Phase 1';

  // Phase 1 상태 표시
  if (isPhase1) {
    return (
      <div className="modal-overlay">
        <div className="progress-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title-phase1">
          <div className="modal-header">
            <h3 id="pm-title-phase1">📊 {progress.description}</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="progress-section" aria-live="polite">
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ backgroundColor: '#4CAF50', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  Phase 1
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>데이터 수집</span>
              </div>
              <div className="loading-spinner">
                <div className="spinner-animation"></div>
              </div>
              <h3 style={{ marginTop: '20px', textAlign: 'center' }}>⏳ 진행 중...</h3>
              <p style={{ marginTop: '15px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {progress.current_item || 'FSC API를 통해 주식 정보를 병렬로 수집 중...'}
              </p>
              <p style={{ marginTop: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                이 단계는 {getEstimatedTime(taskId)}이 소요됩니다
              </p>
              <p style={{ marginTop: '5px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                완료 후 Phase 2에서 데이터베이스에 저장됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="progress-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title-main">
        <div className="modal-header">
          <h3 id="pm-title-main">📊 {progress.description}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Progress Bar */}
          <div className="progress-section" aria-live="polite">
            <div className="progress-stats">
              <span className="stats-text">
                {progress.current} / {progress.total} 완료
              </span>
              <span className="stats-percent">{percentage}%</span>
            </div>
            <div className="progress-bar-wrapper">
              <div
                className="progress-bar-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {/* Phase Badge - 채권은 단일 단계이므로 숨김 */}
            {!isBondTask && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px', marginBottom: '10px' }}>
                <span style={{
                  backgroundColor: currentPhase === 'Phase 1' ? '#4CAF50' : 'var(--border)',
                  color: currentPhase === 'Phase 1' ? 'white' : 'var(--text-secondary)',
                  padding: '5px 15px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  Phase 1: 수집
                </span>
                <span style={{
                  backgroundColor: currentPhase === 'Phase 2' ? '#2196F3' : 'var(--border)',
                  color: currentPhase === 'Phase 2' ? 'white' : 'var(--text-secondary)',
                  padding: '5px 15px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  Phase 2: 저장
                </span>
              </div>
            )}

            <div className="progress-details">
              <span className="detail-item success">
                ✅ 성공: {progress.success_count}
              </span>
              <span className="detail-item failed">
                ❌ 실패: {progress.failed_count}
              </span>
              <span className={`detail-item status ${progress.status}`}>
                {progress.status === 'completed' ? '✔️ 완료' :
                 progress.status === 'failed' ? '⚠️ 실패' :
                 `⏳ 진행 중`}
              </span>
            </div>
            {progress.status === 'running' && (
              <p style={{ marginTop: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                예상 소요시간: {getEstimatedTime(taskId)}
              </p>
            )}
          </div>

          {/* Pipeline Step List */}
          {isPipeline && (
            <div className="pm-pipeline-steps">
              {PIPELINE_STEPS.map((step, idx) => {
                const historyEntry = progress.items_history?.[idx];
                let status = 'pending';
                if (historyEntry) {
                  status = historyEntry.success ? 'done' : 'fail';
                } else if (idx === (progress.items_history?.length || 0) && progress.status === 'running') {
                  status = 'running';
                }
                const showGroup = idx === 0 || PIPELINE_STEPS[idx - 1].group !== step.group;
                return (
                  <div key={idx}>
                    {showGroup && (
                      <div className="pm-pipeline-group">{step.group}</div>
                    )}
                    <div className={`pm-pipeline-step pm-pipeline-step--${status}`}>
                      <span className="pm-pipeline-icon">
                        {status === 'done' ? '✅' : status === 'fail' ? '❌' : status === 'running' ? '⏳' : '⬜'}
                      </span>
                      <span className="pm-pipeline-name">{step.name}</span>
                      {historyEntry && (
                        <span className="pm-pipeline-info">
                          {historyEntry.item?.match(/\(([^)]+)\)$/)?.[1] || ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}

          {progress.error_message && (
            <div className="error-banner" role="alert">
              ⚠️ {progress.error_message}
            </div>
          )}

          {/* Completion Status */}
          {isComplete && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: progress.status === 'completed' ? '#E8F5E9' : '#FFEBEE', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 'bold', color: progress.status === 'completed' ? '#2E7D32' : '#C62828' }}>
                {progress.status === 'completed' ? '✅ 데이터 적재 완료!' : '⚠️ 작업이 실패했습니다'}
              </p>
              <p style={{ margin: '0', color: progress.status === 'completed' ? '#558B2F' : '#B71C1C', fontSize: '0.9rem' }}>
                총 {progress.success_count + progress.failed_count}건 중 {progress.success_count}건 성공
              </p>
            </div>
          )}

          {/* Close Button for Completed */}
          {isComplete && (
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '15px' }}>
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProgressModal;
