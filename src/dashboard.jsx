import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine, Legend, ComposedChart, Area } from 'recharts';
import { AlertTriangle, Activity, Clock, Package, CheckCircle2, XCircle, TrendingDown, TrendingUp, Wrench, FileText, Shield, Target, AlertOctagon, ChevronRight, Gauge, Layers, Zap } from 'lucide-react';

// ============================================================================
// SYNTHETIC DATA MODEL — Space hardware machine shop
// Scenario: Tactical Space Systems-style supplier producing satellite
// structural components, propellant tank fittings, RF waveguide housings,
// and optical bench brackets. AS9100D + Nadcap (heat treat, NDT, special
// processes). Low-volume / high-mix. ITAR/CUI environment.
// ============================================================================

const MACHINES = [
  { id: 'M-101', name: 'DMG MORI NLX-2500', type: '2-axis Lathe', cell: 'Turning',  capability: 'Ø6"-Ø12" Ti/Inconel/Al', operator: 'Cert L3' },
  { id: 'M-102', name: 'Mazak QTN-350MY',   type: 'Mill-Turn',   cell: 'Turning',  capability: 'Live tooling, Y-axis',   operator: 'Cert L3' },
  { id: 'M-201', name: 'Makino F5',          type: '3-axis VMC',  cell: 'Milling',  capability: 'High-speed Al, brackets', operator: 'Cert L2' },
  { id: 'M-202', name: 'Haas VF-4SS',        type: '3-axis VMC',  cell: 'Milling',  capability: 'General Al/SS',           operator: 'Cert L2' },
  { id: 'M-301', name: 'DMG MORI DMU-50',    type: '5-axis',      cell: 'Complex',  capability: 'Ti waveguide, optical',   operator: 'Cert L4' },
  { id: 'M-302', name: 'Hermle C42U',        type: '5-axis',      cell: 'Complex',  capability: 'Inconel, propellant fittings', operator: 'Cert L4' },
  { id: 'M-303', name: 'Mikron HSM-600U',    type: '5-axis HSM',  cell: 'Complex',  capability: 'Beryllium*, optical mounts', operator: 'Cert L4' },
];

// Active work orders — realistic aerospace mix
const WORK_ORDERS = [
  { wo: 'WO-24881', part: 'P/N 80213-1 Tank Mount Bracket',     program: 'NGP-OPIR',  qty: 8,  done: 6, machine: 'M-302', dueDays:  2, material: 'Ti-6Al-4V', nadcap: ['HT','NDT'], priority: 'CRITICAL', fai: 'Required', value: 142000 },
  { wo: 'WO-24902', part: 'P/N 71450-3 Waveguide Housing',      program: 'GPS-IIIF',  qty: 12, done: 9, machine: 'M-301', dueDays:  4, material: '6061-T6',   nadcap: ['CHEM'], priority: 'HIGH', fai: 'Complete', value: 96000 },
  { wo: 'WO-24915', part: 'P/N 22008-A Optical Bench Bracket',  program: 'SBIRS-FU',  qty: 4,  done: 1, machine: 'M-303', dueDays:  6, material: 'Invar-36',  nadcap: ['HT','NDT','CHEM'], priority: 'HIGH', fai: 'In-Process', value: 218000 },
  { wo: 'WO-24923', part: 'P/N 80568-1 Propellant Boss Fitting',program: 'LDPE-Sat',  qty: 16, done: 4, machine: 'M-302', dueDays:  9, material: 'Inconel 718', nadcap: ['HT','NDT'], priority: 'MEDIUM', fai: 'Required', value: 184000 },
  { wo: 'WO-24941', part: 'P/N 33102-2 Star Tracker Mount',     program: 'NGP-OPIR',  qty: 6,  done: 0, machine: 'M-301', dueDays: 11, material: 'Ti-6Al-4V', nadcap: ['NDT'], priority: 'HIGH', fai: 'Required', value: 108000 },
  { wo: 'WO-24955', part: 'P/N 41208-1 Antenna Feed Horn',      program: 'GPS-IIIF',  qty: 10, done: 3, machine: 'M-301', dueDays:  5, material: '6061-T6',   nadcap: ['CHEM'], priority: 'MEDIUM', fai: 'Complete', value: 72000 },
  { wo: 'WO-24968', part: 'P/N 19044-5 Reaction Wheel Housing', program: 'CLASSIFIED',qty: 4,  done: 2, machine: 'M-102', dueDays:  3, material: '15-5PH SS', nadcap: ['HT','NDT'], priority: 'CRITICAL', fai: 'In-Process', value: 165000 },
  { wo: 'WO-24972', part: 'P/N 60821-2 Solar Array Hinge Pin',  program: 'LDPE-Sat',  qty: 24, done: 12,machine: 'M-101', dueDays:  7, material: '17-4PH SS', nadcap: ['HT'], priority: 'MEDIUM', fai: 'Complete', value: 58000 },
  { wo: 'WO-24988', part: 'P/N 50117-1 Cryocooler Coldfinger',  program: 'SBIRS-FU',  qty: 2,  done: 0, machine: 'M-303', dueDays: 14, material: 'OFE Copper', nadcap: ['CHEM'], priority: 'LOW', fai: 'Required', value: 95000 },
  { wo: 'WO-24996', part: 'P/N QT-0118 Walk-in Test Fixture',   program: 'INTERNAL',  qty: 1,  done: 0, machine: 'M-202', dueDays:  1, material: '6061-T6',   nadcap: [], priority: 'HIGH', fai: 'N/A', value: 8500, walkin: true },
];

// 7-day machine performance — OEE components per machine
const MACHINE_PERF = MACHINES.map(m => {
  const seeds = {
    'M-101': { a: 0.82, p: 0.91, q: 0.987, util: 0.74 },
    'M-102': { a: 0.88, p: 0.86, q: 0.992, util: 0.79 },
    'M-201': { a: 0.91, p: 0.89, q: 0.995, util: 0.83 },
    'M-202': { a: 0.78, p: 0.74, q: 0.981, util: 0.61 }, // weak performer
    'M-301': { a: 0.93, p: 0.88, q: 0.991, util: 0.86 },
    'M-302': { a: 0.71, p: 0.79, q: 0.974, util: 0.58 }, // bottleneck — Ti/Inconel queue
    'M-303': { a: 0.84, p: 0.82, q: 0.989, util: 0.69 },
  };
  const s = seeds[m.id];
  return { ...m, availability: s.a, performance: s.p, quality: s.q, oee: s.a * s.p * s.q, utilization: s.util };
});

// Daily throughput trend — last 14 days
const THROUGHPUT_TREND = Array.from({ length: 14 }, (_, i) => {
  const day = i + 1;
  const baseline = 142;
  const drift = Math.sin(i / 2.3) * 18;
  const noise = ((i * 7919) % 23) - 11;
  return {
    day: `D${day}`,
    actual: Math.round(baseline + drift + noise),
    plan: 145,
    sevenDayAvg: Math.round(baseline + Math.sin(i / 2.3) * 9),
  };
});

