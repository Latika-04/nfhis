import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Routes, Route, useNavigate } from "react-router-dom";
import PatientProfile from "../components/PatientProfile";
import {
  StatCard,
  SHAPChart,
  RiskMeter,
  AlertCard,
  PatientRow,
  SectionHeader,
  Skeleton,
  DiseaseTrendChart,
} from "../components/charts/Charts";
import {
  patientsAPI,
  alertsAPI,
  analyticsAPI,
  predictionsAPI,
} from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import AICopilotPage from "../components/AICopilotPage";
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

// ─── Overview ─────────────────────────────────────────────────────────────────
const DoctorOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      patientsAPI.stats().catch(() => null),
      alertsAPI
        .list({ hospital_id: user?.hospitalId })
        .catch(() => ({ alerts: [] })),
      patientsAPI
        .list({ hospital: user?.hospitalId, limit: 6 })
        .catch(() => ({ patients: [] })),
      analyticsAPI.diseaseTrends().catch(() => ({ monthly_trends: [] })),
    ]).then(([s, a, p, t]) => {
      setStats(s);
      setAlerts(a.alerts || []);
      setPatients(p.patients || []);
      setTrends(t.monthly_trends || []);
      setLoading(false);
    });
  }, [user]);

  const handleAcknowledge = async (alertId) => {
    await alertsAPI
      .acknowledge(alertId, {
        alert_id: alertId,
        doctor_id: user.userId,
        action: "acknowledged",
      })
      .catch(() => {});
    setAlerts((prev) =>
      prev.map((a) =>
        a.alert_id === alertId ? { ...a, status: "acknowledged" } : a,
      ),
    );
  };

  if (loading)
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );

  const byHospital = stats?.by_hospital?.find(
    (h) => h.hospital === user?.hospitalId,
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative min-h-screen overflow-hidden"
    >
      {/* AMBIENT BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* GRID */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)
          `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* GLOW */}
        <div
          className="
        absolute top-[-200px] left-[-200px]
        w-[500px] h-[500px]
        rounded-full
        bg-cyan-400/10
        blur-[120px]
      "
        />

        <div
          className="
        absolute bottom-[-200px] right-[-200px]
        w-[500px] h-[500px]
        rounded-full
        bg-red-400/10
        blur-[120px]
      "
        />
      </div>

      <div className="relative z-10">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <p
                className="
              text-[11px]
              uppercase
              tracking-[0.25em]
              text-cyan-300/70
              mb-3
            "
              >
                NFHIS PORTAL
              </p>

              <h1
                className="
              text-4xl
              lg:text-5xl
              font-semibold
              tracking-tight
              text-white
              mb-3
            "
              >
                Doctor Dashboard
              </h1>

              <p className="text-white/50 text-base">
                {user?.name} · {user?.hospitalId?.replace(/_/g, " ")}
              </p>
            </div>

            {/* LIVE STATUS */}
            <div className="flex items-center gap-4">
              <div
                className="
              px-4 py-3 rounded-2xl
              bg-white/[0.03]
              backdrop-blur-xl
            "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                  w-2.5 h-2.5 rounded-full
                  bg-green-400 animate-pulse
                "
                  />

                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">
                      AI Status
                    </p>

                    <p className="text-sm text-green-300">
                      Systems Operational
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="
              px-4 py-3 rounded-2xl
              bg-white/[0.03]
              backdrop-blur-xl
            "
              >
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                  Monitoring
                </p>

                <p className="text-lg font-semibold text-cyan-300">
                  247 Patients
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HERO AI SECTION */}
        <div
          className="
        relative overflow-hidden
        rounded-[32px]
        bg-white/[0.03]
        backdrop-blur-2xl
        p-8 mb-8
      "
        >
          {/* HERO GLOW */}
          <div
            className="
          absolute top-0 right-0
          w-[400px] h-[400px]
          bg-cyan-400/10
          blur-[120px]
        "
          />

          <div className="relative z-10">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* LEFT */}
              <div className="xl:col-span-2">
                <div
                  className="
                inline-flex items-center gap-2
                px-4 py-2 rounded-full
                bg-cyan-400/10
                text-cyan-300
                text-xs
                uppercase tracking-[0.2em]
                mb-6
              "
                >
                  <div
                    className="
                  w-2 h-2 rounded-full
                  bg-cyan-400 animate-pulse
                "
                  />
                  AI Medical Intelligence
                </div>

                <h2
                  className="
                text-4xl
                font-semibold
                tracking-tight
                text-white
                leading-tight
                mb-5
              "
                >
                  AI-assisted clinical decision intelligence
                </h2>

                <p
                  className="
                text-white/60
                text-lg
                leading-relaxed
                max-w-3xl
              "
                >
                  {/* LIVE AI VISUALIZATION */}
                  <div
                    className="
  mt-10
  rounded-[32px]
  bg-black/20
  border border-cyan-400/5
  p-6
  overflow-hidden
"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p
                          className="
        text-[11px]
        uppercase
        tracking-[0.2em]
        text-cyan-300/70
        mb-2
      "
                        >
                          LIVE MONITORING
                        </p>

                        <h3
                          className="
        text-2xl
        font-semibold
        text-white
      "
                        >
                          AI Vital Intelligence
                        </h3>
                      </div>

                      <div
                        className="
      flex items-center gap-2
      text-green-300 text-sm
    "
                      >
                        <div
                          className="
        w-2 h-2 rounded-full
        bg-green-400 animate-pulse
      "
                        />
                        LIVE
                      </div>
                    </div>

                    {/* ECG */}
                    <div
                      className="
    relative h-[180px]
    rounded-2xl
    bg-cyan-400/5
    overflow-hidden mb-6
  "
                    >
                      <svg
                        viewBox="0 0 1000 200"
                        className="absolute inset-0 w-full h-full"
                      >
                        <motion.path
                          d="
          M0 100
          L60 100
          L90 80
          L120 130
          L150 40
          L180 160
          L220 100
          L300 100
          L340 85
          L360 125
          L390 50
          L420 150
          L460 100
          L1000 100
        "
                          fill="none"
                          stroke="#00D4FF"
                          strokeWidth="4"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </svg>
                    </div>

                    {/* VITALS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        ["Heart Rate", "82 BPM"],
                        ["Oxygen", "97%"],
                        ["BP", "128/84"],
                        ["Status", "Stable"],
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="
          rounded-2xl
          bg-white/[0.03]
          p-4
        "
                        >
                          <p
                            className="
          text-[10px]
          uppercase
          tracking-[0.2em]
          text-white/40
          mb-2
        "
                          >
                            {item[0]}
                          </p>

                          <h4
                            className="
          text-lg
          font-semibold
          text-cyan-300
        "
                          >
                            {item[1]}
                          </h4>
                        </div>
                      ))}
                    </div>
                  </div>
                  Real-time disease monitoring, predictive diagnostics,
                  treatment optimization, emergency escalation analysis, and
                  AI-powered hospital intelligence.
                </p>
              </div>

              {/* RIGHT */}
              <div
                className="
    relative overflow-hidden
    rounded-[32px]
    bg-white/[0.03]
    backdrop-blur-2xl
    border border-white/5
    p-6
  "
              >
                {/* BACKGROUND EFFECTS */}
                <div
                  className="
    absolute inset-0
    bg-gradient-to-br
    from-cyan-400/5
    via-transparent
    to-blue-500/5
  "
                />

                <div
                  className="
    absolute -top-20 -right-20
    w-56 h-56
    rounded-full
    bg-cyan-400/10
    blur-[100px]
  "
                />

                <div className="relative z-10">
                  {/* HEADER */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p
                        className="
          text-[11px]
          uppercase
          tracking-[0.25em]
          text-cyan-300/70
          mb-2
        "
                      >
                        AI THINKING STREAM
                      </p>

                      <h3
                        className="
          text-2xl
          font-semibold
          tracking-tight
          text-white
        "
                      >
                        Clinical Intelligence
                      </h3>
                    </div>

                    <div className="relative">
                      <div
                        className="
          absolute inset-0
          rounded-full
          bg-green-400
          blur-md
          opacity-40
          animate-pulse
        "
                      />

                      <div
                        className="
          relative
          w-3 h-3 rounded-full
          bg-green-400
        "
                      />
                    </div>
                  </div>

                  {/* LIVE AI FEED */}
                  <div
                    className="
      rounded-3xl
      bg-black/20
      border border-cyan-400/5
      p-5
      mb-6
      overflow-hidden
    "
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <div
                        className="
          w-2 h-2 rounded-full
          bg-cyan-400 animate-pulse
        "
                      />

                      <p
                        className="
          text-[11px]
          uppercase
          tracking-[0.2em]
          text-cyan-300
        "
                      >
                        Live AI Activity
                      </p>
                    </div>

                    <div className="space-y-4">
                      {[
                        "Analyzing patient biomarkers...",
                        "Cross-referencing cardiovascular patterns...",
                        "Generating adaptive treatment strategy...",
                        "Evaluating recovery progression...",
                        "Optimizing predictive confidence...",
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: i * 0.15,
                            duration: 0.5,
                          }}
                          className="
              flex items-center gap-3
            "
                        >
                          <div
                            className="
              w-2 h-2 rounded-full
              bg-cyan-400 animate-pulse
            "
                          />

                          <p
                            className="
              text-sm
              text-white/65
              leading-relaxed
            "
                          >
                            {item}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* AI METRICS */}
                  <div className="space-y-5 mb-6">
                    {[
                      {
                        label: "Patients Monitored",
                        value: "247",
                        width: "78%",
                      },
                      {
                        label: "AI Models Active",
                        value: "12",
                        width: "86%",
                      },
                      {
                        label: "Prediction Accuracy",
                        value: "97.2%",
                        width: "97%",
                      },
                    ].map((metric, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-2">
                          <span className="text-white/50 text-sm">
                            {metric.label}
                          </span>

                          <span className="text-cyan-300 font-semibold">
                            {metric.value}
                          </span>
                        </div>

                        <div
                          className="
            h-2 rounded-full
            bg-white/10 overflow-hidden
          "
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: metric.width }}
                            transition={{
                              duration: 1.2,
                              delay: i * 0.2,
                            }}
                            className="
                h-full rounded-full
                bg-gradient-to-r
                from-cyan-400
                to-blue-400
              "
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SYSTEM STATUS */}
                  <div
                    className="
      rounded-2xl
      bg-cyan-400/5
      border border-cyan-400/10
      p-4
      mb-6
    "
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="
          w-2 h-2 rounded-full
          bg-green-400 animate-pulse
        "
                      />

                      <p
                        className="
          text-[11px]
          uppercase
          tracking-[0.2em]
          text-cyan-300
        "
                      >
                        Neural Systems Active
                      </p>
                    </div>

                    <p
                      className="
        text-sm
        text-white/60
        leading-relaxed
      "
                    >
                      All predictive AI systems synchronized successfully.
                      Real-time adaptive clinical intelligence currently
                      operational.
                    </p>
                  </div>

                  {/* BUTTON */}
                  <button
                    onClick={() => navigate("/doctor/copilot")}
                    className="
        group
        relative
        w-full
        py-4
        rounded-2xl
        overflow-hidden
        bg-cyan-400/10
        hover:bg-cyan-400/20
        border border-cyan-400/10
        transition-all duration-300
      "
                  >
                    <div
                      className="
        absolute inset-0
        opacity-0 group-hover:opacity-100
        transition-opacity
        bg-gradient-to-r
        from-cyan-400/10
        to-blue-500/10
      "
                    />

                    <span
                      className="
        relative z-10
        text-cyan-300
        font-medium
      "
                    >
                      Open AI Workspace →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Patients"
            value={byHospital?.count || patients.length}
            icon="👥"
            color="#00d4ff"
            trend={5}
          />

          <StatCard
            title="Alerts"
            value={alerts.filter((a) => a.status === "pending").length}
            icon="🔔"
            color="#ff4d6d"
            trend={-2}
          />

          <StatCard
            title="Diabetes Risk"
            value={`${(byHospital?.avg_diabetes_risk || 42.5).toFixed(1)}%`}
            icon="🩸"
            color="#00d4ff"
          />

          <StatCard
            title="Heart Risk"
            value={`${(byHospital?.avg_heart_risk || 38.2).toFixed(1)}%`}
            icon="❤️"
            color="#ff4d6d"
          />
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* ALERTS */}
          <div
            className="
          rounded-[32px]
          bg-white/[0.03]
          backdrop-blur-2xl
          p-6
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p
                  className="
                text-[11px]
                uppercase
                tracking-[0.2em]
                text-white/40
                mb-2
              "
                >
                  Emergency Alerts
                </p>

                <h3 className="text-2xl font-semibold text-white">
                  Active Alerts
                </h3>
              </div>

              <div
                className="
              px-3 py-2 rounded-xl
              bg-red-400/10
              text-red-300 text-sm
            "
              >
                {alerts.filter((a) => a.status === "pending").length}
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.alert_id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
            </div>
          </div>

          {/* CHART */}
          <div
            className="
          xl:col-span-2
          rounded-[32px]
          bg-white/[0.03]
          backdrop-blur-2xl
          p-6
        "
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <p
                  className="
                text-[11px]
                uppercase
                tracking-[0.2em]
                text-white/40
                mb-2
              "
                >
                  Disease Intelligence
                </p>

                <h3
                  className="
                text-3xl
                font-semibold
                tracking-tight
                text-white
              "
                >
                  Disease Trends
                </h3>
              </div>

              <div className="text-cyan-300 text-sm">12 Month Analysis</div>
            </div>

            <DiseaseTrendChart data={trends} />
          </div>
        </div>

        {/* PATIENT TABLE */}
        <div
          className="
        rounded-[32px]
        bg-white/[0.03]
        backdrop-blur-2xl
        p-6
      "
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <p
                className="
              text-[11px]
              uppercase
              tracking-[0.2em]
              text-white/40
              mb-2
            "
              >
                Patient Intelligence
              </p>

              <h3
                className="
              text-3xl
              font-semibold
              tracking-tight
              text-white
            "
              >
                Recent Patients
              </h3>
            </div>

            <button
              className="
            px-5 py-3 rounded-2xl
            bg-white/[0.03]
            hover:bg-white/[0.06]
            text-white/70
            transition-all
          "
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age/Gender</th>
                  <th>Glucose</th>
                  <th>BP</th>
                  <th>Cholesterol</th>
                  <th>Risk Level</th>
                  <th>Risk %</th>
                </tr>
              </thead>

              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-blue-300/40"
                    >
                      No patient data available
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <PatientRow key={p.patient_id || p.id} patient={p} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── XAI Panel ────────────────────────────────────────────────────────────────
const XAIPanel = () => {
  const [shapData, setShapData] = useState({
    diabetes: {},
    heart_disease: {},
    liver_disease: {},
  });
  const [selectedDisease, setSelectedDisease] = useState("diabetes");

  useEffect(() => {
    ["diabetes", "heart_disease", "liver_disease"].forEach((disease) => {
      predictionsAPI
        .shapDemo(disease)
        .then((d) =>
          setShapData((prev) => ({ ...prev, [disease]: d.shap_values })),
        )
        .catch(() => {});
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
        title="AI Explainer (XAI)"
        subtitle="SHAP-based feature importance analysis"
      />
      <div className="glass rounded-2xl p-6">
        <div className="flex gap-3 mb-6">
          {["diabetes", "heart_disease", "liver_disease"].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDisease(d)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${selectedDisease === d ? "btn-primary" : "btn-ghost"}`}
            >
              {d.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
        <SHAPChart
          data={shapData[selectedDisease]}
          title={`SHAP Values — ${selectedDisease.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}`}
        />
        <div
          className="mt-6 p-4 rounded-xl"
          style={{
            background: "rgba(0,212,255,0.05)",
            border: "1px solid rgba(0,212,255,0.1)",
          }}
        >
          <p className="text-xs text-blue-300/60 leading-relaxed">
            <span className="text-cyan-400 font-semibold">
              How to read this chart:
            </span>{" "}
            SHAP (SHapley Additive exPlanations) values show how much each
            feature contributes to the model's prediction. Higher values
            indicate stronger influence on the risk score. Positive values push
            the prediction toward disease; negative values push it away.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Patients List ────────────────────────────────────────────────────────────
const PatientsList = () => {
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    age: "",
    gender: "Male",
    glucose: "",
    blood_pressure: "",
    cholesterol: "",
  });

  // LOAD PATIENTS
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const apiPatients = await patientsAPI.list({
          hospital: user?.hospitalId,
          limit: 50,
        });

        const localPatients =
          JSON.parse(localStorage.getItem("nfhis_patients")) || [];

        setPatients([...localPatients, ...(apiPatients.patients || [])]);
      } catch {
        const localPatients =
          JSON.parse(localStorage.getItem("nfhis_patients")) || [];

        setPatients(localPatients);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [user]);

  // ADD PATIENT
  const handleAddPatient = () => {
    if (!newPatient.first_name || !newPatient.last_name || !newPatient.age) {
      return;
    }

    const patient = {
      ...newPatient,

      id: Date.now(),

      patient_id: "NFHIS-" + Math.floor(1000 + Math.random() * 9000),

      risk_score: Math.floor(40 + Math.random() * 60),

      glucose: newPatient.glucose || "110",

      blood_pressure: newPatient.blood_pressure || "120/80",

      cholesterol: newPatient.cholesterol || "190",
    };

    const updatedPatients = [patient, ...patients];

    setPatients(updatedPatients);

    localStorage.setItem("nfhis_patients", JSON.stringify(updatedPatients));

    setShowModal(false);

    setNewPatient({
      first_name: "",
      last_name: "",
      age: "",
      gender: "Male",
      glucose: "",
      blood_pressure: "",
      cholesterol: "",
    });
  };

  // FILTER
  const filtered = patients.filter(
    (p) =>
      !filter ||
      `${p.first_name} ${p.last_name} ${p.patient_id}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* HEADER */}
      <SectionHeader
        title="Patient Management"
        subtitle={`${patients.length} patients currently under monitoring`}
        action={
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="
                px-5 py-3 rounded-2xl
                bg-cyan-400/10
                hover:bg-cyan-400/20
                border border-cyan-400/10
                text-cyan-300
                transition-all
                text-sm
              "
            >
              + Add Patient
            </button>

            <button
              onClick={() => navigate("/predict")}
              className="btn-primary text-sm"
            >
              + Run Prediction
            </button>
          </div>
        }
      />

      {/* MAIN PANEL */}
      <div
        className="
          rounded-[32px]
          bg-white/[0.03]
          backdrop-blur-2xl
          border border-white/5
          p-6
          relative overflow-hidden
        "
      >
        {/* GLOW */}
        <div
          className="
            absolute top-0 right-0
            w-[300px] h-[300px]
            bg-cyan-400/10
            blur-[120px]
          "
        />

        <div className="relative z-10">
          {/* TOP BAR */}
          <div
            className="
            flex flex-col lg:flex-row
            lg:items-center
            lg:justify-between
            gap-4 mb-6
          "
          >
            <div>
              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-[0.2em]
                  text-white/40
                  mb-2
                "
              >
                LIVE PATIENT DATABASE
              </p>

              <h3
                className="
                  text-3xl font-semibold
                  tracking-tight
                  text-white
                "
              >
                My Patients
              </h3>
            </div>

            {/* SEARCH */}
            <div className="w-full lg:w-[350px]">
              <input
                className="input-field"
                placeholder="Search patient by name or ID..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="
                    h-14 rounded-2xl
                  "
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Age/Gender</th>
                    <th>Glucose</th>
                    <th>BP</th>
                    <th>Cholesterol</th>
                    <th>Risk Level</th>
                    <th>Risk %</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="
                          text-center
                          py-10
                          text-blue-300/40
                        "
                      >
                        No patients found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <PatientRow
                        key={p.patient_id || p.id}
                        patient={p}
                        onSelect={() =>
                          navigate(`/doctor/patient/${p.patient_id}`)
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD PATIENT MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              fixed inset-0 z-50
              bg-black/60
              backdrop-blur-md
              flex items-center justify-center
              p-6
            "
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 30,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
              }}
              className="
                w-full max-w-2xl
                rounded-[32px]
                bg-[#071028]
                border border-cyan-400/10
                p-8
                relative overflow-hidden
              "
            >
              {/* GLOW */}
              <div
                className="
                  absolute top-0 right-0
                  w-[250px] h-[250px]
                  bg-cyan-400/10
                  blur-[100px]
                "
              />

              <div className="relative z-10">
                {/* HEADER */}
                <div className="mb-8">
                  <div
                    className="
                      inline-flex items-center gap-2
                      px-4 py-2 rounded-full
                      bg-cyan-400/10
                      text-cyan-300
                      text-xs uppercase
                      tracking-[0.2em]
                      mb-5
                    "
                  >
                    <div
                      className="
                        w-2 h-2 rounded-full
                        bg-cyan-400 animate-pulse
                      "
                    />
                    PATIENT REGISTRATION
                  </div>

                  <h2
                    className="
                      text-3xl font-semibold
                      text-white
                      mb-3
                    "
                  >
                    Add New Patient
                  </h2>

                  <p className="text-white/50">
                    Register patient into the NFHIS intelligence system
                  </p>
                </div>

                {/* FORM */}
                <div
                  className="
                  grid grid-cols-1 md:grid-cols-2
                  gap-5
                "
                >
                  <input
                    className="input-field"
                    placeholder="First Name"
                    value={newPatient.first_name}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        first_name: e.target.value,
                      })
                    }
                  />

                  <input
                    className="input-field"
                    placeholder="Last Name"
                    value={newPatient.last_name}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        last_name: e.target.value,
                      })
                    }
                  />

                  <input
                    className="input-field"
                    placeholder="Age"
                    value={newPatient.age}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        age: e.target.value,
                      })
                    }
                  />

                  <select
                    className="input-field"
                    value={newPatient.gender}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        gender: e.target.value,
                      })
                    }
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>

                  <input
                    className="input-field"
                    placeholder="Glucose"
                    value={newPatient.glucose}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        glucose: e.target.value,
                      })
                    }
                  />

                  <input
                    className="input-field"
                    placeholder="Blood Pressure"
                    value={newPatient.blood_pressure}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        blood_pressure: e.target.value,
                      })
                    }
                  />

                  <input
                    className="
                      input-field md:col-span-2
                    "
                    placeholder="Cholesterol"
                    value={newPatient.cholesterol}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        cholesterol: e.target.value,
                      })
                    }
                  />
                </div>

                {/* ACTIONS */}
                <div
                  className="
                    flex justify-end gap-4
                    mt-8
                  "
                >
                  <button
                    onClick={() => setShowModal(false)}
                    className="
                      px-5 py-3 rounded-2xl
                      bg-white/[0.03]
                      hover:bg-white/[0.06]
                      text-white/60
                      transition-all
                    "
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleAddPatient}
                    className="
                      px-6 py-3 rounded-2xl
                      bg-cyan-400/10
                      hover:bg-cyan-400/20
                      border border-cyan-400/10
                      text-cyan-300
                      transition-all
                    "
                  >
                    Save Patient →
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Alerts View ──────────────────────────────────────────────────────────────
const AlertsView = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    alertsAPI
      .list({})
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {});
  }, []);

  const handleAck = async (id) => {
    await alertsAPI
      .acknowledge(id, {
        alert_id: id,
        doctor_id: user.userId,
        action: "acknowledged",
      })
      .catch(() => {});
    setAlerts((prev) =>
      prev.map((a) =>
        a.alert_id === id ? { ...a, status: "acknowledged" } : a,
      ),
    );
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
        title="Patient Alerts"
        subtitle={`${alerts.filter((a) => a.status === "pending").length} pending alerts`}
      />
      <div className="glass rounded-2xl p-5">
        {alerts.map((a) => (
          <AlertCard key={a.alert_id} alert={a} onAcknowledge={handleAck} />
        ))}
      </div>
    </motion.div>
  );
};

export default function DoctorDashboard() {
  return (
    <Routes>
      <Route index element={<DoctorOverview />} />

      <Route path="patients" element={<PatientsList />} />

      <Route path="patient/:id" element={<PatientProfile />} />

      <Route path="alerts" element={<AlertsView />} />

      <Route path="xai" element={<XAIPanel />} />

      <Route path="copilot" element={<AICopilotPage />} />
    </Routes>
  );
}
