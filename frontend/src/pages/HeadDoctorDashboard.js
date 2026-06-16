import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import {
  StatCard, SectionHeader, HospitalComparisonChart,
  DiseaseTrendChart, TrustScoreBar
} from '../components/charts/Charts';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { doctorsAPI, alertsAPI, analyticsAPI, hospitalsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const pageVariants = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } };

// ─── Doctor Performance Table ─────────────────────────────────────────────────
const DoctorPerformance = () => {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    doctorsAPI.list().then(d => setDoctors(d.doctors || [])).catch(() => {
      setDoctors([
        { doctor_id: 'DOC001', name: 'Dr. Priya Nair', specialization: 'Endocrinology', performance_score: 87.5, patients_handled: 342, alerts_acknowledged: 28, alerts_ignored: 2, negligence_count: 1, avg_response_time_hours: 1.8 },
        { doctor_id: 'DOC002', name: 'Dr. Karthik Reddy', specialization: 'Cardiology', performance_score: 96.2, patients_handled: 589, alerts_acknowledged: 45, alerts_ignored: 0, negligence_count: 0, avg_response_time_hours: 1.2 },
        { doctor_id: 'DOC003', name: 'Dr. Sunita Gupta', specialization: 'Hepatology', performance_score: 91.8, patients_handled: 215, alerts_acknowledged: 19, alerts_ignored: 1, negligence_count: 0, avg_response_time_hours: 2.1 },
        { doctor_id: 'DOC004', name: 'Dr. Mohammed Hussain', specialization: 'General Medicine', performance_score: 78.4, patients_handled: 478, alerts_acknowledged: 32, alerts_ignored: 3, negligence_count: 0, avg_response_time_hours: 3.5 },
      ]);
    });
  }, []);

  const scoreColor = (s) => s > 90 ? '#00e676' : s > 80 ? '#00d4ff' : s > 70 ? '#ffc93c' : '#ff7a2e';

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
      <SectionHeader title="Doctor Performance" subtitle="Comprehensive doctor analytics and metrics" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Doctors" value={doctors.length} icon="👨‍⚕️" color="#00d4ff" />
        <StatCard title="Avg Performance" value={`${(doctors.reduce((s, d) => s + d.performance_score, 0) / Math.max(doctors.length, 1)).toFixed(1)}%`} icon="📊" color="#00ff87" />
        <StatCard title="Negligence Flags" value={doctors.reduce((s, d) => s + d.negligence_count, 0)} icon="⚠️" color="#ff3b5c" />
        <StatCard title="Total Patients" value={doctors.reduce((s, d) => s + d.patients_handled, 0)} icon="👥" color="#a78bfa" />
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Doctor</th><th>Specialization</th><th>Patients</th>
              <th>Alerts ACK</th><th>Ignored</th><th>Avg Response</th><th>Negligence</th><th>Score</th>
            </tr></thead>
            <tbody>
              {doctors.map(doc => (
                <tr key={doc.doctor_id}>
                  <td><div className="text-white font-semibold text-xs">{doc.name}</div><div className="text-xs text-blue-300/40">{doc.doctor_id}</div></td>
                  <td>{doc.specialization}</td>
                  <td className="font-mono">{doc.patients_handled}</td>
                  <td className="font-mono text-green-400">{doc.alerts_acknowledged}</td>
                  <td className="font-mono" style={{ color: doc.alerts_ignored > 0 ? '#ff7a2e' : 'var(--text-secondary)' }}>{doc.alerts_ignored}</td>
                  <td className="font-mono" style={{ color: doc.avg_response_time_hours > 3 ? '#ff7a2e' : 'var(--text-secondary)' }}>
                    {doc.avg_response_time_hours}h
                  </td>
                  <td>
                    {doc.negligence_count > 0
                      ? <span className="badge badge-critical">⚠️ {doc.negligence_count}</span>
                      : <span className="badge badge-low">✓ Clean</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${doc.performance_score}%`, background: scoreColor(doc.performance_score) }} />
                      </div>
                      <span className="font-mono text-xs" style={{ color: scoreColor(doc.performance_score) }}>{doc.performance_score}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={doctors.map(d => ({ name: d.name.replace('Dr. ', ''), score: d.performance_score, patients: d.patients_handled / 10 }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#4a6a85', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4a6a85', fontSize: 10 }} axisLine={false} tickLine={false} domain={[60, 100]} />
            <Tooltip contentStyle={{ background: 'rgba(4,10,24,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="score" name="Performance Score" radius={[6, 6, 0, 0]}>
              {doctors.map((d, i) => (
                <Cell key={i} fill={scoreColor(d.performance_score)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

// ─── Negligence Reports ───────────────────────────────────────────────────────
const NegligenceReports = () => {
  const [reports, setReports] = useState(null);

  useEffect(() => {
    alertsAPI.negligenceReports().then(setReports).catch(() => {
      setReports({
        negligence_alerts: [
          { alert_id: 'ALT004', patient_name: 'Lakshmi Nair', doctor_name: 'Dr. Priya Nair', severity: 'critical', message: 'Critical BP alert ignored for 7+ hours. Patient condition escalated.', hours_ignored: 7, status: 'escalated' }
        ],
        doctor_negligence_summary: [{ doctor_id: 'DOC001', negligence_count: 1 }],
        total_negligence_incidents: 1,
      });
    });
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
      <SectionHeader title="Negligence Reports" subtitle="Medical negligence detection and tracking" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Incidents" value={reports?.total_negligence_incidents || 0} icon="⚠️" color="#ff3b5c" />
        <StatCard title="Escalated Cases" value={reports?.negligence_alerts?.filter(a => a.status === 'escalated').length || 0} icon="🚨" color="#ff7a2e" />
        <StatCard title="Doctors Flagged" value={reports?.doctor_negligence_summary?.length || 0} icon="👨‍⚕️" color="#ffc93c" />
      </div>
      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">⚠️ Negligence Alerts</h3>
        {reports?.negligence_alerts?.map(alert => (
          <div key={alert.alert_id} className="p-4 rounded-xl mb-3 alert-critical-pulse"
            style={{ background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-critical">NEGLIGENCE</span>
                  <span className="badge badge-critical">{alert.severity?.toUpperCase()}</span>
                </div>
                <div className="text-white text-sm font-semibold">{alert.patient_name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{alert.message}</div>
                <div className="text-xs mt-2 text-red-400">
                  Doctor: {alert.doctor_name} · Alert ignored for {alert.hours_ignored}h
                </div>
              </div>
              <span className="badge badge-critical">ESCALATED</span>
            </div>
          </div>
        ))}
        {(!reports?.negligence_alerts || reports.negligence_alerts.length === 0) && (
          <div className="text-center py-8 text-green-400 text-sm">✓ No negligence incidents detected</div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Hospital Analytics ───────────────────────────────────────────────────────
const HospitalAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    Promise.all([
      analyticsAPI.summary().catch(() => null),
      analyticsAPI.diseaseTrends().catch(() => ({ monthly_trends: [] })),
      hospitalsAPI.comparison().catch(() => ({ comparison: [] })),
    ]).then(([s, t, h]) => {
      setStats(s);
      setTrends(t.monthly_trends || []);
      setHospitals(h.comparison || []);
    });
  }, []);

  const hospitalChartData = hospitals.map(h => ({
    name: h.name?.replace(' Hospital', '').replace(' Private', '').replace(' National', ''),
    accuracy: Math.round((h.avg_model_accuracy || 0.85) * 100) / 100,
    trust: h.trust_score || 0.8,
  }));

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
      <SectionHeader title="Hospital Analytics" subtitle="Comprehensive analytics across all hospitals" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Patients" value={stats?.total_patients || 3600} icon="👥" color="#00d4ff" />
        <StatCard title="Diabetes Cases" value={stats?.disease_counts?.diabetes || 845} icon="🩸" color="#ffc93c" />
        <StatCard title="Heart Disease" value={stats?.disease_counts?.heart_disease || 612} icon="❤️" color="#ff3b5c" />
        <StatCard title="Liver Disease" value={stats?.disease_counts?.liver_disease || 298} icon="🫀" color="#a78bfa" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Disease Trends</h3>
          <DiseaseTrendChart data={trends} />
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Model Accuracy by Hospital</h3>
          <HospitalComparisonChart data={hospitalChartData} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── Head Overview ────────────────────────────────────────────────────────────
const HeadOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    Promise.all([
      analyticsAPI.summary().catch(() => null),
      analyticsAPI.diseaseTrends().catch(() => ({ monthly_trends: [] })),
    ]).then(([s, t]) => {
      setStats(s);
      setTrends(t.monthly_trends || []);
    });
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
      <SectionHeader title="Medical Director Dashboard" subtitle={`${user?.name} · Oversight & Governance`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Patients" value={stats?.total_patients || '3,600'} icon="👥" color="#00d4ff" trend={8} />
        <StatCard title="Diabetes Cases" value={stats?.disease_counts?.diabetes || 845} icon="🩸" color="#ffc93c" trend={3} />
        <StatCard title="Heart Cases" value={stats?.disease_counts?.heart_disease || 612} icon="❤️" color="#ff3b5c" trend={-2} />
        <StatCard title="Negligence Flags" value={1} icon="⚠️" color="#ff7a2e" />
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">National Disease Trends</h3>
        <DiseaseTrendChart data={trends} />
      </div>
    </motion.div>
  );
};

export default function HeadDoctorDashboard() {
  return (
    <Routes>
      <Route index element={<HeadOverview />} />
      <Route path="performance" element={<DoctorPerformance />} />
      <Route path="negligence" element={<NegligenceReports />} />
      <Route path="analytics" element={<HospitalAnalytics />} />
    </Routes>
  );
}
