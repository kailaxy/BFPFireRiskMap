export function formatCoord(value, options = {}) {
  const { decimals = 3, mode = 'round' } = options;
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (mode === 'trunc') {
    const factor = Math.pow(10, decimals);
    return String(Math.trunc(n * factor) / factor.toFixed ? (Math.trunc(n * factor) / factor).toFixed(decimals) : (Math.trunc(n * factor) / factor));
  }
  // default: round
  return n.toFixed(decimals);
}

export default { formatCoord };
