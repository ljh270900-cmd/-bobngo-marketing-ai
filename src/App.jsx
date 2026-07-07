import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from "recharts";

/* ─────────────────────────────────────────────
   밥앤고 마케팅 AI — v1
   대시보드 · AI 성과 분석 · 캠페인 플래너 · 콘텐츠 스튜디오
   ───────────────────────────────────────────── */

const C = {
  bg: "#F7F6F1",        // 흰쌀
  card: "#FFFFFF",
  ink: "#20241F",       // 무쇠솥
  sub: "#6B7066",
  line: "#E4E2D8",
  green: "#1E6B42",     // 시금치
  greenSoft: "#E9F2EC",
  gold: "#C9862B",      // 누룽지
  goldSoft: "#F8EEDD",
  red: "#B4452F",
  redSoft: "#F7E8E3",
};

const fmtWon = (n) =>
  isNaN(n) ? "-" : "₩" + Math.round(n).toLocaleString("ko-KR");
const fmtNum = (n) => (isNaN(n) ? "-" : Math.round(n).toLocaleString("ko-KR"));
const pct = (n, d = 0) => (isNaN(n) || !isFinite(n) ? "-" : n.toFixed(d) + "%");

const SAMPLE_ROWS = [
  { week: "1주차", nSpend: 320000, nClicks: 1450, nOrders: 38, mSpend: 250000, mClicks: 2100, mOrders: 21, visits: 5200, revenue: 2450000 },
  { week: "2주차", nSpend: 350000, nClicks: 1580, nOrders: 44, mSpend: 270000, mClicks: 2380, mOrders: 26, visits: 5800, revenue: 2870000 },
  { week: "3주차", nSpend: 330000, nClicks: 1490, nOrders: 41, mSpend: 310000, mClicks: 2900, mOrders: 35, visits: 6400, revenue: 3120000 },
  { week: "4주차", nSpend: 360000, nClicks: 1620, nOrders: 47, mSpend: 340000, mClicks: 3250, mOrders: 42, visits: 7100, revenue: 3560000 },
];

const COLS = [
  { key: "week", label: "주차", type: "text", w: 72 },
  { key: "nSpend", label: "네이버 광고비", type: "num" },
  { key: "nClicks", label: "네이버 클릭", type: "num" },
  { key: "nOrders", label: "네이버 주문", type: "num" },
  { key: "mSpend", label: "SNS 광고비", type: "num" },
  { key: "mClicks", label: "SNS 클릭", type: "num" },
  { key: "mOrders", label: "SNS 주문", type: "num" },
  { key: "visits", label: "스토어 유입", type: "num" },
  { key: "revenue", label: "매출", type: "num" },
];

/* ── Claude API (서버리스 프록시 경유 — 키는 서버에만 존재) ── */
async function askClaude(prompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "서버 오류");
  const text = data.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("응답에서 JSON을 찾지 못했어요.");
  return JSON.parse(clean.slice(start, end + 1));
}

const BRAND_CONTEXT = `브랜드: 밥앤고 (네이버 스마트스토어 간편식 브랜드. 1인 가구·바쁜 직장인 대상 밥/도시락류 간편식 판매).
채널: 네이버 검색광고(쇼핑검색 포함), 인스타그램·메타 SNS 광고, 스마트스토어.`;

/* ── 공통 소품 ── */
function Spinner() {
  return (
    <span className="bng-spin" aria-hidden="true" />
  );
}

function SectionTitle({ eyebrow, title, desc }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="bng-eyebrow">{eyebrow}</div>
      <h2 className="bng-h2">{title}</h2>
      {desc && <p className="bng-desc">{desc}</p>}
    </div>
  );
}

function Tag({ tone = "green", children }) {
  const map = {
    green: { bg: C.greenSoft, fg: C.green },
    gold: { bg: C.goldSoft, fg: "#8F5E17" },
    red: { bg: C.redSoft, fg: C.red },
  };
  const t = map[tone] || map.green;
  return (
    <span style={{
      background: t.bg, color: t.fg, fontSize: 12, fontWeight: 700,
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: C.redSoft, color: C.red, border: `1px solid ${C.red}33`,
      borderRadius: 10, padding: "10px 14px", fontSize: 13, marginTop: 12,
    }}>
      {msg} — 잠시 후 다시 실행해 보세요.
    </div>
  );
}

