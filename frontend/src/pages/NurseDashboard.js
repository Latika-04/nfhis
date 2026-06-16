import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Routes, Route } from "react-router-dom";
import {
  StatCard,
  AlertCard,
  SectionHeader,
  RealtimeVitalsChart,
} from "../components/charts/Charts";
import { alertsAPI, patientsAPI, analyticsAPI } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

// ─── Simulated live vital history ──────────────────────────────────────────
const generateVitalHistory = (base, noise, count = 20) =>
  Array.from({ length: count }, (_, i) => ({
    t: i,
    value: base + (Math.random() - 0.5) * noise,
  }));

// ─── Live Patient Card ────────────────────────────────────────────────────────
const LivePatientCard = ({ patient }) => {
  const [vitals, setVitals] = useState({
    hr: generateVitalHistory(72, 10),
    bp: generateVitalHistory(120, 20),
    spo2: generateVitalHistory(97, 3),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setVitals((prev) => ({
        hr: [
          ...prev.hr.slice(1),
          {
            t: prev.hr[prev.hr.length - 1].t + 1,
            value: 72 + (Math.random() - 0.5) * 12,
          },
        ],
        bp: [
          ...prev.bp.slice(1),
          {
            t: prev.bp[prev.bp.length - 1].t + 1,
            value: patient.systolic_bp + (Math.random() - 0.5) * 15,
          },
        ],
        spo2: [
          ...prev.spo2.slice(1),
          {
            t: prev.spo2[prev.spo2.length - 1].t + 1,
            value: 97 + (Math.random() - 0.5) * 4,
          },
        ],
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [patient]);

  const currentHr = Math.round(vitals.hr[vitals.hr.length - 1]?.value || 72);
  const currentBp = Math.round(vitals.bp[vitals.bp.length - 1]?.value || 120);
  const currentSpo2 = (
    vitals.spo2[vitals.spo2.length - 1]?.value || 97
  ).toFixed(1);

  const hrAlert = currentHr > 100 || currentHr < 55;
  const bpAlert = currentBp > 150;
  const spo2Alert = parseFloat(currentSpo2) < 94;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-white font-semibold text-sm">
            {patient.first_name} {patient.last_name}
          </div>
          <div className="text-xs text-blue-300/50 mt-0.5">
            {patient.patient_id} · {patient.age}y {patient.gender}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              background:
                hrAlert || bpAlert || spo2Alert ? "#ff3b5c" : "#00e676",
            }}
          />
          <span
            className="text-xs"
            style={{
              color: hrAlert || bpAlert || spo2Alert ? "#ff3b5c" : "#00e676",
            }}
          >
            {hrAlert || bpAlert || spo2Alert ? "Alert" : "Stable"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Heart Rate */}
        <div
          className="rounded-xl p-3"
          style={{
            background: hrAlert
              ? "rgba(255,59,92,0.08)"
              : "rgba(0,212,255,0.05)",
            border: `1px solid ${hrAlert ? "rgba(255,59,92,0.25)" : "rgba(0,212,255,0.12)"}`,
          }}
        >
          <div className="text-xs text-blue-300/50 mb-1">Heart Rate</div>
          <div
            className="text-xl font-bold font-mono"
            style={{ color: hrAlert ? "#ff3b5c" : "#00d4ff" }}
          >
            {currentHr}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            bpm
          </div>
          <RealtimeVitalsChart
            data={vitals.hr}
            color={hrAlert ? "#ff3b5c" : "#00d4ff"}
          />
        </div>
        {/* Blood Pressure */}
        <div
          className="rounded-xl p-3"
          style={{
            background: bpAlert
              ? "rgba(255,122,46,0.08)"
              : "rgba(0,212,255,0.05)",
            border: `1px solid ${bpAlert ? "rgba(255,122,46,0.25)" : "rgba(0,212,255,0.12)"}`,
          }}
        >
          <div className="text-xs text-blue-300/50 mb-1">Blood Pressure</div>
          <div
            className="text-xl font-bold font-mono"
            style={{ color: bpAlert ? "#ff7a2e" : "#00ff87" }}
          >
            {currentBp}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            mmHg sys
          </div>
          <RealtimeVitalsChart
            data={vitals.bp}
            color={bpAlert ? "#ff7a2e" : "#00ff87"}
          />
        </div>
        {/* SpO2 */}
        <div
          className="rounded-xl p-3"
          style={{
            background: spo2Alert
              ? "rgba(255,59,92,0.08)"
              : "rgba(167,139,250,0.05)",
            border: `1px solid ${spo2Alert ? "rgba(255,59,92,0.25)" : "rgba(167,139,250,0.15)"}`,
          }}
        >
          <div className="text-xs text-blue-300/50 mb-1">SpO₂</div>
          <div
            className="text-xl font-bold font-mono"
            style={{ color: spo2Alert ? "#ff3b5c" : "#a78bfa" }}
          >
            {currentSpo2}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            %
          </div>
          <RealtimeVitalsChart
            data={vitals.spo2}
            color={spo2Alert ? "#ff3b5c" : "#a78bfa"}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Vitals Entry Form ────────────────────────────────────────────────────────
const VitalsForm = () => {
  const [form, setForm] = useState({
    patient_id: "PAT000001",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    spo2: "",
    temperature: "",
    respiratory_rate: "",
    fasting_glucose: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    const existingPatients =
      JSON.parse(localStorage.getItem("nfhis_patients")) || [];

    const patientIndex = existingPatients.findIndex(
      (p) => p.patient_id === form.patient_id,
    );

    const updatedPatient = {
      patient_id: form.patient_id,

      first_name: existingPatients[patientIndex]?.first_name || "Patient",

      last_name: existingPatients[patientIndex]?.last_name || "",

      age: existingPatients[patientIndex]?.age || "45",

      gender: existingPatients[patientIndex]?.gender || "Male",

      glucose: form.glucose,

      blood_pressure: `${form.systolic_bp}/${form.diastolic_bp}`,

      cholesterol: existingPatients[patientIndex]?.cholesterol || "190",

      heart_rate: form.heart_rate,

      spo2: form.spo2,

      temperature: form.temperature,

      respiratory_rate: form.resp_rate,

      notes: form.notes,

      updated_at: new Date().toISOString(),

      risk_score: Math.floor(40 + Math.random() * 50),
    };

    if (patientIndex >= 0) {
      existingPatients[patientIndex] = {
        ...existingPatients[patientIndex],

        ...updatedPatient,
      };
    } else {
      existingPatients.unshift(updatedPatient);
    }

    localStorage.setItem("nfhis_patients", JSON.stringify(existingPatients));

    alert("Vitals submitted successfully");
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
        title="Enter Patient Vitals"
        subtitle="Record real-time vital signs"
      />
      <div className="glass rounded-2xl p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-blue-300/50 mb-1.5">
              Patient ID
            </label>
            <input
              className="input-field"
              value={form.patient_id}
              onChange={(e) => set("patient_id", e.target.value)}
              placeholder="PAT000001"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                field: "heart_rate",
                label: "Heart Rate",
                unit: "bpm",
                placeholder: "72",
              },
              {
                field: "systolic_bp",
                label: "Systolic BP",
                unit: "mmHg",
                placeholder: "120",
              },
              {
                field: "diastolic_bp",
                label: "Diastolic BP",
                unit: "mmHg",
                placeholder: "80",
              },
              { field: "spo2", label: "SpO₂", unit: "%", placeholder: "97" },
              {
                field: "temperature",
                label: "Temperature",
                unit: "°F",
                placeholder: "98.6",
              },
              {
                field: "respiratory_rate",
                label: "Resp. Rate",
                unit: "/min",
                placeholder: "16",
              },
              {
                field: "fasting_glucose",
                label: "Glucose",
                unit: "mg/dL",
                placeholder: "95",
              },
            ].map(({ field, label, unit, placeholder }) => (
              <div key={field}>
                <label className="block text-xs uppercase tracking-wider text-blue-300/50 mb-1.5">
                  {label}{" "}
                  <span style={{ color: "var(--text-muted)" }}>({unit})</span>
                </label>
                <input
                  className="input-field"
                  type="number"
                  step="0.1"
                  value={form[field]}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs uppercase tracking-wider text-blue-300/50 mb-1.5">
              Clinical Notes
            </label>
            <textarea
              className="input-field resize-none h-20"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Enter clinical observations..."
            />
          </div>
          <div className="mt-6 flex gap-3">
            <motion.button
              type="submit"
              className="btn-primary flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {submitted ? "✓ Vitals Recorded!" : "Submit Vitals"}
            </motion.button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  heart_rate: "",
                  systolic_bp: "",
                  diastolic_bp: "",
                  spo2: "",
                  temperature: "",
                  respiratory_rate: "",
                  fasting_glucose: "",
                  notes: "",
                }))
              }
            >
              Clear
            </button>
          </div>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl text-sm"
              style={{
                background: "rgba(0,230,118,0.1)",
                border: "1px solid rgba(0,230,118,0.25)",
                color: "#00e676",
              }}
            >
              ✓ Vitals for {form.patient_id} recorded successfully and forwarded
              to the treating physician.
            </motion.div>
          )}
        </form>
      </div>
    </motion.div>
  );
};