// Downtime by reason (rolled up across all machines, last 30 days)
const DOWNTIME_REASONS = [
  { reason: 'Setup / FAI Buyoff Wait',   minutes: 2840, color: '#FF6B35', actionable: true },
  { reason: 'Material Cert Hold',        minutes: 1620, color: '#FFB627', actionable: true },
  { reason: 'Tool Change / Wear',        minutes: 1180, color: '#7B9EFF', actionable: false },
  { reason: 'Nadcap Process Wait (HT)',  minutes:  980, color: '#FF6B35', actionable: true },
  { reason: 'Inspection Queue (CMM)',    minutes:  870, color: '#FFB627', actionable: true },
  { reason: 'Program Edit / DPD Issue',  minutes:  640, color: '#7B9EFF', actionable: true },
  { reason: 'Operator Cert Gap',         minutes:  410, color: '#FFB627', actionable: true },
  { reason: 'Unplanned Maintenance',     minutes:  380, color: '#E84855', actionable: false },
  { reason: 'Shift Change / Break',      minutes:  290, color: '#5C6B7A', actionable: false },
];

// Quality / NCR data
const NCR_LOG = [
  { id: 'NCR-2891', date: 'D-12', wo: 'WO-24881', part: 'Tank Mount Bracket', defect: 'Surface finish out of spec on Ø1.250 bore', disposition: 'Rework', cost: 4200, machine: 'M-302', cause: 'Tool wear past control limit' },
  { id: 'NCR-2895', date: 'D-10', wo: 'WO-24902', part: 'Waveguide Housing',  defect: 'TP callout 0.0008 over on RF face',          disposition: 'Use-As-Is (MRB)', cost: 0,    machine: 'M-301', cause: 'Probing strategy gap' },
  { id: 'NCR-2901', date: 'D-08', wo: 'WO-24915', part: 'Optical Bench Bracket', defect: 'Crack indication on penetrant inspection',disposition: 'Scrap', cost: 18400, machine: 'M-303', cause: 'Material lot anomaly — supplier CAR opened' },
  { id: 'NCR-2908', date: 'D-06', wo: 'WO-24881', part: 'Tank Mount Bracket', defect: 'Thread gauge fail on M6x1.0',                disposition: 'Rework', cost: 1100, machine: 'M-302', cause: 'Tap fixturing drift' },
  { id: 'NCR-2914', date: 'D-04', wo: 'WO-24923', part: 'Propellant Boss Fitting', defect: 'Heat treat hardness low — Rc 36 vs 40-44 spec', disposition: 'Scrap', cost: 12800, machine: 'M-302', cause: 'Nadcap supplier process drift' },
  { id: 'NCR-2918', date: 'D-03', wo: 'WO-24968', part: 'Reaction Wheel Housing', defect: 'Concentricity 0.0012 over',              disposition: 'Rework', cost: 3400, machine: 'M-102', cause: 'Workholding repeatability' },
  { id: 'NCR-2922', date: 'D-01', wo: 'WO-24881', part: 'Tank Mount Bracket', defect: 'Surface roughness Ra 64 vs 32 spec',         disposition: 'Rework', cost: 2900, machine: 'M-302', cause: 'Tool wear past control limit' }, // recurrence
];

// Defect Pareto
const DEFECT_PARETO = [
  { code: 'Surface Finish',    count: 14, pct: 28 },
  { code: 'Dimensional (TP)',  count: 11, pct: 22 },
  { code: 'Thread/Tap',         count:  8, pct: 16 },
  { code: 'Heat Treat',          count:  6, pct: 12 },
  { code: 'NDT Indication',      count:  5, pct: 10 },
  { code: 'Concentricity',       count:  4, pct:  8 },
  { code: 'Other',               count:  2, pct:  4 },
];

// FPY trend
const FPY_TREND = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  fpy: 89 + Math.sin(i / 3) * 4 + ((i * 5471) % 7) - 3,
  target: 95,
}));

// Setup time trend (target: hit 30% reduction goal — Phase 2)
const SETUP_TIME = MACHINES.map(m => {
  const seeds = {
    'M-101': { current: 42, baseline: 58 },
    'M-102': { current: 48, baseline: 65 },
    'M-201': { current: 35, baseline: 50 },
    'M-202': { current: 55, baseline: 62 },
    'M-301': { current: 78, baseline: 95 },
    'M-302': { current: 92, baseline: 98 }, // setup loss flag
    'M-303': { current: 71, baseline: 88 },
  };
  return { machine: m.id, type: m.type, ...seeds[m.id] };
});

// Bottleneck calculation — TOC style (queue + due-date pressure + utilization)
const BOTTLENECK_DATA = MACHINE_PERF.map(m => {
  const queueHours = { 'M-101': 18, 'M-102': 24, 'M-201': 12, 'M-202': 8, 'M-301': 36, 'M-302': 62, 'M-303': 28 }[m.id];
  const wipUnits   = { 'M-101': 24, 'M-102': 18, 'M-201': 14, 'M-202':10, 'M-301': 22, 'M-302': 36, 'M-303': 18 }[m.id];
  const dueDateRisk= { 'M-101': 0.2, 'M-102':0.6, 'M-201':0.1, 'M-202':0.2,'M-301':0.5, 'M-302':0.92,'M-303': 0.4 }[m.id];
  // composite TOC-style score: high queue + low OEE + due-date pressure = bottleneck
  const score = (queueHours / 70) * 0.4 + (1 - m.oee) * 0.3 + dueDateRisk * 0.3;
  return { ...m, queueHours, wipUnits, dueDateRisk, bottleneckScore: score };
});

// Schedule risk per WO
const SCHEDULE_RISK = WORK_ORDERS.map(wo => {
  const m = MACHINE_PERF.find(x => x.id === wo.machine);
  const remaining = wo.qty - wo.done;
  const machineLoad = BOTTLENECK_DATA.find(x => x.id === wo.machine).queueHours;
  // simple risk: low days + high remaining + slow machine = red
  const riskRaw = (remaining / wo.qty) * 0.4 + (machineLoad / 70) * 0.3 + (1 / Math.max(wo.dueDays, 1)) * 8 * 0.3;
  let risk = 'GREEN';
  if (riskRaw > 0.6) risk = 'RED';
  else if (riskRaw > 0.4) risk = 'AMBER';
  return { ...wo, remaining, riskScore: riskRaw, risk };
});