/* ── 밥심 지수 게이지 (시그니처) ── */
function RiceGauge({ score }) {
  const s = Math.max(0, Math.min(100, score));
  const angle = -90 + (s / 100) * 180;
  const label = s >= 75 ? "든든해요" : s >= 50 ? "적당해요" : s >= 25 ? "출출해요" : "허기져요";
  const tone = s >= 75 ? C.green : s >= 50 ? C.gold : C.red;
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 120" width="180" height="108" role="img" aria-label={`밥심 지수 ${Math.round(s)}점`}>
        <path d="M20 105 A80 80 0 0 1 180 105" fill="none" stroke={C.line} strokeWidth="14" strokeLinecap="round" />
        <path
          d="M20 105 A80 80 0 0 1 180 105" fill="none" stroke={tone} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(s / 100) * 251} 251`}
        />
        {/* 밥공기 */}
        <path d="M78 96 q22 20 44 0 l-4 10 q-18 12 -36 0 Z" fill={C.ink} opacity="0.85" />
        <ellipse cx="100" cy="94" rx="24" ry="8" fill="#fff" stroke={C.ink} strokeWidth="2" />
        <circle cx="92" cy="90" r="3.5" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
        <circle cx="102" cy="87" r="3.5" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
        <circle cx="110" cy="91" r="3.5" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
        {/* 바늘 */}
        <g transform={`rotate(${angle} 100 105)`}>
          <line x1="100" y1="105" x2="100" y2="46" stroke={tone} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        </g>
      </svg>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{Math.round(s)}<span style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}> /100</span></div>
      <div style={{ fontSize: 13, color: tone, fontWeight: 700, marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ── 메인 앱 ── */
export default function BobngoMarketingAI() {
  const [tab, setTab] = useState("dash");
  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem("bng-rows-v1");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length ? parsed : SAMPLE_ROWS;
    } catch {
      return SAMPLE_ROWS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("bng-rows-v1", JSON.stringify(rows));
    } catch {
      /* 저장 공간 부족 등은 조용히 무시 */
    }
  }, [rows]);

  /* KPI 계산 */
  const kpi = useMemo(() => {
    const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const spend = sum("nSpend") + sum("mSpend");
    const revenue = sum("revenue");
    const clicks = sum("nClicks") + sum("mClicks");
    const orders = sum("nOrders") + sum("mOrders");
    const visits = sum("visits");
    const roas = spend ? (revenue / spend) * 100 : NaN;
    const cvr = clicks ? (orders / clicks) * 100 : NaN;
    const cpc = clicks ? spend / clicks : NaN;
    const first = Number(rows[0]?.visits) || 0;
    const last = Number(rows[rows.length - 1]?.visits) || 0;
    const growth = first ? ((last - first) / first) * 100 : 0;
    /* 밥심 지수: ROAS 45점 + CVR 30점 + 유입성장 25점 */
    const score =
      Math.min(45, (roas / 450) * 45 || 0) +
      Math.min(30, (cvr / 3.5) * 30 || 0) +
      Math.min(25, Math.max(0, (growth / 30) * 25));
    return { spend, revenue, clicks, orders, visits, roas, cvr, cpc, growth, score };
  }, [rows]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        week: r.week,
        유입: Number(r.visits) || 0,
        매출: Number(r.revenue) || 0,
        광고비: (Number(r.nSpend) || 0) + (Number(r.mSpend) || 0),
      })),
    [rows]
  );

  const updateCell = (i, key, val) => {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, [key]: key === "week" ? val : val === "" ? "" : Number(val) } : r
      )
    );
  };
  const addRow = () =>
    setRows((p) => [...p, { week: `${p.length + 1}주차`, nSpend: 0, nClicks: 0, nOrders: 0, mSpend: 0, mClicks: 0, mOrders: 0, visits: 0, revenue: 0 }]);
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  /* ── AI 성과 분석 ── */
  const [ana, setAna] = useState({ loading: false, data: null, error: "" });
  const runAnalysis = async () => {
    setAna({ loading: true, data: null, error: "" });
    try {
      const prompt = `${BRAND_CONTEXT}

