export function fmtNumber(value: number, decimals = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function fmtPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${fmtNumber(value)}%`;
}

export function fmtDelta(value: number, unit = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${fmtNumber(value)}${unit}`;
}

export function fmtHours(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function fmtScore(value: number): string {
  return Math.round(value).toString();
}

export function fmtVariation(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${fmtNumber(Math.abs(value))}%`;
}
