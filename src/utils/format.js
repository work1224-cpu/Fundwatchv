export function fmtCr(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  v = Number(v);
  if (Math.abs(v) >= 100000) return "₹" + (v / 100000).toFixed(2) + "L Cr";
  if (Math.abs(v) >= 1000) return "₹" + (v / 1000).toFixed(2) + "K Cr";
  return "₹" + v.toFixed(1) + " Cr";
}
export function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  v = Number(v);
  return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
}
export function fmtNum(v, d = 2) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return Number(v).toFixed(d);
}
export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function cls(...a) { return a.filter(Boolean).join(" "); }
export function getReturn(scheme, period) {
  return scheme?.returns?.find((r) => r.period === period)?.value ?? null;
}
export function getSipReturn(scheme, period) {
  return scheme?.sipReturns?.find((r) => r.period === period)?.value ?? null;
}