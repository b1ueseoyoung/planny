const won = new Intl.NumberFormat("ko-KR");

/** 49000 → "49,000원" */
export function formatWon(amount: number): string {
  return `${won.format(Math.round(amount))}원`;
}

/** 58000 → "+58,000원", -220000 → "-220,000원" */
export function formatSignedWon(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatWon(Math.abs(amount))}`;
}

/** 캘린더 칸처럼 좁은 곳용: 49000 → "4.9만", 1200000 → "120만", 8500 → "8,500" */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10_000) {
    const man = abs / 10_000;
    const text = man >= 100 ? String(Math.round(man)) : String(Math.round(man * 10) / 10);
    return `${sign}${text}만`;
  }
  return `${sign}${won.format(Math.round(abs))}`;
}
