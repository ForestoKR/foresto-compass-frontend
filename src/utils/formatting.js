/**
 * 공통 포맷팅 유틸리티
 */

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('ko-KR').format(amount);

export const formatPercent = (value, decimals = 2, showSign = false) => {
  if (value === undefined || value === null) return '0.0%';
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(decimals)}%`;
};
