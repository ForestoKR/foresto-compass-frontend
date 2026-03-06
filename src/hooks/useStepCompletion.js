import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMyLatestDiagnosis, listPhase7Portfolios, getExplanationHistory } from '../services/api';

const CACHE_KEY = 'step_completion_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // quota exceeded — ignore
  }
}

/**
 * Tracks completion of the 4-step investment learning journey.
 * Step 1 (Market Exploration) — always complete (browsing).
 * Step 2 (Diagnosis) — complete if user has at least one diagnosis.
 * Step 3 (Portfolio) — complete if user has at least one Phase 7 portfolio.
 * Step 4 (Simulation) — complete if user has at least one AI explanation.
 */
export function useStepCompletion() {
  const { user } = useAuth();
  const [steps, setSteps] = useState({ 1: true, 2: false, 3: false, 4: false });
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [diagRes, portRes, explRes] = await Promise.allSettled([
        getMyLatestDiagnosis(),
        listPhase7Portfolios(),
        getExplanationHistory(0, 1),
      ]);

      const hasDiagnosis = diagRes.status === 'fulfilled' && diagRes.value?.data != null;
      const hasPortfolio =
        portRes.status === 'fulfilled' &&
        Array.isArray(portRes.value?.data) &&
        portRes.value.data.length > 0;
      const hasExplanation =
        explRes.status === 'fulfilled' &&
        Array.isArray(explRes.value?.data?.items) &&
        explRes.value.data.items.length > 0;

      const data = { 1: true, 2: hasDiagnosis, 3: hasPortfolio, 4: hasExplanation };
      setSteps(data);
      writeCache(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = readCache();
    if (cached) {
      setSteps(cached);
      return;
    }
    refresh();
  }, [user, refresh]);

  return { steps, loading, refresh };
}