// CAPA / Event Response prompts — closed loop
const CAPA_PROMPTS = [
  {
    id: 'ERT-001',
    severity: 'CRITICAL',
    title: 'Recurring tool wear failure on M-302 — 3rd NCR in 12 days',
    detail: 'NCR-2891, NCR-2908, NCR-2922 all attribute root cause to tool wear past control limit on Ø1.250 bore operation. Pattern indicates inadequate tool life monitoring on Ti-6Al-4V on Hermle C42U.',
    action: 'Open 8D / CAPA. Implement in-process tool wear monitoring (acoustic/spindle load). Update tool life PM card. Estimated rework cost recovered: $8,200 / 90 days.',
    program: 'NGP-OPIR',
    owner: 'Mfg Eng + Tooling Lead',
  },
  {
    id: 'ERT-002',
    severity: 'HIGH',
    title: 'M-302 emerging as system constraint (TOC bottleneck score 0.71)',
    detail: 'Hermle C42U queue at 62 hrs and growing. Ti/Inconel work concentrated on single machine. Due-date pressure on WO-24881 (NGP-OPIR CRITICAL) at 92% schedule risk.',
    action: 'Cross-train operator on M-301 for Inconel 718. Re-route WO-24923 boss fittings to M-301. Evaluate offload of HT-required ops to alternate Nadcap source.',
    program: 'Multi',
    owner: 'Production Control + Mfg Eng',
  },
  {
    id: 'ERT-003',
    severity: 'HIGH',
    title: 'Setup / FAI buyoff queue is #1 downtime driver (47.3 hrs in 30d)',
    detail: 'AS9102 FAI buyoff cycle averaging 4.2 hrs per first article. Quality engineering bandwidth constrained. SMED principles not yet applied to setup cycle.',
    action: 'Phase 2 Kaizen: pre-stage CMM inspection programs, parallelize FAI documentation, dedicated FAI quality engineer per shift. Target: 30% setup reduction in 90 days.',
    program: 'Continuous Improvement',
    owner: 'Quality + Mfg Eng',
  },
  {
    id: 'ERT-004',
    severity: 'MEDIUM',
    title: 'Material cert hold cycle eating 27 hrs / 30 days',
    detail: 'Ti-6Al-4V and Invar-36 lot cert verification dependent on manual receiving inspection. Two material lot anomalies in trailing 30 days (NCR-2901 supplier CAR open).',
    action: 'Stand up SPC on incoming material chemistry. Move to digital cert workflow. Tighten supplier scorecard threshold for repeat non-conformance.',
    program: 'Supplier Quality',
    owner: 'Supplier Quality + Receiving',
  },
  {
    id: 'ERT-005',
    severity: 'MEDIUM',
    title: 'Producibility feedback loop · P/N 22008-A optical bench bracket',
    detail: 'Invar-36 bracket requires 3 setups and Nadcap HT + NDT + CHEM. Estimated 14 hrs per part with 67% scrap risk on first article. Design feature — 0.0008" TP callout on RF face — is at the edge of CMM measurement repeatability.',
    action: 'Open producibility review with design engineering. Recommend tolerance relaxation on non-functional surfaces or DFM redesign for single-setup. Phase 2: stand up DFM scorecard at design release.',
    program: 'SBIRS-FU',
    owner: 'Mfg Eng + Design Engineering',
  },
];

// Color tokens
const COLOR = {
  bg:     '#0A0E14',
  panel:  '#0F1620',
  panel2: '#141C28',
  border: '#1F2A3A',
  text:   '#E6EDF3',
  dim:    '#8B949E',
  accent: '#FF6B35',  // signal orange — aerospace warning lineage
  green:  '#3FB950',
  amber:  '#FFB627',
  red:    '#E84855',
  blue:   '#58A6FF',
  purple: '#BC8CFF',
};

// ============================================================================
// COMPONENTS
// ============================================================================

const KpiCard = ({ label, value, unit, sub, trend, status, icon: Icon }) => {
  const statusColor = status === 'good' ? COLOR.green : status === 'warn' ? COLOR.amber : status === 'bad' ? COLOR.red : COLOR.blue;
  return (
    <div style={{
      background: COLOR.panel,
      border: `1px solid ${COLOR.border}`,
      borderLeft: `3px solid ${statusColor}`,
      padding: '16px 18px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', color: COLOR.dim, textTransform: 'uppercase', fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", monospace' }}>{label}</span>
        {Icon && <Icon size={14} color={COLOR.dim} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 32, fontWeight: 600, color: COLOR.text, fontFamily: 'ui-monospace, "JetBrains Mono", monospace', letterSpacing: '-0.02em' }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: COLOR.dim, fontFamily: 'ui-monospace, monospace' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: COLOR.dim, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: trend >= 0 ? COLOR.green : COLOR.red, fontFamily: 'ui-monospace, monospace' }}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
        </div>
      )}
    </div>
  );
};

