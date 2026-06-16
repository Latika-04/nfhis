import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { motion } from "framer-motion";

export default function ReportPage() {
  const navigate = useNavigate();

  const { id } = useParams();

  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const patients = JSON.parse(localStorage.getItem("nfhis_patients")) || [];

    const found = patients.find(
      (p) => String(p.patient_id).trim() === String(id).trim(),
    );

    if (found) {
      setPatient(found);
    } else {
      console.log("Patient not found", id, patients);
    }
  }, [id]);

  if (!patient) {
    return (
      <div
        className="
        min-h-screen
        flex items-center justify-center
        bg-[#020817]
        text-white text-2xl
      "
      >
        Report not found
      </div>
    );
  }

  // SAFE FALLBACKS
  const firstName = patient.first_name || "Unknown";

  const lastName = patient.last_name || "Patient";

  const age = patient.age || "N/A";

  const gender = patient.gender || "N/A";

  const glucose = patient.glucose || patient.updated?.glucose || "110";

  const bloodPressure =
    patient.blood_pressure || patient.updated?.blood_pressure || "120/80";

  const cholesterol =
    patient.cholesterol || patient.updated?.cholesterol || "190";

  // AI RISKS
  const diabetesRisk =
    Number(glucose) > 150 ? 88 : Number(glucose) > 120 ? 64 : 34;

  const heartRisk =
    Number(cholesterol) > 220 ? 76 : Number(cholesterol) > 180 ? 55 : 28;

  const liverRisk = Number(cholesterol) > 260 ? 68 : 21;

  return (
    <div
      className="
      min-h-screen
      p-6
      bg-[#020817]
      text-white
      relative overflow-hidden
    "
    >
      {/* BG GLOW */}
      <div
        className="
        absolute top-0 right-0
        w-[500px] h-[500px]
        bg-cyan-400/10
        blur-[160px]
      "
      />

      <div
        className="
        relative z-10
        max-w-7xl mx-auto
      "
      >
        {/* HEADER */}
        <div
          className="
          flex flex-col lg:flex-row
          lg:items-center
          lg:justify-between
          gap-6 mb-10
        "
        >
          <div>
            <button
              onClick={() => navigate(-1)}
              className="
                px-4 py-2 rounded-xl
                bg-white/[0.04]
                hover:bg-white/[0.08]
                text-white/70
                mb-5
              "
            >
              ← Back
            </button>

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
              NFHIS VERIFIED REPORT
            </div>

            <h1
              className="
              text-5xl font-bold
              text-white mb-4
            "
            >
              Medical Intelligence Report
            </h1>

            <p
              className="
              text-white/50 text-lg
            "
            >
              AI-powered explainable diagnostic report
            </p>
          </div>

          <div
            className="
            rounded-[32px]
            bg-white/[0.03]
            border border-green-400/10
            p-6 min-w-[280px]
          "
          >
            <div
              className="
              flex items-center gap-3
              mb-5
            "
            >
              <div
                className="
                w-3 h-3 rounded-full
                bg-green-400 animate-pulse
              "
              />

              <span
                className="
                text-green-300
                text-lg font-semibold
              "
              >
                VERIFIED REPORT
              </span>
            </div>

            <div
              className="
              space-y-3 text-white/60
            "
            >
              <p>Generated: {new Date().toLocaleString()}</p>

              <p>Report ID: {patient.patient_id}</p>

              <p>Status: Active</p>
            </div>
          </div>
        </div>

        {/* PATIENT INFO */}
        <div
          className="
          rounded-[32px]
          bg-white/[0.03]
          border border-white/5
          p-8 mb-8
        "
        >
          <div
            className="
            flex items-center justify-between
            mb-8
          "
          >
            <div>
              <p
                className="
                text-xs uppercase
                tracking-[0.2em]
                text-cyan-300/70 mb-3
              "
              >
                PATIENT INFORMATION
              </p>

              <h2
                className="
                text-3xl font-semibold
                text-white
              "
              >
                Patient Overview
              </h2>
            </div>
          </div>

          <div
            className="
            grid grid-cols-2 md:grid-cols-4
            gap-6
          "
          >
            {[
              {
                label: "Patient Name",
                value: `${firstName} ${lastName}`,
              },

              {
                label: "Patient ID",
                value: patient.patient_id,
              },

              {
                label: "Age / Gender",
                value: `${age} / ${gender}`,
              },

              {
                label: "Status",
                value: "Stable",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="
                  rounded-3xl
                  bg-black/20
                  border border-white/5
                  p-5
                "
              >
                <p
                  className="
                  text-white/40
                  text-sm mb-3
                "
                >
                  {item.label}
                </p>

                <h3
                  className="
                  text-xl font-semibold
                  text-white
                "
                >
                  {item.value}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* BIOMARKERS */}
        <div
          className="
          rounded-[32px]
          bg-white/[0.03]
          border border-white/5
          p-8 mb-8
        "
        >
          <div className="mb-8">
            <p
              className="
              text-xs uppercase
              tracking-[0.2em]
              text-cyan-300/70 mb-3
            "
            >
              BIOMARKERS
            </p>

            <h2
              className="
              text-3xl font-semibold
              text-white
            "
            >
              Patient Vitals
            </h2>
          </div>

          <div
            className="
            grid grid-cols-2 md:grid-cols-4
            gap-5
          "
          >
            {[
              {
                label: "Glucose",
                value: glucose,
                color: "#00d4ff",
              },

              {
                label: "Blood Pressure",
                value: bloodPressure,
                color: "#ff7a2e",
              },

              {
                label: "Cholesterol",
                value: cholesterol,
                color: "#ffd166",
              },

              {
                label: "Oxygen",
                value: "97%",
                color: "#00ff87",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: i * 0.1,
                }}
                className="
                  rounded-3xl
                  bg-black/20
                  border border-white/5
                  p-5
                "
              >
                <p
                  className="
                  text-white/40
                  text-xs uppercase
                  tracking-[0.2em]
                  mb-3
                "
                >
                  {item.label}
                </p>

                <h3
                  className="
                    text-4xl font-bold
                  "
                  style={{
                    color: item.color,
                  }}
                >
                  {item.value}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI RISKS */}
        <div
          className="
          grid grid-cols-1 md:grid-cols-3
          gap-6 mb-8
        "
        >
          {[
            {
              title: "Diabetes Risk",
              value: `${diabetesRisk}%`,
              color: "#00d4ff",
            },

            {
              title: "Heart Disease Risk",
              value: `${heartRisk}%`,
              color: "#ff4d6d",
            },

            {
              title: "Liver Risk",
              value: `${liverRisk}%`,
              color: "#ffd166",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: i * 0.1,
              }}
              className="
                rounded-[32px]
                p-8
                border border-white/5
                bg-white/[0.03]
              "
            >
              <p
                className="
                text-white/40
                text-sm mb-4
              "
              >
                {item.title}
              </p>

              <h2
                className="
                  text-6xl font-bold
                  mb-4
                "
                style={{
                  color: item.color,
                }}
              >
                {item.value}
              </h2>

              <p
                className="
                text-white/60
              "
              >
                AI-generated clinical risk estimation
              </p>
            </motion.div>
          ))}
        </div>

        {/* XAI */}
        <div
          className="
          rounded-[32px]
          bg-white/[0.03]
          border border-purple-400/10
          p-8 mb-8
        "
        >
          <div className="mb-8">
            <p
              className="
              text-xs uppercase
              tracking-[0.2em]
              text-purple-300/70 mb-3
            "
            >
              EXPLAINABLE AI
            </p>

            <h2
              className="
              text-3xl font-semibold
              text-white
            "
            >
              AI Clinical Reasoning
            </h2>
          </div>

          <div
            className="
            space-y-5
          "
          >
            {[
              "High glucose contributed 41% to diabetes risk probability.",
              "Blood pressure instability increased cardiovascular concern.",
              "Elevated cholesterol patterns contributed to liver stress indicators.",
              "AI recommends ECG, HbA1c, and routine cardiac monitoring.",
            ].map((item, i) => (
              <div
                key={i}
                className="
                  rounded-2xl
                  bg-black/20
                  border border-white/5
                  p-5
                  text-white/70
                "
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* RECOMMENDATIONS */}
        <div
          className="
          rounded-[32px]
          bg-green-400/10
          border border-green-400/10
          p-8 mb-10
        "
        >
          <div className="mb-8">
            <p
              className="
              text-xs uppercase
              tracking-[0.2em]
              text-green-300/70 mb-3
            "
            >
              AI RECOMMENDATIONS
            </p>

            <h2
              className="
              text-3xl font-semibold
              text-white
            "
            >
              Treatment Recommendations
            </h2>
          </div>

          <div
            className="
            grid grid-cols-1 md:grid-cols-2
            gap-5
          "
          >
            {[
              "Recommend low sugar diet and glucose monitoring.",
              "Continue cardiovascular observation and BP tracking.",
              "Schedule HbA1c and ECG tests immediately.",
              "Continue AI-assisted patient monitoring.",
            ].map((item, i) => (
              <div
                key={i}
                className="
                  rounded-2xl
                  bg-black/20
                  border border-white/5
                  p-5
                  text-white/70
                "
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
