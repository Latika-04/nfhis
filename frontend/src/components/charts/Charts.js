import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Cell, PieChart, Pie
} from 'recharts';

// ─── Stat Card ───────────────────────────────────────────────────────────────
export const StatCard = ({ title, value, subtitle, icon, trend, color = '#00d4ff', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="glass rounded-2xl p-5 glass-hover cursor-default"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        {icon}
      </div>
      {trend !== undefined && (
        <span className="text-xs font-semibold px-2 py-1 rounded-lg"
          style={{
            background: trend >= 0 ? 'rgba(0,230,118,0.12)' : 'rgba(255,59,92,0.12)',
            color: trend >= 0 ? '#00e676' : '#ff3b5c',
          }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-2xl font-bold font-display" style={{ color }}>{value}</div>
    <div className="text-white text-sm font-medium mt-0.5">{title}</div>
    {subtitle && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
  </motion.div>
);

// ─── Risk Meter (circular) ────────────────────────────────────────────────────
export const RiskMeter = ({ value, disease, size = 120 }) => {
  const risk = parseFloat(value) || 0;
  const color = risk > 75 ? '#ff3b5c' : risk > 55 ? '#ff7a2e' : risk > 35 ? '#ffc93c' : '#00e676';
  const label = risk > 75 ? 'Critical' : risk > 55 ? 'High' : risk > 35 ? 'Medium' : 'Low';

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (risk / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={radius} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
          <motion.circle cx={cx} cy={cy} r={radius} fill="none"
            stroke={color} strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - strokeDash }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-xl font-bold font-mono"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}>
            {risk.toFixed(0)}%
          </motion.span>
        </div>
      </div>
      <div className="text-center mt-1">
        <div className="text-xs font-semibold" style={{ color }}>{label}</div>
        <div className="text-xs text-blue-300/50 mt-0.5">{disease}</div>
      </div>
    </div>
  );
};

// ─── SHAP Feature Importance Bar Chart ───────────────────────────────────────
export const SHAPChart = ({ data, title = 'Feature Importance (SHAP)' }) => {
  if (!data || Object.keys(data).length === 0) return null;

  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([feature, value]) => ({
      feature: feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: parseFloat((value * 100).toFixed(2)),
      raw: value,
    }));

  const maxVal = Math.max(...chartData.map(d => d.value));

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-2.5">
        {chartData.map((item, i) => {
          const pct = (item.value / maxVal) * 100;
          const color = i === 0 ? '#ff3b5c' : i < 3 ? '#ff7a2e' : i < 5 ? '#ffc93c' : '#00d4ff';
          return (
            <motion.div key={item.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-300/70">{item.feature}</span>
                <span className="text-xs font-mono font-semibold" style={{ color }}>{item.value.toFixed(1)}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}60` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Disease Trend Line Chart ─────────────────────────────────────────────────
export const DiseaseTrendChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
      <defs>
        {[
          { id: 'diabetes', color: '#00d4ff' },
          { id: 'heart', color: '#ff3b5c' },
          { id: 'liver', color: '#ffc93c' },
        ].map(({ id, color }) => (
          <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
      <XAxis dataKey="month" tick={{ fill: '#4a6a85', fontSize: 10 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#4a6a85', fontSize: 10 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ background: 'rgba(4,10,24,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, color: '#e8f4fd', fontSize: 12 }} />
      <Area type="monotone" dataKey="diabetes" stroke="#00d4ff" strokeWidth={2} fill="url(#grad-diabetes)" dot={false} name="Diabetes" />
      <Area type="monotone" dataKey="heart_disease" stroke="#ff3b5c" strokeWidth={2} fill="url(#grad-heart)" dot={false} name="Heart Disease" />
      <Area type="monotone" dataKey="liver_disease" stroke="#ffc93c" strokeWidth={2} fill="url(#grad-liver)" dot={false} name="Liver Disease" />
    </AreaChart>
  </ResponsiveContainer>
);

// ─── Hospital Comparison Bar Chart ───────────────────────────────────────────
export const HospitalComparisonChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={2}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
      <XAxis dataKey="name" tick={{ fill: '#4a6a85', fontSize: 9 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#4a6a85', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0.6, 1]} />
      <Tooltip contentStyle={{ background: 'rgba(4,10,24,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, color: '#e8f4fd', fontSize: 12 }} />
      <Bar dataKey="accuracy" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Accuracy">
        {data.map((_, i) => (
          <Cell key={i} fill={['#00d4ff', '#00ff87', '#a78bfa', '#ffd700'][i % 4]} fillOpacity={0.8} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ─── FL Round Progress Line Chart ────────────────────────────────────────────
export const FLProgressChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
      <XAxis dataKey="round_number" tick={{ fill: '#4a6a85', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: '#4a6a85', fontSize: 10 }} />
      <YAxis tick={{ fill: '#4a6a85', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0.6, 1]} />
      <Tooltip contentStyle={{ background: 'rgba(4,10,24,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, fontSize: 12 }} />
      <Line type="monotone" dataKey="avg_accuracy" stroke="#00d4ff" strokeWidth={2.5} dot={{ r: 3, fill: '#00d4ff' }} name="Avg Accuracy" />
      <Line type="monotone" dataKey="avg_loss" stroke="#ff7a2e" strokeWidth={2} dot={{ r: 3, fill: '#ff7a2e' }} name="Avg Loss" strokeDasharray="4 2" />
    </LineChart>
  </ResponsiveContainer>
);

// ─── Real-time Vitals Line Chart ──────────────────────────────────────────────
export const RealtimeVitalsChart = ({ data, dataKey = 'value', color = '#00d4ff', label = '' }) => (
  <ResponsiveContainer width="100%" height={80}>
    <AreaChart data={data} margin={{ top: 2, right: 2, left: -35, bottom: 0 }}>
      <defs>
        <linearGradient id={`rv-grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#rv-grad-${dataKey})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

// ─── Donut/Pie Disease Distribution ──────────────────────────────────────────
export const DiseaseDonut = ({ data }) => {
  const COLORS = ['#00d4ff', '#ff3b5c', '#ffc93c', '#00ff87'];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
          paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: 'rgba(4,10,24,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ─── Alert Card ───────────────────────────────────────────────────────────────
export const AlertCard = ({ alert, onAcknowledge }) => {
  const severityConfig = {
    critical: { color: '#ff3b5c', bg: 'rgba(255,59,92,0.08)', border: 'rgba(255,59,92,0.25)' },
    high: { color: '#ff7a2e', bg: 'rgba(255,122,46,0.08)', border: 'rgba(255,122,46,0.25)' },
    medium: { color: '#ffc93c', bg: 'rgba(255,201,60,0.08)', border: 'rgba(255,201,60,0.25)' },
    low: { color: '#00e676', bg: 'rgba(0,230,118,0.06)', border: 'rgba(0,230,118,0.2)' },
  };
  const cfg = severityConfig[alert.severity] || severityConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl p-4 mb-3"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge badge-${alert.severity}`}>{alert.severity?.toUpperCase()}</span>
            {alert.negligence && (
              <span className="badge badge-critical">⚠️ NEGLIGENCE</span>
            )}
          </div>
          <div className="text-white text-sm font-semibold">{alert.patient_name}</div>
          <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {alert.message}
          </div>
          {alert.risk_scores && (
            <div className="flex gap-3 mt-2">
              {Object.entries(alert.risk_scores).map(([k, v]) => (
                <span key={k} className="text-xs font-mono" style={{ color: cfg.color }}>
                  {k.replace('_', ' ')}: {v}%
                </span>
              ))}
            </div>
          )}
        </div>
        {alert.status === 'pending' && onAcknowledge && (
          <button onClick={() => onAcknowledge(alert.alert_id)}
            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
            style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
            Acknowledge
          </button>
        )}
        {alert.status === 'acknowledged' && (
          <span className="badge badge-low flex-shrink-0">✓ ACK</span>
        )}
        {alert.status === 'escalated' && (
          <span className="badge badge-critical flex-shrink-0">ESCALATED</span>
        )}
      </div>
    </motion.div>
  );
};

// ─── Patient Row ──────────────────────────────────────────────────────────────
export const PatientRow = ({ patient, onSelect }) => {
  const maxRisk = Math.max(
    patient.diabetes_risk_score || 0,
    patient.heart_risk_score || 0,
    patient.liver_risk_score || 0
  );
  const riskColor = maxRisk > 75 ? '#ff3b5c' : maxRisk > 55 ? '#ff7a2e' : maxRisk > 35 ? '#ffc93c' : '#00e676';
  const riskLabel = maxRisk > 75 ? 'Critical' : maxRisk > 55 ? 'High' : maxRisk > 35 ? 'Medium' : 'Low';

  return (
    <tr onClick={() => onSelect && onSelect(patient)} className="cursor-pointer">
      <td>
        <div className="font-semibold text-white text-xs">{patient.first_name} {patient.last_name}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{patient.patient_id}</div>
      </td>
      <td>{patient.age}y, {patient.gender}</td>
      <td>
        <span className="font-mono text-xs" style={{ color: patient.fasting_glucose > 126 ? '#ff7a2e' : 'var(--text-secondary)' }}>
          {patient.fasting_glucose} mg/dL
        </span>
      </td>
      <td>
        <span className="font-mono text-xs" style={{ color: patient.systolic_bp > 140 ? '#ff7a2e' : 'var(--text-secondary)' }}>
          {patient.systolic_bp}/{patient.diastolic_bp}
        </span>
      </td>
      <td>
        <span className="font-mono text-xs">{patient.total_cholesterol || '—'}</span>
      </td>
      <td>
        <span className={`badge badge-${riskLabel.toLowerCase()}`}>{riskLabel}</span>
      </td>
      <td>
        <span className="text-xs font-mono" style={{ color: riskColor }}>{maxRisk.toFixed(1)}%</span>
      </td>
    </tr>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-xl font-display font-bold text-white">{title}</h2>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export const Skeleton = ({ className = 'h-8 w-full' }) => (
  <div className={`rounded-xl shimmer ${className}`}
    style={{ background: 'rgba(255,255,255,0.04)' }} />
);

// ─── Trust Score Bar ──────────────────────────────────────────────────────────
export const TrustScoreBar = ({ hospital, score, rank }) => {
  const color = score > 0.9 ? '#00ff87' : score > 0.8 ? '#00d4ff' : score > 0.7 ? '#ffc93c' : '#ff7a2e';
  return (
    <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-xs font-bold w-5 text-center" style={{ color: 'var(--text-muted)' }}>#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-white truncate">{hospital.replace(/_/g, ' ')}</span>
          <span className="text-xs font-mono font-bold ml-2" style={{ color }}>{(score * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 6px ${color}40` }}
            initial={{ width: 0 }}
            animate={{ width: `${score * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
};