const Panel = ({ title, subtitle, children, action }) => (
  <div style={{ background: COLOR.panel, border: `1px solid ${COLOR.border}`, padding: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${COLOR.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.text, letterSpacing: '0.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: COLOR.dim, marginTop: 3, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const StatusPill = ({ status, children }) => {
  const map = {
    GREEN:    { bg: 'rgba(63,185,80,0.12)',  fg: COLOR.green, br: COLOR.green },
    AMBER:    { bg: 'rgba(255,182,39,0.12)', fg: COLOR.amber, br: COLOR.amber },
    RED:      { bg: 'rgba(232,72,85,0.15)',  fg: COLOR.red,   br: COLOR.red },
    CRITICAL: { bg: 'rgba(232,72,85,0.18)',  fg: COLOR.red,   br: COLOR.red },
    HIGH:     { bg: 'rgba(255,107,53,0.15)', fg: COLOR.accent,br: COLOR.accent },
    MEDIUM:   { bg: 'rgba(255,182,39,0.12)', fg: COLOR.amber, br: COLOR.amber },
    LOW:      { bg: 'rgba(88,166,255,0.12)', fg: COLOR.blue,  br: COLOR.blue },
  };
  const c = map[status] || map.LOW;
  return (
    <span style={{ background: c.bg, color: c.fg, border: `1px solid ${c.br}`, padding: '2px 7px', fontSize: 9.5, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em', fontWeight: 600 }}>{children || status}</span>
  );
};

// ============================================================================
// TAB: EXECUTIVE OVERVIEW
// ============================================================================
const ExecutiveTab = () => {
  const fleetOEE = MACHINE_PERF.reduce((s, m) => s + m.oee, 0) / MACHINE_PERF.length;
  const totalThroughput = THROUGHPUT_TREND.reduce((s, d) => s + d.actual, 0);
  const avgFPY = FPY_TREND.reduce((s, d) => s + d.fpy, 0) / FPY_TREND.length;
  const scrapCost = NCR_LOG.filter(n => n.disposition === 'Scrap').reduce((s, n) => s + n.cost, 0);
  const reworkCost = NCR_LOG.filter(n => n.disposition === 'Rework').reduce((s, n) => s + n.cost, 0);
  const otdRisk = SCHEDULE_RISK.filter(w => w.risk === 'RED').length;
  const totalWO = SCHEDULE_RISK.length;
  const otdProjected = ((totalWO - otdRisk) / totalWO) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Shift Handoff Banner — addresses JD requirement: "Ensuring priorities are continued through 2nd shift" */}
      <div style={{
        background: `linear-gradient(90deg, rgba(255,107,53,0.08), rgba(255,107,53,0.02))`,
        border: `1px solid ${COLOR.border}`,
        borderLeft: `3px solid ${COLOR.accent}`,
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: '180px 1fr 200px',
        gap: 18,
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 9.5, color: COLOR.accent, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em', fontWeight: 700 }}>SHIFT 1 → SHIFT 2 HANDOFF</div>
          <div style={{ fontSize: 10, color: COLOR.dim, fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>15:00 PACIFIC · 4 PRIORITY ITEMS</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: COLOR.text, lineHeight: 1.5 }}>
            <span style={{ color: COLOR.red, fontFamily: 'ui-monospace, monospace', fontSize: 9.5, marginRight: 6 }}>① CRIT</span>
            <strong>WO-24881</strong> tank mount bracket — 92% schedule risk, M-302 in setup. Run plan ready, FAI buyoff staged with QE on call.
          </div>
          <div style={{ fontSize: 11, color: COLOR.text, lineHeight: 1.5 }}>
            <span style={{ color: COLOR.accent, fontFamily: 'ui-monospace, monospace', fontSize: 9.5, marginRight: 6 }}>② HIGH</span>
            <strong>WO-24996</strong> walk-in fixture — internal customer, due in 1 day, M-202 cleared 18:00, programs released.
          </div>
          <div style={{ fontSize: 11, color: COLOR.text, lineHeight: 1.5 }}>
            <span style={{ color: COLOR.amber, fontFamily: 'ui-monospace, monospace', fontSize: 9.5, marginRight: 6 }}>③ WATCH</span>
            <strong>M-302 tooling</strong> — 3rd recurrence on Ø1.250 bore. New tool change interval in effect this shift, log first-piece on every run.
          </div>
          <div style={{ fontSize: 11, color: COLOR.text, lineHeight: 1.5 }}>
            <span style={{ color: COLOR.amber, fontFamily: 'ui-monospace, monospace', fontSize: 9.5, marginRight: 6 }}>④ INFO</span>
            <strong>Cert anodize</strong> renewal at 31d — supplier surveillance call scheduled with quality.
          </div>
        </div>
        <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: COLOR.dim, lineHeight: 1.6 }}>
          <div>HANDOFF FROM <span style={{ color: COLOR.text }}>SECTION MGR · SHIFT 1</span></div>
          <div style={{ marginTop: 2 }}>HANDOFF TO <span style={{ color: COLOR.accent }}>P. DESTIN · SHIFT 2 LEAD</span></div>
          <div style={{ marginTop: 6, padding: '4px 8px', background: COLOR.bg, border: `1px solid ${COLOR.border}`, color: COLOR.green, textAlign: 'center', fontSize: 9.5 }}>● ACK & CONTINUE</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        <KpiCard label="Fleet OEE"        value={(fleetOEE * 100).toFixed(1)} unit="%"   sub="A·P·Q · 7-machine avg" trend={-1.4} status="warn" icon={Gauge}/>
        <KpiCard label="Throughput 14d"   value={totalThroughput.toLocaleString()} unit="units" sub="vs 2,030 plan" trend={-2.3} status="warn" icon={Activity}/>
        <KpiCard label="First-Pass Yield" value={avgFPY.toFixed(1)} unit="%"   sub="target 95% · gap 4.2pts" trend={-0.8} status="warn" icon={CheckCircle2}/>
        <KpiCard label="On-Time Delivery" value={otdProjected.toFixed(0)} unit="%" sub={`${otdRisk} of ${totalWO} WOs at risk`} status={otdProjected < 80 ? 'bad' : 'warn'} icon={Clock}/>
        <KpiCard label="Cost of Quality"  value={`$${((scrapCost + reworkCost) / 1000).toFixed(1)}k`} sub={`Scrap $${(scrapCost/1000).toFixed(1)}k · Rework $${(reworkCost/1000).toFixed(1)}k`} trend={8.2} status="bad" icon={AlertOctagon}/>
        <KpiCard label="Active WIP $"     value={`$${(SCHEDULE_RISK.reduce((s,w)=>s+w.value,0)/1000).toFixed(0)}k`} sub={`${SCHEDULE_RISK.length} work orders`} status="good" icon={Package}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        <Panel title="Throughput vs Plan · 14-day rolling" subtitle="UNITS COMPLETED // SHIFT-LEVEL ROLL-UP">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={THROUGHPUT_TREND}>
              <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4" vertical={false}/>
              <XAxis dataKey="day" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} tickLine={false} axisLine={{ stroke: COLOR.border }}/>
              <YAxis stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} tickLine={false} axisLine={{ stroke: COLOR.border }}/>
              <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}/>
              <ReferenceLine y={145} stroke={COLOR.amber} strokeDasharray="4 4" label={{ value: 'PLAN 145', fill: COLOR.amber, fontSize: 9, position: 'right' }}/>
              <Bar dataKey="actual" fill={COLOR.accent} fillOpacity={0.85} barSize={14}/>
              <Line type="monotone" dataKey="sevenDayAvg" stroke={COLOR.blue} strokeWidth={2} dot={false} name="7-day avg"/>
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top Constraints · Last 30d" subtitle="DOWNTIME PARETO BY REASON CODE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DOWNTIME_REASONS.slice(0, 6).map((r, i) => {
              const max = DOWNTIME_REASONS[0].minutes;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'ui-monospace, monospace', marginBottom: 3 }}>
                    <span style={{ color: COLOR.text }}>{r.reason}</span>
                    <span style={{ color: COLOR.dim }}>{(r.minutes / 60).toFixed(1)}h {r.actionable && <span style={{ color: COLOR.accent, marginLeft: 4 }}>●</span>}</span>
                  </div>
                  <div style={{ height: 6, background: COLOR.bg, position: 'relative' }}>
                    <div style={{ width: `${(r.minutes / max) * 100}%`, height: '100%', background: r.color }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 9.5, color: COLOR.dim, marginTop: 6, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}>
              <span style={{ color: COLOR.accent }}>●</span> ACTIONABLE — addressable via process / SMED / Kaizen
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Event Response Team · Open CAPA / 8D Prompts" subtitle="CLOSED-LOOP CORRECTIVE ACTION QUEUE — RANKED BY $ IMPACT × RECURRENCE" action={<StatusPill status="HIGH">{CAPA_PROMPTS.length} OPEN</StatusPill>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CAPA_PROMPTS.map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 220px', gap: 14, padding: '10px 12px', background: COLOR.panel2, border: `1px solid ${COLOR.border}`, borderLeft: `3px solid ${p.severity === 'CRITICAL' ? COLOR.red : p.severity === 'HIGH' ? COLOR.accent : COLOR.amber}` }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: COLOR.dim, letterSpacing: '0.1em' }}>{p.id}</div>
                <div style={{ marginTop: 4 }}><StatusPill status={p.severity}/></div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: COLOR.text, marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: COLOR.dim, lineHeight: 1.5, marginBottom: 6 }}>{p.detail}</div>
                <div style={{ fontSize: 11, color: COLOR.text, lineHeight: 1.5 }}>
                  <span style={{ color: COLOR.accent, fontFamily: 'ui-monospace, monospace', fontSize: 9.5, letterSpacing: '0.1em', marginRight: 6 }}>ACTION ▸</span>
                  {p.action}
                </div>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: COLOR.dim }}>
                <div>PROGRAM <span style={{ color: COLOR.text, marginLeft: 4 }}>{p.program}</span></div>
                <div style={{ marginTop: 4 }}>OWNER <span style={{ color: COLOR.text, marginLeft: 4 }}>{p.owner}</span></div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

