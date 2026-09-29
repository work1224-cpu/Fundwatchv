import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts";
import { ArrowLeft, Star, FileBarChart2 } from "lucide-react";
import api from "../api/axios";
import { GlassCard, Spinner, ErrorBanner } from "../components/UIPrimitives";
import ChartTooltip from "../components/ChartTooltip";
import { fmtCr, fmtNum, fmtDate } from "../utils/format";

const CHART_COLORS = ["#F2B84B", "#5AA9FF", "#22C55E", "#F0475C", "#B285F0", "#4FD1C5"];
const PERIOD_ORDER = ["1D", "7D", "1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "10Y", "SI"];

export default function SchemeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const schemeQuery = useQuery({ queryKey: ["scheme", id], queryFn: () => api.get(`/schemes/${id}`).then((r) => r.data) });
  const historyQuery = useQuery({ queryKey: ["scheme-history", id], queryFn: () => api.get(`/schemes/${id}/history`).then((r) => r.data) });
  const watchlistQuery = useQuery({ queryKey: ["watchlist"], queryFn: () => api.get("/watchlist").then((r) => r.data) });

  const toggleWatch = async () => {
    await api.post("/watchlist/toggle", { schemeId: Number(id) });
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  };

  const downloadReport = async () => {
    const res = await api.get(`/schemes/${id}/report`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url; a.download = (schemeQuery.data?.name || "fund-report").replace(/[^a-z0-9]+/gi, "_") + ".xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  if (schemeQuery.isLoading) return <Spinner label="Loading scheme…" />;
  if (schemeQuery.isError) return <ErrorBanner message="Scheme not found." />;

  const s = schemeQuery.data;
  const isWatched = (watchlistQuery.data || []).some((w) => w.schemeId === Number(id));

  const returnsData = PERIOD_ORDER.map((p) => ({ period: p, val: s.returns.find((r) => r.period === p)?.value }))
    .filter((d) => d.val != null);

  const SIP_PERIOD_ORDER = ["1Y", "3Y", "5Y", "7Y", "10Y"];
  const sipReturnsData = SIP_PERIOD_ORDER.map((p) => ({ period: p, val: s.sipReturns?.find((r) => r.period === p)?.value }))
    .filter((d) => d.val != null);

  const mcData = (s.marketCapAllocations || []).map((m) => ({ name: m.capType, value: Number(m.percentage) })).filter((d) => d.value);
  const sectorData = (s.sectorAllocations || []).map((sec) => ({ name: sec.sectorName, value: Number(sec.percentage) })).filter((d) => d.value != null);
  const trendData = (historyQuery.data || []).map((h) => ({ date: h.snapshotDate, nav: Number(h.nav) }));

  const risk = {};
  (s.riskMeasures || []).forEach((r) => { risk[r.metric] = Number(r.value); });

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-dim)" }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>{s.Category?.name} · {s.AMC?.name}</div>
          <h1 className="mf-display text-xl font-bold leading-snug">{s.name}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={downloadReport} title="Download fund report"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--gold)" }}>
            <FileBarChart2 size={14} /> Download Report
          </button>
          <button onClick={toggleWatch} style={{ color: isWatched ? "var(--gold)" : "var(--text-faint)" }}>
            <Star size={20} fill={isWatched ? "var(--gold)" : "none"} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>NAV</div><div className="mf-mono text-lg font-semibold">₹{fmtNum(s.nav)}</div></GlassCard>
        <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>AUM</div><div className="mf-mono text-lg font-semibold">{fmtCr(s.aum)}</div></GlassCard>
        <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>Launch Date</div><div className="mf-mono text-sm font-semibold pt-1">{fmtDate(s.launchDate)}</div></GlassCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: (returnsData.length > 0 && sipReturnsData.length > 0) ? "1fr 1fr" : "1fr", gap: 16 }}>
        {returnsData.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>Return by Period (%)</div>
            <GlassCard className="p-3" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(2) + "%"} />} cursor={{ fill: "var(--surface-2)" }} />
                  <Bar dataKey="val" name="Return" radius={[4, 4, 0, 0]}>
                    {returnsData.map((d, i) => <Cell key={i} fill={d.val >= 0 ? "var(--green)" : "var(--red)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}

        {sipReturnsData.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>SIP Return by Period (%, annualized)</div>
            <GlassCard className="p-3" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sipReturnsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(2) + "%"} />} cursor={{ fill: "var(--surface-2)" }} />
                  <Bar dataKey="val" name="SIP Return" radius={[4, 4, 0, 0]} fill="var(--blue)">
                    {sipReturnsData.map((d, i) => <Cell key={i} fill={d.val >= 0 ? "var(--blue)" : "var(--red)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}
      </div>

      {trendData.length > 1 && (
        <div>
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>NAV Trend (₹, from import snapshots)</div>
          <GlassCard className="p-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                <Tooltip content={<ChartTooltip formatter={(v) => "₹" + v.toFixed(2)} />} />
                <Line type="monotone" dataKey="nav" name="NAV" stroke="var(--gold)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}

      {(risk.stdDev || risk.beta || risk.sharpe || risk.jensen || s.ytm) && (
        <div>
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>Risk Analysis</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {risk.stdDev != null && <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>Std. Dev (%)</div><div className="mf-mono font-semibold">{fmtNum(risk.stdDev)}%</div></GlassCard>}
            {risk.beta != null && <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>Beta (ratio vs benchmark)</div><div className="mf-mono font-semibold">{fmtNum(risk.beta)}</div></GlassCard>}
            {risk.sharpe != null && <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>Sharpe (ratio)</div><div className="mf-mono font-semibold">{fmtNum(risk.sharpe)}</div></GlassCard>}
            {risk.jensen != null && <GlassCard className="p-3"><div className="text-[11px]" style={{ color: "var(--text-dim)" }}>Jensen's Alpha (%)</div><div className="mf-mono font-semibold">{fmtNum(risk.jensen)}%</div></GlassCard>}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: (mcData.length > 0 && sectorData.length > 0) ? "1fr 1fr" : "1fr", gap: 16 }}>
        {mcData.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>Market Cap Allocation (%)</div>
            <GlassCard className="p-3" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mcData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {mcData.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(1) + "%"} />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-dim)" }} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}

        {sectorData.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>Sector Allocation (%)</div>
            <GlassCard className="p-3" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fill: "var(--text-dim)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(1) + "%"} />} cursor={{ fill: "var(--surface-2)" }} />
                  <Bar dataKey="value" name="Allocation" radius={[0, 4, 4, 0]} fill="var(--gold)" />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}
      </div>

      {s.exitLoad && (
        <div>
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>Exit Load (as per scheme terms)</div>
          <GlassCard className="p-3 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>{s.exitLoad}</GlassCard>
        </div>
      )}

      {s.otherData && Object.keys(s.otherData).length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
            Other Data (raw values, mixed format)
            <span className="normal-case" style={{ color: "var(--text-faint)" }}>— every extra column from the source sheet, uncategorized elsewhere</span>
          </div>
          <GlassCard className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              {Object.entries(s.otherData).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 py-1 border-b" style={{ borderColor: "var(--border-soft)" }}>
                  <span style={{ color: "var(--text-dim)" }}>{key}</span>
                  <span className="mf-mono shrink-0" style={{ color: "var(--text)" }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}