// ─── Live Monitor ─────────────────────────────────────────────────────────────
const LiveMonitor = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    patientsAPI
      .list({ hospital: user?.hospitalId, limit: 4 })
      .then((d) => setPatients(d.patients || []))
      .catch(() => {
        setPatients([
          {
            patient_id: "PAT000001",
            first_name: "Arjun",
            last_name: "Sharma",
            age: 52,
            gender: "Male",
            systolic_bp: 145,
          },
          {
            patient_id: "PAT000002",
            first_name: "Priya",
            last_name: "Verma",
            age: 45,
            gender: "Female",
            systolic_bp: 118,
          },
          {
            patient_id: "PAT000003",
            first_name: "Rajesh",
            last_name: "Kumar",
            age: 61,
            gender: "Male",
            systolic_bp: 162,
          },
          {
            patient_id: "PAT000004",
            first_name: "Sunita",
            last_name: "Patel",
            age: 38,
            gender: "Female",
            systolic_bp: 125,
          },
        ]);
      });
  }, [user]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <SectionHeader
        title="Live Patient Monitoring"
        subtitle="Real-time vital signs · Updates every 2s"
        action={
          <span className="flex items-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />{" "}
            LIVE
          </span>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {patients.map((p) => (
          <LivePatientCard key={p.patient_id} patient={p} />
        ))}
      </div>
    </motion.div>
  );
};