최근 주간 성과 데이터(원화, 건수):
${JSON.stringify(rows)}

합산 지표: 총광고비 ${fmtWon(kpi.spend)}, 매출 ${fmtWon(kpi.revenue)}, ROAS ${pct(kpi.roas)}, 전환율 ${pct(kpi.cvr, 2)}, CPC ${fmtWon(kpi.cpc)}, 유입 성장률 ${pct(kpi.growth, 1)}.

당신은 밥앤고 전담 퍼포먼스 마케팅 디렉터입니다. 위 데이터를 진단하고 아래 JSON 형식으로만 답하세요. 마크다운, 설명문 없이 JSON만 출력.
{
 "summary": "3문장 이내 종합 진단 (한국어, 구체적 수치 인용)",
 "insights": [{"channel": "네이버 검색광고|SNS 광고|스마트스토어", "finding": "발견한 사실+원인 추정 1~2문장", "severity": "높음|중간|낮음"}],
 "actions": [{"title": "실행 제안 제목", "detail": "이번 주 바로 실행 가능한 구체적 방법 1~2문장", "impact": "기대 효과 한 줄", "priority": 1}]
}
insights는 3개, actions는 우선순위 순 4개.`;
      const data = await askClaude(prompt);
      setAna({ loading: false, data, error: "" });
    } catch (e) {
      setAna({ loading: false, data: null, error: "분석 요청이 실패했어요. (" + e.message + ")" });
    }
  };

  /* ── 캠페인 플래너 ── */
  const [plan, setPlan] = useState({
    budget: 1500000, goal: "매출 성장", product: "든든한 한끼 도시락 (신제품)", period: "4주",
    loading: false, data: null, error: "",
  });
  const runPlan = async () => {
    setPlan((p) => ({ ...p, loading: true, data: null, error: "" }));
    try {
      const prompt = `${BRAND_CONTEXT}

최근 성과 요약: ROAS ${pct(kpi.roas)}, 전환율 ${pct(kpi.cvr, 2)}, CPC ${fmtWon(kpi.cpc)}, 주간 유입 ${fmtNum(kpi.visits / (rows.length || 1))}명 수준.

캠페인 조건:
- 월 예산: ${fmtWon(plan.budget)}
- 핵심 목표: ${plan.goal}
- 주력 제품: ${plan.product}
- 기간: ${plan.period}

당신은 밥앤고 전담 미디어 플래너입니다. 아래 JSON 형식으로만 답하세요. JSON 외 텍스트 금지.
{
 "allocation": [{"channel": "채널명", "budget": 숫자(원), "ratio": "35%", "rationale": "배분 근거 한 줄"}],
 "weekly": [{"week": "1주차", "focus": "주간 핵심 테마", "tasks": ["구체적 실행 항목", "..."]}],
 "kpi_targets": [{"name": "지표명", "target": "목표값", "why": "근거 한 줄"}]
}
allocation은 네이버 검색/쇼핑광고, 인스타·메타 광고, 콘텐츠·리텐션(리뷰/알림톡 등) 3~4개로 예산 합계가 월 예산과 일치하게. weekly는 ${plan.period} 기준, tasks는 주당 3개. kpi_targets는 3개.`;
      const data = await askClaude(prompt);
      setPlan((p) => ({ ...p, loading: false, data }));
    } catch (e) {
      setPlan((p) => ({ ...p, loading: false, error: "플랜 생성이 실패했어요. (" + e.message + ")" }));
    }
  };

  /* ── 콘텐츠 스튜디오 ── */
  const [studio, setStudio] = useState({
    product: "든든한 한끼 도시락", point: "전자레인지 3분, 갓 지은 밥 식감, 나트륨 줄인 반찬 구성",
    target: "혼자 사는 20~30대 직장인", tone: "친근하고 담백하게",
    loading: false, data: null, error: "",
  });
  const runStudio = async () => {
    setStudio((s) => ({ ...s, loading: true, data: null, error: "" }));
    try {
      const prompt = `${BRAND_CONTEXT}