// ============================================================================
// TAB: MACHINE PERFORMANCE
// ============================================================================
const MachineTab = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Panel title="Fleet Performance Matrix" subtitle="OEE COMPONENTS · UTILIZATION · CELL · OPERATOR CERT TIER">
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, fontFamily: 'ui-monospace, monospace' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.dim, fontSize: 10, letterSpacing: '0.08em' }}>
                {['MACHINE', 'TYPE', 'CELL', 'AVAIL', 'PERF', 'QUAL', 'OEE', 'UTIL', 'CAPABILITY', 'OP CERT'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MACHINE_PERF.map(m => {
                const oeeColor = m.oee > 0.75 ? COLOR.green : m.oee > 0.6 ? COLOR.amber : COLOR.red;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.text }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{m.id}</td>
                    <td style={{ padding: '10px', color: COLOR.dim }}>{m.type}</td>
                    <td style={{ padding: '10px' }}>{m.cell}</td>
                    <td style={{ padding: '10px' }}>{(m.availability * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px' }}>{(m.performance * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px' }}>{(m.quality * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px', color: oeeColor, fontWeight: 700 }}>{(m.oee * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 4, background: COLOR.bg }}>
                          <div style={{ width: `${m.utilization * 100}%`, height: '100%', background: oeeColor }}/>
                        </div>
                        <span style={{ fontSize: 10, color: COLOR.dim }}>{(m.utilization * 100).toFixed(0)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px', color: COLOR.dim, fontSize: 10.5 }}>{m.capability}</td>
                    <td style={{ padding: '10px', color: COLOR.dim }}>{m.operator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="TOC Bottleneck Identification" subtitle="QUEUE + DUE-DATE PRESSURE + UTILIZATION COMPOSITE — NOT NAIVE THROUGHPUT">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4"/>
              <XAxis type="number" dataKey="queueHours" name="Queue (hrs)" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} label={{ value: 'QUEUE HRS →', position: 'bottom', fill: COLOR.dim, fontSize: 9, offset: -5 }}/>
              <YAxis type="number" dataKey="oee" domain={[0.4, 1]} name="OEE" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} tickFormatter={v => `${(v*100).toFixed(0)}%`} label={{ value: 'OEE', angle: -90, position: 'insideLeft', fill: COLOR.dim, fontSize: 9 }}/>
              <ZAxis type="number" dataKey="dueDateRisk" range={[80, 600]} name="due risk"/>
              <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }} formatter={(v, n) => n === 'OEE' ? `${(v*100).toFixed(1)}%` : n === 'due risk' ? `${(v*100).toFixed(0)}%` : v}/>
              <Scatter data={BOTTLENECK_DATA}>
                {BOTTLENECK_DATA.map((d, i) => (
                  <Cell key={i} fill={d.bottleneckScore > 0.6 ? COLOR.red : d.bottleneckScore > 0.45 ? COLOR.accent : COLOR.green}/>
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10, color: COLOR.dim, fontFamily: 'ui-monospace, monospace', marginTop: 4, lineHeight: 1.6 }}>
            BUBBLE SIZE = DUE-DATE PRESSURE · TOP-LEFT QUADRANT = SYSTEM CONSTRAINT<br/>
            <span style={{ color: COLOR.red }}>● M-302</span> at 62 hr queue + 58% OEE + 92% due-date pressure → <span style={{ color: COLOR.text }}>active bottleneck</span>
          </div>
        </Panel>

        <Panel title="Setup Time Reduction · SMED Progress" subtitle="CURRENT MIN VS BASELINE · 30% TARGET DELTA">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={SETUP_TIME} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4" horizontal={false}/>
              <XAxis type="number" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} unit="m"/>
              <YAxis type="category" dataKey="machine" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} width={50}/>
              <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}/>
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}/>
              <Bar dataKey="baseline" fill={COLOR.dim} fillOpacity={0.4} name="Baseline"/>
              <Bar dataKey="current"  fill={COLOR.accent} name="Current"/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Downtime Reasons · Pareto with Actionable Flag" subtitle="LAST 30 DAYS · MINUTES BY REASON CODE">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DOWNTIME_REASONS}>
            <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4" vertical={false}/>
            <XAxis dataKey="reason" stroke={COLOR.dim} style={{ fontSize: 9.5, fontFamily: 'ui-monospace, monospace' }} angle={-15} textAnchor="end" height={70}/>
            <YAxis stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} unit="m"/>
            <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}/>
            <Bar dataKey="minutes">
              {DOWNTIME_REASONS.map((r, i) => <Cell key={i} fill={r.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
};

// ============================================================================
// TAB: QUALITY & TRACEABILITY
// ============================================================================
const QualityTab = () => {
  const totalScrap = NCR_LOG.filter(n => n.disposition === 'Scrap').length;
  const totalRework = NCR_LOG.filter(n => n.disposition === 'Rework').length;
  const totalMRB = NCR_LOG.filter(n => n.disposition.includes('MRB') || n.disposition.includes('Use-As-Is')).length;
  const scrapRate = (totalScrap / 100 * 100).toFixed(2); // synthetic — assume ~100 lots
  const reworkRate = (totalRework / 100 * 100).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <KpiCard label="First-Pass Yield"   value="89.4" unit="%"  sub="target 95% · gap 5.6pts" status="warn" icon={CheckCircle2}/>
        <KpiCard label="Scrap Rate"         value={scrapRate} unit="%"  sub={`${totalScrap} scrap dispositions / 30d`} status="bad" icon={XCircle}/>
        <KpiCard label="Rework Rate"        value={reworkRate} unit="%" sub={`${totalRework} rework dispositions / 30d`} status="warn" icon={Wrench}/>
        <KpiCard label="MRB Open"           value={totalMRB} sub="Material Review Board cycle time avg 4.2 days" status="warn" icon={Shield}/>
        <KpiCard label="FAI Compliance"     value="100" unit="%"   sub="AS9102 first articles · all WOs current" status="good" icon={FileText}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14 }}>
        <Panel title="Defect Pareto · 30-day rollup" subtitle="DEFECT CODE × COUNT · 80/20 ANALYSIS">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={DEFECT_PARETO} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4" horizontal={false}/>
              <XAxis type="number" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}/>
              <YAxis type="category" dataKey="code" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} width={120}/>
              <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}/>
              <Bar dataKey="count" fill={COLOR.accent}>
                {DEFECT_PARETO.map((_, i) => <Cell key={i} fill={i < 3 ? COLOR.red : i < 5 ? COLOR.accent : COLOR.amber} fillOpacity={0.85 - i * 0.07}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10.5, color: COLOR.dim, fontFamily: 'ui-monospace, monospace', marginTop: 6, lineHeight: 1.6, padding: '8px 10px', background: COLOR.panel2, border: `1px solid ${COLOR.border}` }}>
            <span style={{ color: COLOR.accent }}>▸ </span>
            TOP 3 DEFECT CODES = 66% OF NCR VOLUME · KAIZEN FOCUS = SURFACE FINISH + DIMENSIONAL TP
          </div>
        </Panel>

        <Panel title="NCR Log · Recent Non-Conformances" subtitle="AS9100D 8.7 · CONTROL OF NONCONFORMING OUTPUTS · TRACEABLE TO WO + LOT">
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, fontFamily: 'ui-monospace, monospace' }}>
              <thead style={{ position: 'sticky', top: 0, background: COLOR.panel }}>
                <tr style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.dim, fontSize: 9.5, letterSpacing: '0.08em' }}>
                  {['NCR', 'WO', 'DEFECT', 'DISP', 'COST', 'CAUSE'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NCR_LOG.map(n => (
                  <tr key={n.id} style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.text }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{n.id}</td>
                    <td style={{ padding: '8px 6px', color: COLOR.dim }}>{n.wo}</td>
                    <td style={{ padding: '8px 6px' }}>{n.defect}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <StatusPill status={n.disposition === 'Scrap' ? 'CRITICAL' : n.disposition === 'Rework' ? 'HIGH' : 'MEDIUM'}>{n.disposition}</StatusPill>
                    </td>
                    <td style={{ padding: '8px 6px', color: n.cost > 10000 ? COLOR.red : COLOR.dim }}>{n.cost > 0 ? `$${(n.cost/1000).toFixed(1)}k` : '—'}</td>
                    <td style={{ padding: '8px 6px', color: COLOR.dim, fontSize: 10 }}>{n.cause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Panel title="First-Pass Yield Trend · 14-day SPC View" subtitle="TARGET 95% · CONTROL LIMITS PENDING SPC IMPLEMENTATION">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={FPY_TREND}>
              <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4" vertical={false}/>
              <XAxis dataKey="day" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}/>
              <YAxis domain={[80, 100]} stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} unit="%"/>
              <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}/>
              <ReferenceLine y={95} stroke={COLOR.green} strokeDasharray="4 4" label={{ value: 'TGT 95%', fill: COLOR.green, fontSize: 9, position: 'right' }}/>
              <Line type="monotone" dataKey="fpy" stroke={COLOR.accent} strokeWidth={2.5} dot={{ fill: COLOR.accent, r: 3 }}/>
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Nadcap Special Process Status" subtitle="HEAT TREAT · NDT · CHEM PROCESSING — ACTIVE WO COVERAGE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { proc: 'Heat Treat (AMS 2750)',     activeWO: 4, supplier: 'Bodycote · Approved', status: 'GREEN', expiry: 'Cert valid 187d' },
              { proc: 'NDT Penetrant (AMS 2647)',   activeWO: 5, supplier: 'In-house L3 Cert',    status: 'GREEN', expiry: 'Cert valid 92d' },
              { proc: 'Chem Processing (Anodize)',  activeWO: 3, supplier: 'AAA Plating · Approved', status: 'AMBER', expiry: 'Cert renews 31d' },
              { proc: 'Welding (AWS D17.1)',         activeWO: 0, supplier: 'Pending program needs', status: 'GREEN', expiry: '—' },
            ].map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: COLOR.panel2, border: `1px solid ${COLOR.border}`, borderLeft: `3px solid ${p.status === 'GREEN' ? COLOR.green : p.status === 'AMBER' ? COLOR.amber : COLOR.red}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.text }}>{p.proc}</span>
                  <StatusPill status={p.status}/>
                </div>
                <div style={{ fontSize: 10, color: COLOR.dim, fontFamily: 'ui-monospace, monospace', marginTop: 4 }}>
                  {p.activeWO} ACTIVE · {p.supplier} · {p.expiry}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ============================================================================
// TAB: SCHEDULE & FLOW
// ============================================================================
const ScheduleTab = () => {
  const totalValue = SCHEDULE_RISK.reduce((s, w) => s + w.value, 0);
  const atRiskValue = SCHEDULE_RISK.filter(w => w.risk === 'RED').reduce((s, w) => s + w.value, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KpiCard label="Active Work Orders" value={SCHEDULE_RISK.length} sub="across 5 programs" status="good" icon={Layers}/>
        <KpiCard label="Total WIP Value"    value={`$${(totalValue/1000).toFixed(0)}k`} sub={`${SCHEDULE_RISK.reduce((s,w)=>s+w.remaining,0)} units remaining`} status="good" icon={Package}/>
        <KpiCard label="At-Risk WIP $"      value={`$${(atRiskValue/1000).toFixed(0)}k`} sub={`${((atRiskValue/totalValue)*100).toFixed(0)}% of WIP value`} status="bad" icon={AlertTriangle}/>
        <KpiCard label="Avg Queue Time"     value={(BOTTLENECK_DATA.reduce((s,m)=>s+m.queueHours,0)/BOTTLENECK_DATA.length).toFixed(1)} unit="hrs" sub="across 7 machines · M-302 highest" status="warn" icon={Clock}/>
      </div>

      <Panel title="Work Order Schedule Risk · Sorted by Composite Risk Score" subtitle="PROXIMITY × REMAINING QTY × MACHINE LOAD · TRACEABLE TO PROGRAM/PART">
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.dim, fontSize: 9.5, letterSpacing: '0.08em' }}>
                {['WO', 'PART / PROGRAM', 'MATERIAL', 'NADCAP', 'FAI', 'MACHINE', 'PROG×REM', 'DUE', 'VALUE', 'RISK'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 8px', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...SCHEDULE_RISK].sort((a,b) => b.riskScore - a.riskScore).map(w => (
                <tr key={w.wo} style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.text }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{w.wo}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ color: COLOR.text, fontSize: 11.5 }}>
                      {w.walkin && <span style={{ background: COLOR.accent, color: COLOR.bg, fontSize: 8.5, padding: '1px 5px', marginRight: 5, fontWeight: 700, letterSpacing: '0.08em' }}>WALK-IN</span>}
                      {w.part}
                    </div>
                    <div style={{ color: COLOR.dim, fontSize: 10, marginTop: 2 }}>{w.program} · <StatusPill status={w.priority}/></div>
                  </td>
                  <td style={{ padding: '10px 8px', color: COLOR.dim }}>{w.material}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {w.nadcap.map(n => (
                        <span key={n} style={{ fontSize: 9, padding: '1px 5px', background: COLOR.bg, border: `1px solid ${COLOR.border}`, color: COLOR.amber, letterSpacing: '0.05em' }}>{n}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', color: w.fai === 'Complete' ? COLOR.green : w.fai === 'In-Process' ? COLOR.amber : COLOR.red, fontSize: 10 }}>{w.fai}</td>
                  <td style={{ padding: '10px 8px', color: COLOR.dim }}>{w.machine}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 5, background: COLOR.bg }}>
                        <div style={{ width: `${(w.done / w.qty) * 100}%`, height: '100%', background: COLOR.blue }}/>
                      </div>
                      <span style={{ fontSize: 10, color: COLOR.dim }}>{w.done}/{w.qty}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', color: w.dueDays <= 3 ? COLOR.red : w.dueDays <= 7 ? COLOR.amber : COLOR.dim }}>{w.dueDays}d</td>
                  <td style={{ padding: '10px 8px', color: COLOR.text }}>${(w.value/1000).toFixed(0)}k</td>
                  <td style={{ padding: '10px 8px' }}><StatusPill status={w.risk}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="WIP by Cell · Queue Distribution" subtitle="HOURS OF WORK AHEAD OF EACH MACHINE">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={BOTTLENECK_DATA}>
              <CartesianGrid stroke={COLOR.border} strokeDasharray="2 4" vertical={false}/>
              <XAxis dataKey="id" stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}/>
              <YAxis stroke={COLOR.dim} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }} unit="h"/>
              <Tooltip contentStyle={{ background: COLOR.panel2, border: `1px solid ${COLOR.border}`, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}/>
              <ReferenceLine y={40} stroke={COLOR.amber} strokeDasharray="3 3" label={{ value: 'WARN 40h', fill: COLOR.amber, fontSize: 9, position: 'right' }}/>
              <Bar dataKey="queueHours">
                {BOTTLENECK_DATA.map((d, i) => <Cell key={i} fill={d.queueHours > 50 ? COLOR.red : d.queueHours > 30 ? COLOR.amber : COLOR.green} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="On-Time Delivery Forecast · Program Roll-up" subtitle="AT-RISK $ BY PROGRAM · NEXT 14 DAYS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              const byProg = {};
              SCHEDULE_RISK.forEach(w => {
                if (!byProg[w.program]) byProg[w.program] = { total: 0, atRisk: 0, count: 0 };
                byProg[w.program].total += w.value;
                byProg[w.program].count += 1;
                if (w.risk === 'RED') byProg[w.program].atRisk += w.value;
              });
              return Object.entries(byProg).map(([prog, d]) => {
                const pct = (d.atRisk / d.total) * 100;
                return (
                  <div key={prog} style={{ padding: '10px 12px', background: COLOR.panel2, border: `1px solid ${COLOR.border}`, borderLeft: `3px solid ${pct > 50 ? COLOR.red : pct > 0 ? COLOR.amber : COLOR.green}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.text, fontFamily: 'ui-monospace, monospace' }}>{prog}</span>
                      <span style={{ fontSize: 10, color: COLOR.dim, fontFamily: 'ui-monospace, monospace' }}>{d.count} WO · ${(d.total/1000).toFixed(0)}k WIP</span>
                    </div>
                    <div style={{ height: 6, background: COLOR.bg, position: 'relative' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct > 50 ? COLOR.red : COLOR.amber }}/>
                    </div>
                    <div style={{ fontSize: 10, color: COLOR.dim, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
                      {pct > 0 ? `${pct.toFixed(0)}% AT RISK · $${(d.atRisk/1000).toFixed(0)}k` : 'ALL GREEN'}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ============================================================================
// TAB: ARCHITECTURE & ROADMAP (Path B foundation)
// ============================================================================
const ArchitectureTab = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Panel title="System Architecture · Data Flow" subtitle="MACHINE LAYER → MES/ERP → KPI MODEL → DECISION LAYER">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 28px repeat(2, 1fr)', alignItems: 'stretch', gap: 8 }}>
        {[
          { tier: '01', title: 'MACHINE LAYER', items: ['MTConnect agents (CNC controllers)', 'OPC-UA for legacy equipment', 'Spindle load · cycle · alarm streams', 'Tool-life acoustic / vibration sensors'], color: COLOR.blue },
          { tier: '02', title: 'EXECUTION LAYER', items: ['MES (Solumina / Opcenter)', 'Work order routing + WIP', 'Operator clock-in / cert gate', 'Material lot & cert tracking'], color: COLOR.purple },
          { tier: '03', title: 'QUALITY LAYER',   items: ['CMM / inspection import', 'NCR · CAR · MRB workflow', 'AS9102 FAI digital records', 'Nadcap supplier surveillance'], color: COLOR.amber },
          { tier: '04', title: 'KPI MODEL',       items: ['SQL star schema', 'OEE · FPY · CoQ aggregates', 'TOC bottleneck composite', 'Risk scoring engine'], color: COLOR.accent },
        ].map((s, i) => (
          <div key={i} style={{ background: COLOR.panel, border: `1px solid ${COLOR.border}`, borderTop: `2px solid ${s.color}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: s.color, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}>TIER {s.tier}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.text, marginTop: 4, marginBottom: 10, letterSpacing: '0.02em' }}>{s.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.items.map((it, j) => (
                <div key={j} style={{ fontSize: 10.5, color: COLOR.dim, lineHeight: 1.5, fontFamily: 'ui-monospace, monospace' }}>▸ {it}</div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.accent }}>
          <ChevronRight size={28}/>
        </div>
        <div style={{ background: COLOR.panel, border: `1px solid ${COLOR.border}`, borderTop: `2px solid ${COLOR.green}`, padding: 14 }}>
          <div style={{ fontSize: 10, color: COLOR.green, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}>TIER 05</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.text, marginTop: 4, marginBottom: 10 }}>VISUALIZATION</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Power BI / Tableau dashboard', 'Role-based: ops / eng / leadership', 'Drill-through to NCR + WO detail', 'Mobile shop-floor view'].map((it,j) => (
              <div key={j} style={{ fontSize: 10.5, color: COLOR.dim, lineHeight: 1.5, fontFamily: 'ui-monospace, monospace' }}>▸ {it}</div>
            ))}
          </div>
        </div>
        <div style={{ background: COLOR.panel, border: `1px solid ${COLOR.border}`, borderTop: `2px solid ${COLOR.red}`, padding: 14 }}>
          <div style={{ fontSize: 10, color: COLOR.red, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}>TIER 06</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.text, marginTop: 4, marginBottom: 10 }}>DECISION / ACTION</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Predictive risk alerts', 'CAPA / 8D auto-generation', 'Constraint shift detection', 'Kaizen prompt engine'].map((it,j) => (
              <div key={j} style={{ fontSize: 10.5, color: COLOR.dim, lineHeight: 1.5, fontFamily: 'ui-monospace, monospace' }}>▸ {it}</div>
            ))}
          </div>
        </div>
      </div>
    </Panel>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Panel title="Phase Roadmap · Crawl → Walk → Run" subtitle="DESCRIPTIVE → DIAGNOSTIC → PREDICTIVE → PRESCRIPTIVE">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { phase: 'PHASE 1', title: 'Descriptive Visibility', dur: '0–60 days', color: COLOR.green, items: ['Connect MTConnect / OPC-UA agents', 'Stand up SQL KPI model + star schema', 'OEE / FPY / scrap dashboards live', 'Daily standup-ready exec view'] },
            { phase: 'PHASE 2', title: 'Diagnostic + Lean', dur: '60–120 days', color: COLOR.amber, items: ['SMED-driven setup reduction (target 30%)', 'TOC bottleneck identification active', 'CAPA auto-prompts on recurrence', 'NCR Pareto-driven Kaizen events'] },
            { phase: 'PHASE 3', title: 'Predictive', dur: '120–240 days', color: COLOR.accent, items: ['Trend alerts (rolling avg + thresholds)', 'Tool-life acoustic monitoring', 'Order risk scoring (due-date / load)', 'Constraint shift detection week-over-week'] },
            { phase: 'PHASE 4', title: 'Prescriptive', dur: '240+ days', color: COLOR.red, items: ['ML-driven scrap root-cause inference', 'Optimal dispatch recommendation engine', 'Cross-program load balancing', 'Supplier risk model (Nadcap drift)'] },
          ].map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, padding: '12px 14px', background: COLOR.panel2, border: `1px solid ${COLOR.border}`, borderLeft: `3px solid ${p.color}` }}>
              <div>
                <div style={{ fontSize: 10, color: p.color, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.12em', fontWeight: 700 }}>{p.phase}</div>
                <div style={{ fontSize: 10, color: COLOR.dim, fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>{p.dur}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.text, marginBottom: 4 }}>{p.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {p.items.map((it,j) => <div key={j} style={{ fontSize: 10.5, color: COLOR.dim, fontFamily: 'ui-monospace, monospace' }}>▸ {it}</div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="ITAR / CUI Deployment Considerations" subtitle="WHY THIS WORKS IN A DEFENSE / SPACE PRIME ENVIRONMENT">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { title: 'On-prem first', body: 'Architecture deploys on-prem (SQL Server / on-prem Power BI Report Server) for ITAR/CUI/classified programs. No cloud dependency required.' },
            { title: 'Air-gap compatible', body: 'Machine data agents push to local data diode where required. No external telemetry. Designed for closed-network shop floors.' },
            { title: 'CMMC 2.0 alignment', body: 'Role-based access control mapped to operator / engineer / quality / leadership tiers. Audit log of every disposition and action.' },
            { title: 'Configuration control', body: 'KPI definitions and risk thresholds versioned. Drift in calculation logic itself is auditable — important for AS9100 8.5.2 traceability.' },
            { title: 'Existing ecosystem fit', body: 'Integrates with Solumina / Opcenter / SAP / Teamcenter rather than replacing. Designed as an analytical overlay, not a rip-and-replace MES.' },
          ].map((c, i) => (
            <div key={i} style={{ padding: '10px 12px', background: COLOR.panel2, border: `1px solid ${COLOR.border}` }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.accent, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 10.5, color: COLOR.dim, lineHeight: 1.6 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================
const TABS = [
  { id: 'exec',     label: 'EXECUTIVE',      sub: 'OEE · OTD · CoQ',           icon: Target },
  { id: 'machine',  label: 'MACHINE PERF',   sub: 'Fleet · TOC · SMED',        icon: Gauge },
  { id: 'quality',  label: 'QUALITY',        sub: 'NCR · FPY · Nadcap · FAI',  icon: Shield },
  { id: 'schedule', label: 'SCHEDULE & FLOW',sub: 'WIP · OTD · risk',          icon: Clock },
  { id: 'arch',     label: 'ARCHITECTURE',   sub: 'Roadmap · ITAR · phase',    icon: Layers },
];

export default function Dashboard() {
  const [tab, setTab] = useState('exec');
  const now = new Date();
  const stamp = `${now.toISOString().slice(0,10)} · ${now.toTimeString().slice(0,8)} LOCAL`;

  return (
    <div style={{
      background: COLOR.bg,
      minHeight: '100vh',
      color: COLOR.text,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: 0,
      backgroundImage: `radial-gradient(circle at 0% 0%, rgba(255,107,53,0.04) 0%, transparent 35%), radial-gradient(circle at 100% 100%, rgba(88,166,255,0.04) 0%, transparent 35%)`,
    }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLOR.border}`, padding: '16px 28px', background: 'rgba(15,22,32,0.6)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, background: COLOR.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: 'polygon(20% 0, 100% 0, 80% 100%, 0 100%)' }}>
              <Zap size={18} color={COLOR.bg} strokeWidth={2.5}/>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
                CALIPER<span style={{ color: COLOR.accent }}>/</span>OPS
              </div>
              <div style={{ fontSize: 10, color: COLOR.dim, fontFamily: 'ui-monospace, "JetBrains Mono", monospace', letterSpacing: '0.1em', marginTop: 1 }}>
                SPACE MFG · MACHINING & FAB · METRICS-BASED MANAGEMENT · AS9100D · NADCAP
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: 10.5, color: COLOR.dim, letterSpacing: '0.05em' }}>
            <div><span style={{ color: COLOR.green }}>●</span> 7 MACHINES ONLINE</div>
            <div><span style={{ color: COLOR.amber }}>●</span> 2 ALERTS</div>
            <div>SHIFT 1 · {stamp}</div>
            <div style={{ padding: '4px 10px', border: `1px solid ${COLOR.border}`, fontSize: 9.5, color: COLOR.text }}>SYNTHETIC DATA · DEMO BUILD</div>
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ borderBottom: `1px solid ${COLOR.border}`, padding: '0 28px', display: 'flex', gap: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'transparent',
              border: 'none',
              borderBottom: active ? `2px solid ${COLOR.accent}` : '2px solid transparent',
              color: active ? COLOR.text : COLOR.dim,
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.15s',
            }}>
              <Icon size={14}/>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>{t.label}</div>
                <div style={{ fontSize: 9, color: COLOR.dim, fontFamily: 'ui-monospace, monospace', marginTop: 1, letterSpacing: '0.05em' }}>{t.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px' }}>
        {tab === 'exec'     && <ExecutiveTab/>}
        {tab === 'machine'  && <MachineTab/>}
        {tab === 'quality'  && <QualityTab/>}
        {tab === 'schedule' && <ScheduleTab/>}
        {tab === 'arch'     && <ArchitectureTab/>}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${COLOR.border}`, padding: '14px 28px', display: 'flex', justifyContent: 'space-between', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: 9.5, color: COLOR.dim, letterSpacing: '0.05em' }}>
        <div>CALIPER/OPS · v0.1 MVP · DEMO BUILD FOR R10226281 · MGR ENG TECH SUPPORT 1 · MACHINING</div>
        <div>DATA MODEL: PRODUCTION_DATA · MACHINE_INFO · DOWNTIME_LOG · QUALITY_LOG · WO_LOG · NCR_LOG</div>
      </div>
    </div>
  );
}