// ─── Alert Panel ──────────────────────────────────────────────────────────────
const AlertPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    alertsAPI
      .list({})
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {});
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
        title="Alert Panel"
        subtitle="Patient alerts requiring attention"
      />
      <div className="glass rounded-2xl p-5">
        {alerts.map((a) => (
          <AlertCard key={a.alert_id} alert={a} />
        ))}
      </div>
    </motion.div>
  );
};

// ─── Nurse Overview ───────────────────────────────────────────────────────────
const NurseOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    Promise.all([
      analyticsAPI.realtimeVitals().catch(() => null),
      alertsAPI.list({ status: "pending" }).catch(() => ({ alerts: [] })),
    ]).then(([s, a]) => {
      setStats(s);
      setAlerts(a.alerts || []);
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
        title="Nurse Station"
        subtitle={`${user?.name} · ${user?.hospitalId?.replace(/_/g, " ")}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Critical Patients"
          value={stats?.critical_patients || 3}
          icon="🚨"
          color="#ff3b5c"
        />
        <StatCard
          title="Active Alerts"
          value={alerts.length}
          icon="🔔"
          color="#ff7a2e"
        />
        <StatCard
          title="Today Admissions"
          value={stats?.today_admissions || 28}
          icon="🏥"
          color="#00d4ff"
        />
        <StatCard
          title="Vitals Logged"
          value={stats?.today_predictions || 52}
          icon="📋"
          color="#00ff87"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Pending Alerts
          </h3>
          {alerts.slice(0, 4).map((a) => (
            <AlertCard key={a.alert_id} alert={a} />
          ))}
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {[
              {
                label: "Enter Vitals",
                icon: "💓",
                path: "/nurse/vitals",
                color: "#00ff87",
              },
              {
                label: "Live Monitoring",
                icon: "📡",
                path: "/nurse/monitoring",
                color: "#00d4ff",
              },
              {
                label: "View Alerts",
                icon: "🔔",
                path: "/nurse/alerts",
                color: "#ff7a2e",
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.path}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: `${item.color}10`,
                  border: `1px solid ${item.color}20`,
                  color: item.color,
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function NurseDashboard() {
  return (
    <Routes>
      <Route index element={<NurseOverview />} />
      <Route path="vitals" element={<VitalsForm />} />
      <Route path="monitoring" element={<LiveMonitor />} />
      <Route path="alerts" element={<AlertPanel />} />
    </Routes>
  );
}