제품: ${studio.product}
소구 포인트: ${studio.point}
타깃: ${studio.target}
톤: ${studio.tone}

당신은 밥앤고 전담 카피라이터입니다. 광고 심의에 걸릴 과장 표현(최고, 100%, 질병 관련 효능 등)은 피하세요. 아래 JSON 형식으로만 답하세요.
{
 "instagram": [{"caption": "인스타 피드 캡션 (3~4줄, 이모지 1~2개만)", "hashtags": "#태그 8개"}],
 "meta_ads": [{"headline": "메타 광고 헤드라인 (20자 내)", "body": "본문 카피 (2문장)"}],
 "naver": {"title": "네이버 쇼핑 상품명 (50자 내, 검색 키워드 반영)", "description": "상세페이지 첫 문단 (2~3문장)"}
}
instagram 2개, meta_ads 2개 (서로 다른 앵글: 편의성 vs 맛/품질).`;
      const data = await askClaude(prompt);
      setStudio((s) => ({ ...s, loading: false, data }));
    } catch (e) {
      setStudio((s) => ({ ...s, loading: false, error: "카피 생성이 실패했어요. (" + e.message + ")" }));
    }
  };

  const TABS = [
    { id: "dash", label: "대시보드" },
    { id: "analysis", label: "AI 성과 분석" },
    { id: "plan", label: "캠페인 플래너" },
    { id: "studio", label: "콘텐츠 스튜디오" },
    { id: "auto", label: "자동 집행 연동" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: `'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, sans-serif` }}>
      <style>{`
        * { box-sizing: border-box; }
        .bng-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 2px; color: ${C.gold}; text-transform: uppercase; margin-bottom: 6px; }
        .bng-h2 { font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.3px; }
        .bng-desc { font-size: 13.5px; color: ${C.sub}; margin: 6px 0 0; line-height: 1.6; }
        .bng-card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 14px; padding: 20px; }
        .bng-btn { background: ${C.green}; color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; }
        .bng-btn:hover { background: #175A37; }
        .bng-btn:disabled { opacity: .55; cursor: default; }
        .bng-btn.ghost { background: transparent; color: ${C.green}; border: 1.5px solid ${C.green}; }
        .bng-btn.ghost:hover { background: ${C.greenSoft}; }
        .bng-input, .bng-select { width: 100%; border: 1.5px solid ${C.line}; border-radius: 10px; padding: 10px 12px; font-size: 14px; font-family: inherit; background: #fff; color: ${C.ink}; }
        .bng-input:focus, .bng-select:focus { outline: 2px solid ${C.green}55; border-color: ${C.green}; }
        .bng-label { font-size: 12.5px; font-weight: 700; color: ${C.sub}; display: block; margin-bottom: 6px; }
        .bng-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bng-table th { text-align: left; padding: 8px 6px; color: ${C.sub}; font-size: 11.5px; font-weight: 700; border-bottom: 1.5px solid ${C.line}; white-space: nowrap; }
        .bng-table td { padding: 4px 3px; border-bottom: 1px solid ${C.line}; }
        .bng-table input { width: 100%; min-width: 74px; border: 1px solid transparent; border-radius: 6px; padding: 6px 6px; font-size: 13px; font-family: inherit; background: transparent; color: ${C.ink}; }
        .bng-table input:hover { border-color: ${C.line}; background: #fff; }
        .bng-table input:focus { outline: none; border-color: ${C.green}; background: #fff; }
        .bng-spin { width: 15px; height: 15px; border: 2.5px solid #ffffff55; border-top-color: #fff; border-radius: 50%; display: inline-block; animation: bngspin .7s linear infinite; }
        @keyframes bngspin { to { transform: rotate(360deg); } }
        .bng-tab { border: none; background: transparent; padding: 10px 14px; font-size: 14px; font-weight: 700; color: ${C.sub}; cursor: pointer; border-radius: 10px; font-family: inherit; white-space: nowrap; }
        .bng-tab.on { background: ${C.ink}; color: #fff; }
        .bng-tab:not(.on):hover { background: ${C.line}66; color: ${C.ink}; }
        @media (prefers-reduced-motion: reduce) { .bng-spin { animation: none; } }
        @media (max-width: 720px) { .bng-grid2, .bng-grid3, .bng-grid4 { grid-template-columns: 1fr !important; } .bng-hero { flex-direction: column; } }
      `}</style>

      {/* 헤더 */}
      <header style={{ background: C.ink, color: "#fff", padding: "26px 24px 22px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
              밥앤고 <span style={{ color: C.gold }}>마케팅 AI</span>
            </div>
            <div style={{ fontSize: 13, color: "#ffffffaa" }}>
              광고 성과를 읽고, 다음 한 수를 차려드리는 전담 에이전시
            </div>
          </div>
          <nav style={{ display: "flex", gap: 4, marginTop: 18, background: "#ffffff14", padding: 5, borderRadius: 12, overflowX: "auto" }} aria-label="주요 메뉴">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={"bng-tab" + (tab === t.id ? " on" : "")}
                style={tab === t.id ? { background: C.card, color: C.ink } : { color: "#ffffffcc" }}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 24px 60px" }}>

        {/* ── 대시보드 ── */}
        {tab === "dash" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="bng-hero" style={{ display: "flex", gap: 18 }}>
              <div className="bng-card" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 230 }}>
                <div className="bng-eyebrow">이번 달 밥심 지수</div>
                <RiceGauge score={kpi.score} />
                <div style={{ fontSize: 12, color: C.sub, marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
                  ROAS · 전환율 · 유입 성장률을<br />합쳐 계산한 종합 건강 점수예요
                </div>
              </div>
              <div className="bng-grid4" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {[
                  { label: "총 광고비", value: fmtWon(kpi.spend), sub: "네이버 + SNS 합산" },
                  { label: "광고 매출", value: fmtWon(kpi.revenue), sub: `ROAS ${pct(kpi.roas)}` },
                  { label: "스토어 유입", value: fmtNum(kpi.visits) + "명", sub: `성장률 ${pct(kpi.growth, 1)}` },
                  { label: "전환율", value: pct(kpi.cvr, 2), sub: `CPC ${fmtWon(kpi.cpc)} · 주문 ${fmtNum(kpi.orders)}건` },
                ].map((c) => (
                  <div key={c.label} className="bng-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>{c.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 2px", letterSpacing: -0.5 }}>{c.value}</div>
                    <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bng-card">
              <SectionTitle eyebrow="Trend" title="유입 · 매출 · 광고비 흐름" desc="유입(막대)이 늘 때 매출(선)이 같이 따라오는지가 핵심이에요." />
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: C.sub }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 10000 ? v / 10000 + "만" : v)} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} tickFormatter={(v) => v / 10000 + "만"} />
                    <Tooltip formatter={(v, name) => (name === "유입" ? fmtNum(v) + "명" : fmtWon(v))} contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar yAxisId="l" dataKey="유입" fill={C.greenSoft} stroke={C.green} radius={[6, 6, 0, 0]} barSize={28} />
                    <Line yAxisId="r" dataKey="매출" stroke={C.green} strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line yAxisId="r" dataKey="광고비" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bng-card">
              <SectionTitle eyebrow="Data" title="주간 성과 입력" desc="네이버 광고센터·메타 광고관리자·스마트스토어 통계의 주간 숫자를 그대로 옮겨 적으면 돼요. 셀을 눌러 바로 수정할 수 있어요. 처음엔 예시 데이터가 채워져 있어요." />
              <div style={{ overflowX: "auto" }}>
                <table className="bng-table">
                  <thead>
                    <tr>
                      {COLS.map((c) => <th key={c.key}>{c.label}</th>)}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        {COLS.map((c) => (
                          <td key={c.key}>
                            <input
                              type={c.type === "num" ? "number" : "text"}
                              value={r[c.key]}
                              onChange={(e) => updateCell(i, c.key, e.target.value)}
                              aria-label={`${r.week} ${c.label}`}
                            />
                          </td>
                        ))}
                        <td>
                          <button onClick={() => removeRow(i)} title="이 주차 삭제" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", fontSize: 15, padding: 4 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14 }}>
                <button className="bng-btn ghost" onClick={addRow}>+ 주차 추가</button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI 성과 분석 ── */}
        {tab === "analysis" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="bng-card">
              <SectionTitle eyebrow="AI Report" title="이번 주 성과, AI 디렉터의 진단" desc="대시보드에 입력한 데이터를 그대로 읽고, 채널별 문제와 이번 주 실행 제안을 우선순위대로 정리해 드려요." />
              <button className="bng-btn" onClick={runAnalysis} disabled={ana.loading}>
                {ana.loading ? <><Spinner /> 데이터 진단 중…</> : "AI 진단 실행"}
              </button>
              <ErrorBox msg={ana.error} />
            </div>

            {ana.data && (
              <>
                <div className="bng-card" style={{ borderLeft: `4px solid ${C.green}` }}>
                  <div className="bng-eyebrow">종합 진단</div>
                  <p style={{ fontSize: 15, lineHeight: 1.75, margin: "4px 0 0" }}>{ana.data.summary}</p>
                </div>
                <div className="bng-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {(ana.data.insights || []).map((it, i) => (
                    <div key={i} className="bng-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{it.channel}</div>
                        <Tag tone={it.severity === "높음" ? "red" : it.severity === "중간" ? "gold" : "green"}>{it.severity}</Tag>
                      </div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#3A3F39", margin: 0 }}>{it.finding}</p>
                    </div>
                  ))}
                </div>
                <div className="bng-card">
                  <SectionTitle eyebrow="Action" title="이번 주 실행 리스트" />
                  <div style={{ display: "grid", gap: 12 }}>
                    {(ana.data.actions || []).map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, padding: "14px 16px", background: i === 0 ? C.greenSoft : C.bg, borderRadius: 12 }}>
                        <div style={{ fontWeight: 900, color: C.green, fontSize: 15, minWidth: 22 }}>{a.priority || i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14.5 }}>{a.title}</div>
                          <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: "4px 0 6px", color: "#3A3F39" }}>{a.detail}</p>
                          <Tag tone="gold">기대 효과 · {a.impact}</Tag>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 캠페인 플래너 ── */}
        {tab === "plan" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="bng-card">
              <SectionTitle eyebrow="Media Plan" title="예산 넣으면 한 달 플랜이 나와요" desc="최근 성과(ROAS·전환율·CPC)를 반영해 채널별 예산 배분과 주차별 실행 플랜을 짜 드려요." />
              <div className="bng-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
                <div>
                  <label className="bng-label" htmlFor="p-budget">월 광고 예산 (원)</label>
                  <input id="p-budget" className="bng-input" type="number" value={plan.budget} onChange={(e) => setPlan((p) => ({ ...p, budget: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="bng-label" htmlFor="p-goal">핵심 목표</label>
                  <select id="p-goal" className="bng-select" value={plan.goal} onChange={(e) => setPlan((p) => ({ ...p, goal: e.target.value }))}>
                    <option>매출 성장</option>
                    <option>스토어 유입 확대</option>
                    <option>신규 고객 확보</option>
                    <option>재구매·단골 만들기</option>
                    <option>신제품 런칭</option>
                  </select>
                </div>
                <div>
                  <label className="bng-label" htmlFor="p-product">주력 제품</label>
                  <input id="p-product" className="bng-input" value={plan.product} onChange={(e) => setPlan((p) => ({ ...p, product: e.target.value }))} />
                </div>
                <div>
                  <label className="bng-label" htmlFor="p-period">기간</label>
                  <select id="p-period" className="bng-select" value={plan.period} onChange={(e) => setPlan((p) => ({ ...p, period: e.target.value }))}>
                    <option>4주</option>
                    <option>2주</option>
                    <option>8주</option>
                  </select>
                </div>
              </div>
              <button className="bng-btn" onClick={runPlan} disabled={plan.loading}>
                {plan.loading ? <><Spinner /> 플랜 설계 중…</> : "AI 플랜 생성"}
              </button>
              <ErrorBox msg={plan.error} />
            </div>

            {plan.data && (
              <>
                <div className="bng-card">
                  <SectionTitle eyebrow="Budget" title="채널별 예산 배분" />
                  <div style={{ display: "grid", gap: 10 }}>
                    {(plan.data.allocation || []).map((a, i) => {
                      const ratio = parseFloat(a.ratio) || 0;
                      return (
                        <div key={i} style={{ padding: "12px 14px", background: C.bg, borderRadius: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>{a.channel}</span>
                            <span style={{ fontWeight: 800, fontSize: 14, color: C.green }}>{fmtWon(a.budget)} <span style={{ color: C.sub, fontWeight: 600 }}>({a.ratio})</span></span>
                          </div>
                          <div style={{ height: 8, background: C.line, borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, ratio)}%`, height: "100%", background: i === 0 ? C.green : i === 1 ? C.gold : "#8AA893", borderRadius: 99 }} />
                          </div>
                          <p style={{ fontSize: 12.5, color: C.sub, margin: "8px 0 0", lineHeight: 1.6 }}>{a.rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bng-card">
                  <SectionTitle eyebrow="Weekly" title="주차별 실행 플랜" />
                  <div className="bng-grid2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                    {(plan.data.weekly || []).map((w, i) => (
                      <div key={i} style={{ border: `1.5px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                          <Tag>{w.week}</Tag>
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{w.focus}</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                          {(w.tasks || []).map((t, j) => (
                            <li key={j} style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3A3F39" }}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bng-card">
                  <SectionTitle eyebrow="Targets" title="이번 캠페인 목표 지표" />
                  <div className="bng-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                    {(plan.data.kpi_targets || []).map((k, i) => (
                      <div key={i} style={{ background: C.greenSoft, borderRadius: 12, padding: 16, textAlign: "center" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>{k.name}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: C.green, margin: "4px 0" }}>{k.target}</div>
                        <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{k.why}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 콘텐츠 스튜디오 ── */}
        {tab === "studio" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="bng-card">
              <SectionTitle eyebrow="Copy Studio" title="채널 맞춤 광고 카피 뽑기" desc="같은 제품이라도 인스타 캡션, 메타 광고, 네이버 쇼핑은 문법이 달라요. 세 채널 버전을 한 번에 만들어 드려요." />
              <div className="bng-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label className="bng-label" htmlFor="s-product">제품명</label>
                  <input id="s-product" className="bng-input" value={studio.product} onChange={(e) => setStudio((s) => ({ ...s, product: e.target.value }))} />
                </div>
                <div>
                  <label className="bng-label" htmlFor="s-target">타깃 고객</label>
                  <input id="s-target" className="bng-input" value={studio.target} onChange={(e) => setStudio((s) => ({ ...s, target: e.target.value }))} />
                </div>
                <div>
                  <label className="bng-label" htmlFor="s-point">소구 포인트</label>
                  <input id="s-point" className="bng-input" value={studio.point} onChange={(e) => setStudio((s) => ({ ...s, point: e.target.value }))} />
                </div>
                <div>
                  <label className="bng-label" htmlFor="s-tone">톤</label>
                  <input id="s-tone" className="bng-input" value={studio.tone} onChange={(e) => setStudio((s) => ({ ...s, tone: e.target.value }))} />
                </div>
              </div>
              <button className="bng-btn" onClick={runStudio} disabled={studio.loading}>
                {studio.loading ? <><Spinner /> 카피 짓는 중…</> : "카피 생성"}
              </button>
              <ErrorBox msg={studio.error} />
            </div>

            {studio.data && (
              <div className="bng-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, alignItems: "start" }}>
                <div className="bng-card">
                  <div className="bng-eyebrow">Instagram</div>
                  {(studio.data.instagram || []).map((c, i) => (
                    <div key={i} style={{ marginTop: i ? 14 : 8, paddingTop: i ? 14 : 0, borderTop: i ? `1px solid ${C.line}` : "none" }}>
                      <p style={{ fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>{c.caption}</p>
                      <p style={{ fontSize: 12.5, color: C.green, margin: "8px 0 0", lineHeight: 1.6 }}>{c.hashtags}</p>
                    </div>
                  ))}
                </div>
                <div className="bng-card">
                  <div className="bng-eyebrow">Meta 광고</div>
                  {(studio.data.meta_ads || []).map((c, i) => (
                    <div key={i} style={{ marginTop: i ? 14 : 8, paddingTop: i ? 14 : 0, borderTop: i ? `1px solid ${C.line}` : "none" }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>{c.headline}</div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: "6px 0 0", color: "#3A3F39" }}>{c.body}</p>
                    </div>
                  ))}
                </div>
                <div className="bng-card">
                  <div className="bng-eyebrow">네이버 쇼핑</div>
                  <div style={{ marginTop: 8 }}>
                    <div className="bng-label">상품명</div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, margin: "0 0 12px" }}>{studio.data.naver?.title}</p>
                    <div className="bng-label">상세 첫 문단</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.75, margin: 0, color: "#3A3F39" }}>{studio.data.naver?.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 자동 집행 연동 ── */}
        {tab === "auto" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="bng-card">
              <SectionTitle
                eyebrow="Automation Roadmap"
                title="광고 자동 집행, 이렇게 연결해요"
                desc="입찰가 조정·예산 증감·캠페인 on/off 같은 실제 집행은 각 광고 플랫폼의 공식 API 키와 작은 서버가 필요해요. 지금 이 앱의 분석·제안 엔진에 아래 연동만 붙이면 완전 자동화가 됩니다."
              />
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { step: "1단계", title: "네이버 검색광고 API 발급", detail: "네이버 검색광고 관리자 → 도구 → API 사용 관리에서 액세스 라이선스와 비밀키를 발급받아요. 키워드별 입찰가 조정, 캠페인 on/off, 성과 리포트 자동 수집이 가능해져요.", tag: "무료 발급" },
                  { step: "2단계", title: "메타 마케팅 API 연결", detail: "Meta for Developers에서 앱을 만들고 광고 계정 권한을 연결하면 인스타·페이스북 광고 세트의 예산과 타깃을 코드로 제어할 수 있어요.", tag: "무료 발급" },
                  { step: "3단계", title: "스마트스토어 데이터 자동 수집", detail: "네이버 커머스 API로 주문·유입 데이터를 매일 자동으로 가져와 이 대시보드에 자동 반영해요. 수동 입력이 사라져요.", tag: "커머스 API" },
                  { step: "4단계", title: "자동 실행 규칙 붙이기", detail: "예: 'ROAS 300% 미만 3일 지속 → 해당 키워드 입찰가 20% 인하', '전환율 상위 소재 → 예산 자동 증액'. AI 진단 결과를 규칙으로 바꿔 서버(하루 1~2회 실행)에서 자동 집행해요.", tag: "핵심 단계" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "16px", background: C.bg, borderRadius: 12 }}>
                    <div style={{ fontWeight: 900, color: C.gold, fontSize: 13, minWidth: 44 }}>{s.step}</div>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 14.5 }}>{s.title}</span>
                        <Tag tone={i === 3 ? "gold" : "green"}>{s.tag}</Tag>
                      </div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: "6px 0 0", color: "#3A3F39" }}>{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: C.sub, marginTop: 16, lineHeight: 1.7 }}>
                API 키가 준비되면 말씀해 주세요. 이 앱의 분석 로직을 그대로 옮겨 매일 아침 자동으로 성과를 수집하고, 규칙에 따라 집행까지 하는 서버 버전을 함께 만들 수 있어요.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "0 24px 30px", fontSize: 12, color: C.sub }}>
        밥앤고 마케팅 AI · 주간 데이터는 이 브라우저에 자동 저장돼요. AI 분석 결과는 필요 시 복사해 두세요.
      </footer>
    </div>
  );
}
