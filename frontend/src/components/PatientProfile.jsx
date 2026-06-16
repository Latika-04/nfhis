import React, { useEffect, useState } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";

export default function PatientProfile() {

  const navigate = useNavigate();

  const { id } = useParams();

  const [patient, setPatient] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [showUpdateModal, setShowUpdateModal] =
    useState(false);

  const [updatedData, setUpdatedData] =
    useState({
      glucose: "",
      blood_pressure: "",
      cholesterol: "",
    });

  // LOAD PATIENT
  useEffect(() => {

    const patients =
      JSON.parse(
        localStorage.getItem(
          "nfhis_patients"
        )
      ) || [];

    const foundPatient =
      patients.find(
        (p) =>
          p.patient_id === id
      );

    if (foundPatient) {

      setPatient(foundPatient);

      setHistory(
        foundPatient.history || []
      );

      setUpdatedData({
        glucose:
          foundPatient.glucose || "",

        blood_pressure:
          foundPatient.blood_pressure || "",

        cholesterol:
          foundPatient.cholesterol || "",
      });

    }

  }, [id]);

  // UPDATE PATIENT
  const handleUpdatePatient = () => {

    const patients =
      JSON.parse(
        localStorage.getItem(
          "nfhis_patients"
        )
      ) || [];

    const updatedPatients =
      patients.map((p) => {

        if (
          p.patient_id !== patient.patient_id
        )
          return p;

        const historyEntry = {

          timestamp:
            new Date().toISOString(),

          updated_by:
            "Nurse Staff",

          role: "nurse",

          previous: {
            glucose: p.glucose,
            blood_pressure:
              p.blood_pressure,
            cholesterol:
              p.cholesterol,
          },

          updated: {
            glucose:
              updatedData.glucose,

            blood_pressure:
              updatedData.blood_pressure,

            cholesterol:
              updatedData.cholesterol,
          },

        };

        const updatedPatient = {

          ...p,

          glucose:
            updatedData.glucose,

          blood_pressure:
            updatedData.blood_pressure,

          cholesterol:
            updatedData.cholesterol,

          history: [
            ...(p.history || []),
            historyEntry,
          ],

        };

        setPatient(updatedPatient);

        setHistory(
          updatedPatient.history
        );

        return updatedPatient;

      });

    localStorage.setItem(
      "nfhis_patients",
      JSON.stringify(updatedPatients)
    );

    setShowUpdateModal(false);

  };

  if (!patient) {

    return (

      <div className="
        min-h-screen
        flex items-center justify-center
        text-white text-xl
      ">

        Patient not found

      </div>

    );
  }

  // AI RISK ANALYSIS
  const diabetesRisk =
    patient.glucose > 150
      ? 88
      : patient.glucose > 120
      ? 64
      : 34;

  const heartRisk =
    patient.cholesterol > 240
      ? 79
      : patient.cholesterol > 200
      ? 55
      : 24;

  const liverRisk =
    patient.cholesterol > 260
      ? 68
      : 21;

  return (

    <div className="
      min-h-screen
      p-6
      relative overflow-hidden
    ">

      {/* BG */}
      <div className="
        absolute inset-0
        bg-grid opacity-30
      " />

      {/* GLOW */}
      <div className="
        absolute top-0 right-0
        w-[500px] h-[500px]
        bg-cyan-400/10
        blur-[150px]
      " />

      <div className="
        relative z-10
      ">

        {/* HEADER */}
        <div className="
          flex flex-col lg:flex-row
          lg:items-center
          lg:justify-between
          gap-6 mb-8
        ">

          <div>

            <button
              onClick={() =>
                navigate("/doctor/patients")
              }
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

            <div className="
              inline-flex items-center gap-2
              px-4 py-2 rounded-full
              bg-cyan-400/10
              text-cyan-300
              text-xs uppercase
              tracking-[0.2em]
              mb-5
            ">

              <div className="
                w-2 h-2 rounded-full
                bg-cyan-400 animate-pulse
              " />

              AI PATIENT WORKSPACE

            </div>

            <h1 className="
              text-5xl font-bold
              text-white mb-3
            ">

              {patient.first_name}
              {" "}
              {patient.last_name}

            </h1>

            <p className="
              text-blue-300/50 text-lg
            ">

              Patient ID:
              {" "}
              {patient.patient_id}

            </p>

          </div>

          {/* STATUS CARD */}
          <div className="
            rounded-[32px]
            bg-white/[0.03]
            border border-cyan-400/10
            p-6
            min-w-[260px]
          ">

            <p className="
              text-xs uppercase
              tracking-[0.2em]
              text-white/40 mb-4
            ">
              LIVE STATUS
            </p>

            <div className="
              flex items-center gap-3 mb-5
            ">

              <div className="
                w-3 h-3 rounded-full
                bg-green-400 animate-pulse
              " />

              <span className="
                text-green-300 text-xl
                font-semibold
              ">
                Stable
              </span>

            </div>

            <div className="
              space-y-3
              text-white/60
            ">

              <p>
                Age:
                {" "}
                {patient.age}
              </p>

              <p>
                Gender:
                {" "}
                {patient.gender}
              </p>

              <p>
                Monitoring:
                {" "}
                Active
              </p>

            </div>

          </div>

        </div>

        {/* AI RISKS */}
        <div className="
          grid grid-cols-1 md:grid-cols-3
          gap-6 mb-8
        ">

          {[
            {
              title: "Diabetes Risk",
              value: `${diabetesRisk}%`,
              color: "#00d4ff",
            },

            {
              title: "Heart Risk",
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
                bg-white/[0.03]
                border border-white/5
                p-6
              "
            >

              <p className="
                text-white/40 text-sm mb-3
              ">
                {item.title}
              </p>

              <h2
                className="
                  text-5xl font-bold
                "
                style={{
                  color: item.color,
                }}
              >
                {item.value}
              </h2>

            </motion.div>

          ))}

        </div>

        {/* MAIN GRID */}
        <div className="
          grid grid-cols-1 xl:grid-cols-3
          gap-6
        ">

          {/* LEFT */}
          <div className="
            xl:col-span-2
            space-y-6
          ">

            {/* LIVE VITALS */}
            <div className="
              rounded-[32px]
              bg-white/[0.03]
              border border-white/5
              p-8
            ">

              <div className="mb-8">

                <p className="
                  text-xs uppercase
                  tracking-[0.2em]
                  text-cyan-300/70 mb-3
                ">
                  LIVE BIOMETRICS
                </p>

                <h2 className="
                  text-3xl font-semibold
                  text-white
                ">
                  Patient Vitals
                </h2>

              </div>

              <div className="
                grid grid-cols-2 md:grid-cols-4
                gap-5
              ">

                {[
                  {
                    label: "Glucose",
                    value:
                      patient.glucose || "110",
                    color: "#00d4ff",
                  },

                  {
                    label: "Blood Pressure",
                    value:
                      patient.blood_pressure ||
                      "120/80",
                    color: "#ff7a2e",
                  },

                  {
                    label: "Cholesterol",
                    value:
                      patient.cholesterol ||
                      "190",
                    color: "#ffd166",
                  },

                  {
                    label: "Oxygen",
                    value: "97%",
                    color: "#00ff87",
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

                    <p className="
                      text-white/40
                      text-xs uppercase
                      tracking-[0.2em]
                      mb-3
                    ">
                      {item.label}
                    </p>

                    <h3
                      className="
                        text-3xl font-bold
                      "
                      style={{
                        color: item.color,
                      }}
                    >
                      {item.value}
                    </h3>

                  </div>

                ))}

              </div>

            </div>

            {/* ACTION BUTTONS */}
            <div className="
              grid grid-cols-1 md:grid-cols-2
              gap-5
            ">

              <button
                onClick={() =>
                  navigate(
                    `/doctor/report/${patient.patient_id}`
                  )
                }
                className="
                  rounded-[32px]
                  p-8
                  bg-cyan-400/10
                  hover:bg-cyan-400/20
                  border border-cyan-400/10
                  transition-all
                  text-left
                "
              >

                <div className="
                  text-5xl mb-5
                ">
                  📄
                </div>

                <h3 className="
                  text-2xl font-semibold
                  text-white mb-3
                ">
                  Generate Full Report
                </h3>

                <p className="
                  text-white/50
                  leading-relaxed
                ">
                  AI-powered diagnostic report
                  with explainable AI analysis
                  and treatment recommendations.
                </p>

              </button>

              <button
                onClick={() =>
                  setShowUpdateModal(true)
                }
                className="
                  rounded-[32px]
                  p-8
                  bg-orange-400/10
                  hover:bg-orange-400/20
                  border border-orange-400/10
                  transition-all
                  text-left
                "
              >

                <div className="
                  text-5xl mb-5
                ">
                  ✏
                </div>

                <h3 className="
                  text-2xl font-semibold
                  text-white mb-3
                ">
                  Update Patient Data
                </h3>

                <p className="
                  text-white/50
                  leading-relaxed
                ">
                  Modify patient vitals while
                  preserving immutable audit history.
                </p>

              </button>

            </div>

            {/* IMMUTABLE HISTORY */}
            <div className="
              rounded-[32px]
              bg-white/[0.03]
              border border-white/5
              p-8
            ">

              <div className="mb-8">

                <p className="
                  text-xs uppercase
                  tracking-[0.2em]
                  text-cyan-300/70 mb-3
                ">
                  MEDICAL AUDIT TRAIL
                </p>

                <h2 className="
                  text-3xl font-semibold
                  text-white
                ">
                  Immutable Timeline
                </h2>

              </div>

              <div className="
                space-y-5
              ">

                {history.length === 0 ? (

                  <div className="
                    text-white/40
                  ">
                    No history available yet
                  </div>

                ) : (

                  history.map((entry, i) => (

                    <div
                      key={i}
                      className="
                        rounded-3xl
                        bg-black/20
                        border border-white/5
                        p-5
                      "
                    >

                      <div className="
                        flex items-center
                        justify-between mb-5
                      ">

                        <div>

                          <p className="
                            text-white
                            font-medium
                          ">
                            {entry.updated_by}
                          </p>

                          <p className="
                            text-white/40
                            text-sm
                          ">
                            {entry.role}
                          </p>

                        </div>

                        <div className="
                          text-cyan-300
                          text-sm
                        ">
                          {new Date(
                            entry.timestamp
                          ).toLocaleString()}
                        </div>

                      </div>

                      <div className="
                        grid grid-cols-2 gap-5
                      ">

                        <div>

                          <p className="
                            text-white/40
                            text-xs uppercase
                            mb-3
                          ">
                            Previous Values
                          </p>

                          <div className="
                            space-y-2
                            text-white/60
                            text-sm
                          ">

                            <p>
                              Glucose:
                              {" "}
                              {entry.previous?.glucose}
                            </p>

                            <p>
                              BP:
                              {" "}
                              {entry.previous?.blood_pressure}
                            </p>

                          </div>

                        </div>

                        <div>

                          <p className="
                            text-cyan-300
                            text-xs uppercase
                            mb-3
                          ">
                            Updated Values
                          </p>

                          <div className="
                            space-y-2
                            text-cyan-200
                            text-sm
                          ">

                            <p>
                              Glucose:
                              {" "}
                              {entry.updated?.glucose}
                            </p>

                            <p>
                              BP:
                              {" "}
                              {entry.updated?.blood_pressure}
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                  ))

                )}

              </div>

            </div>

          </div>

          {/* RIGHT */}
          <div className="
            space-y-6
          ">

            {/* AI COPILOT */}
            <div className="
              rounded-[32px]
              bg-white/[0.03]
              border border-cyan-400/10
              p-6
              relative overflow-hidden
            ">

              <div className="
                absolute top-0 right-0
                w-[220px] h-[220px]
                bg-cyan-400/10
                blur-[100px]
              " />

              <div className="
                relative z-10
              ">

                <div className="
                  flex items-center gap-2
                  mb-5
                ">

                  <div className="
                    w-2 h-2 rounded-full
                    bg-cyan-400 animate-pulse
                  " />

                  <p className="
                    text-cyan-300
                    text-xs uppercase
                    tracking-[0.2em]
                  ">
                    AI MEDICAL COPILOT
                  </p>

                </div>

                <h2 className="
                  text-2xl font-semibold
                  text-white mb-6
                ">
                  AI Clinical Analysis
                </h2>

                <div className="
                  space-y-4
                  text-sm text-white/70
                ">

                  <div className="
                    rounded-2xl
                    bg-white/[0.03]
                    p-4
                  ">
                    Elevated glucose patterns
                    indicate diabetic progression risk.
                  </div>

                  <div className="
                    rounded-2xl
                    bg-white/[0.03]
                    p-4
                  ">
                    Cardiovascular monitoring
                    strongly recommended.
                  </div>

                  <div className="
                    rounded-2xl
                    bg-white/[0.03]
                    p-4
                  ">
                    AI suggests ECG and
                    HbA1c evaluation.
                  </div>

                </div>

              </div>

            </div>

            {/* XAI */}
            <div className="
              rounded-[32px]
              bg-white/[0.03]
              border border-purple-400/10
              p-6
            ">

              <p className="
                text-xs uppercase
                tracking-[0.2em]
                text-purple-300/70 mb-4
              ">
                XAI EXPLANATION
              </p>

              <h2 className="
                text-2xl font-semibold
                text-white mb-6
              ">
                Explainable AI Reasoning
              </h2>

              <div className="
                space-y-4
              ">

                {[
                  {
                    factor:
                      "High glucose contributed",
                    value: "41%",
                  },

                  {
                    factor:
                      "BP instability contributed",
                    value: "28%",
                  },

                  {
                    factor:
                      "Cholesterol pattern contributed",
                    value: "19%",
                  },

                ].map((item, i) => (

                  <div
                    key={i}
                    className="
                      rounded-2xl
                      bg-black/20
                      border border-white/5
                      p-4
                    "
                  >

                    <div className="
                      flex items-center
                      justify-between
                    ">

                      <p className="
                        text-white/70 text-sm
                      ">
                        {item.factor}
                      </p>

                      <div className="
                        text-purple-300
                        font-semibold
                      ">
                        {item.value}
                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* UPDATE MODAL */}
      <AnimatePresence>

        {showUpdateModal && (

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
                w-full max-w-xl
                rounded-[32px]
                bg-[#071028]
                border border-cyan-400/10
                p-8
              "
            >

              <div className="mb-8">

                <p className="
                  text-xs uppercase
                  tracking-[0.2em]
                  text-cyan-300/70 mb-3
                ">
                  UPDATE PATIENT
                </p>

                <h2 className="
                  text-3xl font-semibold
                  text-white
                ">
                  Update Medical Data
                </h2>

              </div>

              <div className="
                space-y-5
              ">

                <input
                  className="input-field"
                  placeholder="Glucose"
                  value={updatedData.glucose}
                  onChange={(e) =>
                    setUpdatedData({
                      ...updatedData,
                      glucose:
                        e.target.value,
                    })
                  }
                />

                <input
                  className="input-field"
                  placeholder="Blood Pressure"
                  value={
                    updatedData.blood_pressure
                  }
                  onChange={(e) =>
                    setUpdatedData({
                      ...updatedData,
                      blood_pressure:
                        e.target.value,
                    })
                  }
                />

                <input
                  className="input-field"
                  placeholder="Cholesterol"
                  value={
                    updatedData.cholesterol
                  }
                  onChange={(e) =>
                    setUpdatedData({
                      ...updatedData,
                      cholesterol:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div className="
                flex justify-end gap-4
                mt-8
              ">

                <button
                  onClick={() =>
                    setShowUpdateModal(false)
                  }
                  className="
                    px-5 py-3 rounded-2xl
                    bg-white/[0.03]
                    text-white/60
                  "
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdatePatient}
                  className="
                    px-6 py-3 rounded-2xl
                    bg-cyan-400/10
                    border border-cyan-400/10
                    text-cyan-300
                  "
                >
                  Save Changes →
                </button>

              </div>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}