import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Routes, Route } from "react-router-dom";
import {
  StatCard,
  SectionHeader,
  FLProgressChart,
  TrustScoreBar,
  HospitalComparisonChart,
  Skeleton,
} from "../components/charts/Charts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  federatedAPI,
  alertsAPI,
  hospitalsAPI,
  analyticsAPI,
} from "../utils/api";
import IndiaHealthMap from "../components/admin/IndiaHealthMap";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

// ─── Federated Learning Panel ─────────────────────────────────────────────────
const FederatedPanel = () => {
  const [status, setStatus] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [trustScores, setTrustScores] = useState({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    Promise.all([
      federatedAPI
        .status()
        .catch(() => ({ current_round: 15, status: "completed" })),
      federatedAPI.rounds().catch(() => ({ rounds: [] })),
      federatedAPI.trustScores().catch(() => ({ trust_scores: {} })),
    ]).then(([s, r, t]) => {
      setStatus(s);
      setRounds(r.rounds || []);
      setTrustScores(t.trust_scores || {});
    });
  }, []);

  const triggerRound = async () => {
    setRunning(true);
    await federatedAPI.triggerRound().catch(() => {});
    setTimeout(async () => {
      const s = await federatedAPI.status().catch(() => null);
      if (s) setStatus(s);
      setRunning(false);
    }, 3500);
  };

  const sortedTrust = Object.entries(trustScores).sort(
    ([, a], [, b]) =>
      (typeof b === "object" ? b.trust_score : b) -
      (typeof a === "object" ? a.trust_score : a),
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <SectionHeader
        title="Federated Learning"
        subtitle="Hierarchical FL system — Hospital → State → National"
        action={
          <motion.button
            onClick={triggerRound}
            disabled={running}
            className="btn-primary text-xs"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {running ? "⏳ Running..." : "▶ Trigger FL Round"}
          </motion.button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Rounds"
          value={status?.current_round || 15}
          icon="🔄"
          color="#00d4ff"
        />
        <StatCard title="Hospitals" value={4} icon="🏥" color="#00ff87" />
        <StatCard
          title="Diseases Trained"
          value={3}
          icon="🧬"
          color="#a78bfa"
        />
        <StatCard
          title="Status"
          value={status?.status === "completed" ? "Done" : "Running"}
          icon="✓"
          color={status?.status === "completed" ? "#00e676" : "#ffc93c"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* FL Progress Chart */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Training Progress
          </h3>
          <FLProgressChart data={rounds} />
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-xs text-blue-300/50">Accuracy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: "#ff7a2e" }}
              />
              <span className="text-xs text-blue-300/50">Loss</span>
            </div>
          </div>
        </div>

        {/* Trust Scores */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            🛡️ Hospital Trust Scores
          </h3>
          {sortedTrust.map(([hospital, data], i) => {
            const score = typeof data === "object" ? data.trust_score : data;
            return (
              <TrustScoreBar
                key={hospital}
                hospital={hospital}
                score={score}
                rank={i + 1}
              />
            );
          })}
          {sortedTrust.length === 0 &&
            [
              ["Apollo_Private_Hospital", 0.92],
              ["AIIMS_Government_Hospital", 0.88],
              ["Fortis_National_Hospital", 0.85],
              ["District_Rural_Hospital", 0.75],
            ].map(([h, s], i) => (
              <TrustScoreBar key={h} hospital={h} score={s} rank={i + 1} />
            ))}
        </div>
      </div>

      {/* Hierarchical visualization */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          🌐 Hierarchical FL Architecture
        </h3>
        <div className="flex flex-col items-center gap-4 py-4">
          {/* National */}
          <div
            className="px-8 py-3 rounded-2xl text-center"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.3)",
            }}
          >
            <div className="text-cyan-400 font-bold text-sm">
              🌍 National Server
            </div>
            <div className="text-xs text-blue-300/50 mt-0.5">
              Global Model Aggregation
            </div>
          </div>
          <div className="flex gap-16 items-start">
            <div
              className="w-px h-8"
              style={{ background: "rgba(0,212,255,0.3)" }}
            />
          </div>
          {/* States */}
          <div className="flex gap-6">
            {[
              ["Telangana", "#00d4ff"],
              ["Delhi", "#00ff87"],
              ["Punjab", "#a78bfa"],
              ["Bihar", "#ffd700"],
            ].map(([state, color]) => (
              <div key={state} className="text-center">
                <div
                  className="px-4 py-2 rounded-xl"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color }}>
                    {state}
                  </div>
                  <div className="text-xs text-blue-300/30">State Node</div>
                </div>
              </div>
            ))}
          </div>
          {/* Hospitals */}
          <div className="flex gap-4">
            {["Apollo", "AIIMS", "Fortis", "District"].map((h) => (
              <div key={h} className="text-center">
                <div
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-secondary)",
                  }}
                >
                  🏥 {h}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────
const AuditLogs = () => {
  const SAMPLE_LOGS = [
    {
      audit_id: "AUD001",
      user_id: "admin_001",
      user_role: "admin",
      action: "viewed_patient_records",
      resource: "patients",
      hospital_id: "Apollo_Private_Hospital",
      details: "Accessed 50 patient records",
      ip_address: "192.168.1.100",
      timestamp: new Date().toISOString(),
    },
    {
      audit_id: "AUD002",
      user_id: "DOC001",
      user_role: "doctor",
      action: "ran_prediction",
      resource: "predictions",
      hospital_id: "Apollo_Private_Hospital",
      details: "Diabetes prediction for PAT000001",
      ip_address: "192.168.1.105",
      timestamp: new Date().toISOString(),
    },
    {
      audit_id: "AUD003",
      user_id: "NUR001",
      user_role: "nurse",
      action: "entered_vitals",
      resource: "vitals",
      hospital_id: "Apollo_Private_Hospital",
      details: "Vitals recorded for PAT000002",
      ip_address: "192.168.1.110",
      timestamp: new Date().toISOString(),
    },
    {
      audit_id: "AUD004",
      user_id: "DOC002",
      user_role: "doctor",
      action: "acknowledged_alert",
      resource: "alerts",
      hospital_id: "AIIMS_Government_Hospital",
      details: "Alert ALT002 acknowledged",
      ip_address: "10.0.0.52",
      timestamp: new Date().toISOString(),
    },
    {
      audit_id: "AUD005",
      user_id: "admin_001",
      user_role: "admin",
      action: "triggered_fl_round",
      resource: "federated",
      hospital_id: "ALL",
      details: "FL Round 16 triggered manually",
      ip_address: "192.168.1.100",
      timestamp: new Date().toISOString(),
    },
  ];

  const roleColors = {
    admin: "#ffd700",
    doctor: "#00d4ff",
    nurse: "#00ff87",
    head_doctor: "#a78bfa",
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <SectionHeader
        title="Audit Logs"
        subtitle="Complete activity trail across all NFHIS operations"
      />
      <div className="glass rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Hospital</th>
                <th>Details</th>
                <th>IP</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LOGS.map((log) => (
                <tr key={log.audit_id}>
                  <td>
                    <span className="font-mono text-xs text-cyan-400">
                      {log.audit_id}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{log.user_id}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${roleColors[log.user_role]}15`,
                        color: roleColors[log.user_role],
                        border: `1px solid ${roleColors[log.user_role]}30`,
                      }}
                    >
                      {log.user_role}
                    </span>
                  </td>
                  <td className="text-xs">{log.action.replace(/_/g, " ")}</td>
                  <td>
                    <span className="badge badge-info">{log.resource}</span>
                  </td>
                  <td className="text-xs">
                    {log.hospital_id?.replace(/_/g, " ")}
                  </td>
                  <td className="text-xs max-w-xs truncate">{log.details}</td>
                  <td className="font-mono text-xs">{log.ip_address}</td>
                  <td className="font-mono text-xs text-blue-300/40">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Anomaly Detection ────────────────────────────────────────────────────────
const AnomalyDetection = () => {
  const anomalies = [
    {
      id: 1,
      hospital: "District_Rural_Hospital",
      type: "Data Quality",
      description:
        "Unusually high proportion of missing values in lab fields (>15%)",
      severity: "medium",
      detected_at: new Date().toISOString(),
      status: "investigating",
    },
    {
      id: 2,
      hospital: "Apollo_Private_Hospital",
      type: "Model Drift",
      description:
        "Doctor negligence pattern: 2 critical alerts ignored within 7-day window",
      severity: "high",
      detected_at: new Date().toISOString(),
      status: "active",
    },
    {
      id: 3,
      hospital: "AIIMS_Government_Hospital",
      type: "Weight Anomaly",
      description:
        "FL Round 12: model weights deviated >15% from expected distribution",
      severity: "low",
      detected_at: new Date().toISOString(),
      status: "resolved",
    },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <SectionHeader
        title="Anomaly Detection"
        subtitle="Automated monitoring for data, model, and behavioral anomalies"
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Active Anomalies"
          value={anomalies.filter((a) => a.status === "active").length}
          icon="🔍"
          color="#ff3b5c"
        />
        <StatCard
          title="Investigating"
          value={anomalies.filter((a) => a.status === "investigating").length}
          icon="🔎"
          color="#ffc93c"
        />
        <StatCard
          title="Resolved"
          value={anomalies.filter((a) => a.status === "resolved").length}
          icon="✓"
          color="#00e676"
        />
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Detected Anomalies
        </h3>
        {anomalies.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl mb-3"
            style={{
              background:
                a.severity === "high"
                  ? "rgba(255,59,92,0.07)"
                  : a.severity === "medium"
                    ? "rgba(255,201,60,0.07)"
                    : "rgba(0,212,255,0.05)",
              border: `1px solid ${a.severity === "high" ? "rgba(255,59,92,0.2)" : a.severity === "medium" ? "rgba(255,201,60,0.2)" : "rgba(0,212,255,0.15)"}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`badge badge-${a.severity === "high" ? "critical" : a.severity === "medium" ? "medium" : "info"}`}
                  >
                    {a.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {a.type}
                  </span>
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {a.description}
                </div>
                <div className="text-xs mt-1.5 text-blue-300/40">
                  Hospital: {a.hospital.replace(/_/g, " ")}
                </div>
              </div>
              <span
                className={`badge flex-shrink-0 ml-4 ${a.status === "resolved" ? "badge-low" : a.status === "active" ? "badge-critical" : "badge-medium"}`}
              >
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Hospital Analytics Data ──────────────────────────────────────────────────
const HOSPITAL_ANALYTICS = [
  {
    id: "Apollo_Private_Hospital",
    name: "Apollo Private Hospital",
    type: "Private",
    state: "Telangana",
    city: "Hyderabad",
    trust_score: 0.92,
    total_patients: 800,
    doctors: 45,
    nurses: 120,
    fl_participation: 15,
    specialties: ["Cardiology", "Endocrinology"],
    analytics: {
      critical: 34,
      stable: 512,
      recovering: 198,
      discharged_today: 56,
      admitted_today: 43,
      icu_occupied: 28,
      icu_total: 40,
      ot_scheduled: 7,
      avg_stay_days: 4.2,
      bed_occupancy: 78,
      active_alerts: 3,
      resolved_alerts: 21,
      predictions_today: 112,
      disease_breakdown: [
        { name: "Diabetes", count: 210, color: "#00d4ff" },
        { name: "Hypertension", count: 175, color: "#a78bfa" },
        { name: "Pneumonia", count: 98, color: "#ff7a2e" },
        { name: "Other", count: 317, color: "#00ff87" },
      ],
    },
  },
  {
    id: "AIIMS_Government_Hospital",
    name: "AIIMS Government Hospital",
    type: "Government",
    state: "Delhi",
    city: "New Delhi",
    trust_score: 0.88,
    total_patients: 1200,
    doctors: 200,
    nurses: 450,
    fl_participation: 14,
    specialties: ["All Specialties"],
    analytics: {
      critical: 87,
      stable: 720,
      recovering: 310,
      discharged_today: 93,
      admitted_today: 78,
      icu_occupied: 65,
      icu_total: 80,
      ot_scheduled: 14,
      avg_stay_days: 5.8,
      bed_occupancy: 91,
      active_alerts: 7,
      resolved_alerts: 45,
      predictions_today: 198,
      disease_breakdown: [
        { name: "Diabetes", count: 340, color: "#00d4ff" },
        { name: "Hypertension", count: 290, color: "#a78bfa" },
        { name: "Pneumonia", count: 210, color: "#ff7a2e" },
        { name: "Other", count: 360, color: "#00ff87" },
      ],
    },
  },
  {
    id: "Fortis_National_Hospital",
    name: "Fortis National Hospital",
    type: "Private",
    state: "Punjab",
    city: "Chandigarh",
    trust_score: 0.85,
    total_patients: 600,
    doctors: 80,
    nurses: 190,
    fl_participation: 13,
    specialties: ["Cardiology", "Neurology"],
    analytics: {
      critical: 22,
      stable: 380,
      recovering: 155,
      discharged_today: 41,
      admitted_today: 35,
      icu_occupied: 18,
      icu_total: 30,
      ot_scheduled: 9,
      avg_stay_days: 3.9,
      bed_occupancy: 72,
      active_alerts: 2,
      resolved_alerts: 18,
      predictions_today: 88,
      disease_breakdown: [
        { name: "Cardiac", count: 195, color: "#ff3b5c" },
        { name: "Neuro", count: 148, color: "#a78bfa" },
        { name: "Diabetes", count: 112, color: "#00d4ff" },
        { name: "Other", count: 145, color: "#00ff87" },
      ],
    },
  },
  {
    id: "District_Rural_Hospital",
    name: "District Rural Hospital",
    type: "Government",
    state: "Bihar",
    city: "Patna",
    trust_score: 0.75,
    total_patients: 1000,
    doctors: 12,
    nurses: 38,
    fl_participation: 11,
    specialties: ["General Medicine"],
    analytics: {
      critical: 61,
      stable: 598,
      recovering: 278,
      discharged_today: 72,
      admitted_today: 89,
      icu_occupied: 11,
      icu_total: 12,
      ot_scheduled: 3,
      avg_stay_days: 6.1,
      bed_occupancy: 95,
      active_alerts: 9,
      resolved_alerts: 14,
      predictions_today: 67,
      disease_breakdown: [
        { name: "Malaria", count: 280, color: "#ffd700" },
        { name: "Typhoid", count: 195, color: "#ff7a2e" },
        { name: "Diabetes", count: 160, color: "#00d4ff" },
        { name: "Other", count: 365, color: "#00ff87" },
      ],
    },
  },
];

// ─── Hospital Analytics Drawer ────────────────────────────────────────────────
const HospitalAnalyticsDrawer = ({ hospital, onClose }) => {
  const a = hospital.analytics;
  const tierColor = hospital.type === "Private" ? "#00d4ff" : "#00ff87";

  const StatMini = ({ label, value, color = "white", sub }) => (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-xs font-medium text-white/70 mt-0.5">{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3 }}
      className="mt-4 rounded-2xl p-5"
      style={{
        background: "rgba(10,18,40,0.85)",
        border: `1px solid ${tierColor}30`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Drawer header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${tierColor}15`, border: `1px solid ${tierColor}30` }}
          >
            🏥
          </div>
          <div>
            <div className="text-white font-bold text-sm">{hospital.name}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {hospital.city}, {hospital.state} · {hospital.type}
            </div>
          </div>
        </div>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-secondary)",
          }}
        >
          ✕ Close
        </motion.button>
      </div>

      {/* Patient Stage Overview */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Patient Stage Overview
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatMini label="Critical" value={a.critical} color="#ff3b5c" sub="Needs immediate care" />
          <StatMini label="Stable" value={a.stable} color="#ffc93c" sub="Under observation" />
          <StatMini label="Recovering" value={a.recovering} color="#00e676" sub="Improving" />
          <StatMini label="Discharged Today" value={a.discharged_today} color="#00d4ff" sub="Released" />
        </div>
      </div>

      {/* Operations & Capacity */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Operations & Capacity
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatMini label="Admitted Today" value={a.admitted_today} color="#a78bfa" />
          <StatMini label="OT Scheduled" value={a.ot_scheduled} color="#ff7a2e" sub="Surgeries today" />
          <StatMini label="Avg Stay" value={`${a.avg_stay_days}d`} color="#00d4ff" sub="Days per patient" />
          <StatMini label="Predictions" value={a.predictions_today} color="#00ff87" sub="AI runs today" />
        </div>
      </div>

      {/* ICU + Bed Occupancy + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* ICU */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,59,92,0.06)", border: "1px solid rgba(255,59,92,0.18)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">🚨 ICU Occupancy</span>
            <span className="text-xs font-mono font-bold" style={{ color: a.icu_occupied / a.icu_total > 0.85 ? "#ff3b5c" : "#ffc93c" }}>
              {a.icu_occupied}/{a.icu_total}
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: a.icu_occupied / a.icu_total > 0.85
                  ? "linear-gradient(90deg,#ff3b5c80,#ff3b5c)"
                  : "linear-gradient(90deg,#ffc93c80,#ffc93c)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(a.icu_occupied / a.icu_total) * 100}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {((a.icu_occupied / a.icu_total) * 100).toFixed(0)}% beds occupied
          </div>
        </div>

        {/* Bed Occupancy */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">🛏️ Bed Occupancy</span>
            <span className="text-xs font-mono font-bold" style={{ color: a.bed_occupancy > 88 ? "#ff3b5c" : "#00e676" }}>
              {a.bed_occupancy}%
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: a.bed_occupancy > 88
                  ? "linear-gradient(90deg,#ff3b5c80,#ff3b5c)"
                  : "linear-gradient(90deg,#00d4ff80,#00d4ff)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${a.bed_occupancy}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {a.bed_occupancy > 88 ? "⚠️ Near capacity" : "Within normal range"}
          </div>
        </div>

        {/* Alerts */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,201,60,0.05)", border: "1px solid rgba(255,201,60,0.18)" }}
        >
          <div className="text-xs font-semibold text-white mb-3">🔔 Alerts</div>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{a.active_alerts}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Active</div>
            </div>
            <div className="w-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{a.resolved_alerts}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Disease Breakdown */}
      <div>
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Disease Breakdown
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {a.disease_breakdown.map((d) => {
            const pct = Math.round((d.count / hospital.total_patients) * 100);
            return (
              <div
                key={d.name}
                className="rounded-xl p-3"
                style={{ background: `${d.color}08`, border: `1px solid ${d.color}20` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: d.color }}>{d.name}</span>
                  <span className="text-xs font-mono font-bold text-white">{d.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg,${d.color}60,${d.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{pct}% of total</div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Hospitals Overview ───────────────────────────────────────────────────────
const HospitalsView = () => {
  const [hospitals, setHospitals] = useState([]);
  const [showList, setShowList] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    hospitalsAPI
      .list()
      .then((d) => setHospitals(d.hospitals || []))
      .catch(() => {});
  }, []);

  const tierColor = { private: "#00d4ff", government: "#00ff87" };
  const displayHospitals = hospitals.length > 0 ? hospitals : HOSPITAL_ANALYTICS;

  const toggleAnalytics = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <SectionHeader
        title="Hospital Network"
        subtitle="All connected hospitals in NFHIS"
      />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayHospitals.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5 glass-hover cursor-default"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-white font-semibold">{h.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {h.city}, {h.state}
                </div>
              </div>
              <span
                className="badge"
                style={{
                  background: `${tierColor[h.type?.toLowerCase()] || "#00d4ff"}15`,
                  color: tierColor[h.type?.toLowerCase()] || "#00d4ff",
                  border: `1px solid ${tierColor[h.type?.toLowerCase()] || "#00d4ff"}30`,
                }}
              >
                {h.type}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-400">{h.total_patients}</div>
                <div className="text-xs text-blue-300/40">Patients</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{h.doctors}</div>
                <div className="text-xs text-blue-300/40">Doctors</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{h.fl_participation}</div>
                <div className="text-xs text-blue-300/40">FL Rounds</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-blue-300/50">Trust Score</span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: h.trust_score > 0.85 ? "#00e676" : "#ffc93c" }}
                >
                  {(h.trust_score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      h.trust_score > 0.85
                        ? "linear-gradient(90deg, #00e67680, #00e676)"
                        : "linear-gradient(90deg, #ffc93c80, #ffc93c)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${h.trust_score * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── List All Hospitals Button ── */}
      <div className="mt-6 flex justify-center">
        <motion.button
          onClick={() => {
            setShowList((v) => !v);
            setExpandedId(null);
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold"
          style={{
            background: showList ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.35)",
            color: "#a78bfa",
          }}
        >
          <span>📋</span>
          {showList ? "Hide" : "List All Hospitals"} with Analytics
          <motion.span
            animate={{ rotate: showList ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            ▾
          </motion.span>
        </motion.button>
      </div>

      {/* ── Expandable Hospital List ── */}
      {showList && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(167,139,250,0.18)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">🏥 All Hospitals — Detailed Analytics</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Click any hospital row to expand full analytics
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-lg font-mono"
              style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}
            >
              {displayHospitals.length} hospitals
            </span>
          </div>

          <div className="space-y-3">
            {displayHospitals.map((h, i) => {
              const isOpen = expandedId === h.id;
              const tc = tierColor[h.type?.toLowerCase()] || "#00d4ff";
              const analyticsData = HOSPITAL_ANALYTICS.find((x) => x.id === h.id) || h;

              return (
                <div key={h.id}>
                  {/* Row */}
                  <motion.div
                    onClick={() => toggleAnalytics(h.id)}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.998 }}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: isOpen ? `${tc}0d` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isOpen ? `${tc}35` : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    {/* Rank */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                    >
                      {i + 1}
                    </div>

                    {/* Name + location */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold truncate">{h.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {h.city}, {h.state}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="hidden lg:flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-bold text-cyan-400">{h.total_patients}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Patients</div>
                      </div>
                      {analyticsData.analytics && (
                        <>
                          <div className="text-center">
                            <div className="text-sm font-bold text-red-400">{analyticsData.analytics.critical}</div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Critical</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold" style={{ color: analyticsData.analytics.bed_occupancy > 88 ? "#ff3b5c" : "#00e676" }}>
                              {analyticsData.analytics.bed_occupancy}%
                            </div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Beds</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold" style={{ color: analyticsData.analytics.active_alerts > 5 ? "#ffc93c" : "#00e676" }}>
                              {analyticsData.analytics.active_alerts}
                            </div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Alerts</div>
                          </div>
                        </>
                      )}
                      <span
                        className="badge"
                        style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                      >
                        {h.type}
                      </span>
                    </div>

                    {/* Expand chevron */}
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.22 }}
                      className="text-xs ml-2 flex-shrink-0"
                      style={{ color: tc }}
                    >
                      ▾
                    </motion.span>
                  </motion.div>

                  {/* Analytics Drawer */}
                  {isOpen && analyticsData.analytics && (
                    <HospitalAnalyticsDrawer
                      hospital={analyticsData}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Top Hospitals by State Data ──────────────────────────────────────────────
const TOP_HOSPITALS_BY_STATE = [
  {
    state: "Telangana",
    color: "#00d4ff",
    flag: "🔵",
    hospitals: [
      { name: "Apollo Private Hospital", city: "Hyderabad", trust: 0.92, patients: 800, type: "Private" },
      { name: "Care Hospitals", city: "Hyderabad", trust: 0.86, patients: 650, type: "Private" },
      { name: "Gandhi Hospital", city: "Hyderabad", trust: 0.78, patients: 1100, type: "Government" },
    ],
  },
  {
    state: "Delhi",
    color: "#00ff87",
    flag: "🟢",
    hospitals: [
      { name: "AIIMS Government Hospital", city: "New Delhi", trust: 0.88, patients: 1200, type: "Government" },
      { name: "Sir Ganga Ram Hospital", city: "New Delhi", trust: 0.85, patients: 900, type: "Private" },
      { name: "Safdarjung Hospital", city: "New Delhi", trust: 0.81, patients: 1400, type: "Government" },
    ],
  },
  {
    state: "Punjab",
    color: "#a78bfa",
    flag: "🟣",
    hospitals: [
      { name: "Fortis National Hospital", city: "Chandigarh", trust: 0.85, patients: 600, type: "Private" },
      { name: "PGI Chandigarh", city: "Chandigarh", trust: 0.83, patients: 950, type: "Government" },
      { name: "Max Super Specialty", city: "Mohali", trust: 0.79, patients: 520, type: "Private" },
    ],
  },
  {
    state: "Bihar",
    color: "#ffd700",
    flag: "🟡",
    hospitals: [
      { name: "PMCH Patna", city: "Patna", trust: 0.80, patients: 1300, type: "Government" },
      { name: "District Rural Hospital", city: "Patna", trust: 0.75, patients: 1000, type: "Government" },
      { name: "Ruban Memorial Hospital", city: "Patna", trust: 0.71, patients: 480, type: "Private" },
    ],
  },
  {
    state: "Maharashtra",
    color: "#ff7a2e",
    flag: "🟠",
    hospitals: [
      { name: "KEM Hospital", city: "Mumbai", trust: 0.91, patients: 1500, type: "Government" },
      { name: "Kokilaben Dhirubhai", city: "Mumbai", trust: 0.89, patients: 700, type: "Private" },
      { name: "Nanavati Hospital", city: "Mumbai", trust: 0.84, patients: 580, type: "Private" },
    ],
  },
  {
    state: "Tamil Nadu",
    color: "#ff3b5c",
    flag: "🔴",
    hospitals: [
      { name: "CMC Vellore", city: "Vellore", trust: 0.94, patients: 1100, type: "Private" },
      { name: "Apollo Chennai", city: "Chennai", trust: 0.87, patients: 750, type: "Private" },
      { name: "Stanley Medical College", city: "Chennai", trust: 0.82, patients: 1000, type: "Government" },
    ],
  },
];

// ─── Top Hospitals Panel Component ───────────────────────────────────────────
const TopHospitalsPanel = ({ onClose }) => {
  const [activeState, setActiveState] = useState(TOP_HOSPITALS_BY_STATE[0].state);
  const activeData = TOP_HOSPITALS_BY_STATE.find((s) => s.state === activeState);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.35 }}
      className="glass rounded-2xl p-5 mt-4"
      style={{ border: "1px solid rgba(0,212,255,0.18)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-white">
            🏆 Top Hospitals by State
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Ranked by trust score across all connected states
          </p>
        </div>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-secondary)",
          }}
        >
          ✕ Close
        </motion.button>
      </div>

      {/* State tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TOP_HOSPITALS_BY_STATE.map((s) => (
          <motion.button
            key={s.state}
            onClick={() => setActiveState(s.state)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all"
            style={
              activeState === s.state
                ? {
                    background: `${s.color}20`,
                    border: `1px solid ${s.color}50`,
                    color: s.color,
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-secondary)",
                  }
            }
          >
            {s.flag} {s.state}
          </motion.button>
        ))}
      </div>

      {/* Hospital cards for active state */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {activeData.hospitals.map((h, i) => (
          <motion.div
            key={h.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl p-4"
            style={{
              background: `${activeData.color}08`,
              border: `1px solid ${activeData.color}20`,
            }}
          >
            {/* Rank badge + name */}
            <div className="flex items-start gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{
                  background:
                    i === 0 ? "#ffd70020" : "rgba(255,255,255,0.06)",
                  color: i === 0 ? "#ffd700" : "var(--text-secondary)",
                  border:
                    i === 0
                      ? "1px solid #ffd70040"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                #{i + 1}
              </div>
              <div>
                <div className="text-white text-xs font-semibold leading-snug">
                  {h.name}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h.city}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-3 mb-3">
              <div>
                <div
                  className="text-xs font-bold"
                  style={{ color: h.trust > 0.85 ? "#00e676" : "#ffc93c" }}
                >
                  {(h.trust * 100).toFixed(0)}%
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Trust
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-400">
                  {h.patients}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Patients
                </div>
              </div>
              <div className="ml-auto">
                <span
                  className="badge text-xs"
                  style={{
                    background:
                      h.type === "Private"
                        ? "rgba(0,212,255,0.1)"
                        : "rgba(0,255,135,0.1)",
                    color: h.type === "Private" ? "#00d4ff" : "#00ff87",
                    border: `1px solid ${
                      h.type === "Private"
                        ? "rgba(0,212,255,0.25)"
                        : "rgba(0,255,135,0.25)"
                    }`,
                  }}
                >
                  {h.type}
                </span>
              </div>
            </div>

            {/* Trust bar */}
            <div
              className="h-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    h.trust > 0.85
                      ? `linear-gradient(90deg, ${activeData.color}60, ${activeData.color})`
                      : "linear-gradient(90deg, #ffc93c60, #ffc93c)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${h.trust * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Admin Overview ───────────────────────────────────────────────────────────
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [flStatus, setFlStatus] = useState(null);
  const [showTopHospitals, setShowTopHospitals] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsAPI.summary().catch(() => null),
      federatedAPI.status().catch(() => null),
    ]).then(([s, f]) => {
      setStats(s);
      setFlStatus(f);
    });
  }, []);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <SectionHeader
        title="System Administration"
        subtitle="NFHIS Platform Overview & Control Center"
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Patients"
          value={stats?.total_patients || "3,600"}
          icon="👥"
          color="#00d4ff"
        />
        <StatCard
          title="FL Rounds"
          value={flStatus?.current_round || 15}
          icon="🔄"
          color="#00ff87"
        />
        <StatCard
          title="Active Hospitals"
          value={4}
          icon="🏥"
          color="#a78bfa"
        />
        <StatCard
          title="System Status"
          value="Online"
          icon="✓"
          color="#00e676"
        />
      </div>

      {/* INDIA HEALTHCARE GRID */}
      <div className="mb-6">
        <div className="glass rounded-3xl p-5">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white mb-2">
              🇮🇳 National Healthcare Intelligence Grid
            </h2>
            <p className="text-blue-300/50 text-sm">
              Real-time federated healthcare network across India
            </p>
          </div>

          <IndiaHealthMap />

          {/* ── Top Hospitals Toggle Button ── */}
          <div className="mt-5 flex justify-center">
            <motion.button
              onClick={() => setShowTopHospitals((v) => !v)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold"
              style={{
                background: showTopHospitals
                  ? "rgba(0,212,255,0.15)"
                  : "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.35)",
                color: "#00d4ff",
              }}
            >
              <span>🏆</span>
              {showTopHospitals ? "Hide" : "View"} Top Hospitals by State
              <motion.span
                animate={{ rotate: showTopHospitals ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="inline-block"
              >
                ▾
              </motion.span>
            </motion.button>
          </div>

          {/* ── Collapsible Panel ── */}
          {showTopHospitals && (
            <TopHospitalsPanel onClose={() => setShowTopHospitals(false)} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Audit Logs",
            desc: "System-wide activity trail",
            icon: "📋",
            path: "/admin/audit",
            color: "#00d4ff",
          },
          {
            label: "Trust Scores",
            desc: "Hospital reliability metrics",
            icon: "🛡️",
            path: "/admin/trust",
            color: "#00ff87",
          },
          {
            label: "Federated Learning",
            desc: "FL rounds and model training",
            icon: "🌐",
            path: "/admin/federated",
            color: "#a78bfa",
          },
          {
            label: "Anomaly Detection",
            desc: "Automated threat monitoring",
            icon: "🔍",
            path: "/admin/anomaly",
            color: "#ffd700",
          },
          {
            label: "Hospital Network",
            desc: "Connected hospital management",
            icon: "🏥",
            path: "/admin/hospitals",
            color: "#ff7a2e",
          },
        ].map((item) => (
          <a
            key={item.label}
            href={item.path}
            className="glass rounded-2xl p-5 glass-hover cursor-pointer block"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{
                background: `${item.color}15`,
                border: `1px solid ${item.color}25`,
              }}
            >
              {item.icon}
            </div>
            <div className="text-white font-semibold text-sm">{item.label}</div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {item.desc}
            </div>
          </a>
        ))}
      </div>
    </motion.div>
  );
};

export default function AdminDashboard() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="audit" element={<AuditLogs />} />
      <Route path="trust" element={<FederatedPanel />} />
      <Route path="federated" element={<FederatedPanel />} />
      <Route path="anomaly" element={<AnomalyDetection />} />
      <Route path="hospitals" element={<HospitalsView />} />
    </Routes>
  );
}