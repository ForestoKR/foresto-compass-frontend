/**
 * Chart.js shared utilities
 * BacktestPage, ScenarioSimulationPage common chart logic
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { formatCurrency } from './formatting';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export { Line } from 'react-chartjs-2';

/**
 * Downsample daily values (7-day chunk average when exceeding threshold)
 * @param {Array<{date: string, value: number}>} dailyValues
 * @param {number} threshold
 * @returns {Array<{date: string, value: number}>}
 */
export const downsampleData = (dailyValues, threshold = 365) => {
  if (!dailyValues || dailyValues.length <= threshold) return dailyValues;
  const sampled = [];
  for (let i = 0; i < dailyValues.length; i += 7) {
    const chunk = dailyValues.slice(i, i + 7);
    const avgValue = chunk.reduce((sum, d) => sum + d.value, 0) / chunk.length;
    sampled.push({ date: chunk[Math.floor(chunk.length / 2)].date, value: avgValue });
  }
  return sampled;
};

/**
 * Calculate drawdown percentages from peak
 * @param {Array<{value: number}>} dailyValues
 * @returns {number[]}
 */
export const calculateDrawdowns = (dailyValues) => {
  let peak = dailyValues[0]?.value ?? 0;
  return dailyValues.map(d => {
    if (d.value > peak) peak = d.value;
    return peak > 0 ? ((d.value - peak) / peak) * 100 : 0;
  });
};

/**
 * Build Chart.js options
 * @param {string} titleText
 * @param {'currency'|'percent'} yFormat
 * @param {Object} opts
 * @param {boolean} opts.showLegend
 * @returns {Object}
 */
export const buildChartOptions = (titleText, yFormat, opts = {}) => {
  const style = getComputedStyle(document.documentElement);
  const textColor = style.getPropertyValue('--text-secondary').trim() || '#6b7280';
  const gridColor = style.getPropertyValue('--border').trim() || '#e5e7eb';
  const showLegend = opts.showLegend ?? false;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: showLegend, labels: { color: textColor, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => yFormat === 'currency'
            ? `${ctx.dataset.label}: ${formatCurrency(Math.round(ctx.parsed.y))}원`
            : `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, maxTicksLimit: 8, maxRotation: 0, font: { size: 11 } },
        grid: { color: gridColor + '40' },
      },
      y: {
        ticks: {
          color: textColor,
          font: { size: 11 },
          callback: (v) => yFormat === 'currency' ? formatCurrency(v) : `${v.toFixed(1)}%`,
        },
        grid: { color: gridColor + '40' },
      },
    },
  };
};

/**
 * Build drawdown chart data
 * @param {Array<{date: string, value: number}>} dailyValues - already downsampled
 * @returns {Object} Chart.js data
 */
export const buildDrawdownChartData = (dailyValues) => {
  const drawdowns = calculateDrawdowns(dailyValues);
  return {
    labels: dailyValues.map(d => d.date.slice(0, 10)),
    datasets: [{
      label: 'Drawdown (%)',
      data: drawdowns,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    }],
  };
};
