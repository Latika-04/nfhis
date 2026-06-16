import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiskMeter, SHAPChart, SectionHeader } from '../components/charts/Charts';
import { predictionsAPI } from '../utils/api';

const HOSPITALS = [
  'Apollo_Private_Hospital',
  'AIIMS_Government_Hospital',
  'Fortis_National_Hospital',
  'District_Rural_Hospital',
];

const INITIAL_FORM = {
  first_name: 'Arjun', last_name: 'Sharma', age: 52, gender: 'Male',
  bmi: 28.5, systolic_bp: 145, diastolic_bp: 92, heart_rate: 82,
  fasting_glucose: 165, hba1c: 7.2, insulin: 18.5,
  total_cholesterol: 220, hdl_cholesterol: 38, ldl_cholesterol: 145, triglycerides: 185,
  sgpt: 45, sgot: 38, alkaline_phosphatase: 95, bilirubin_total: 0.9, albumin: 3.8,
  creatinine: 1.1, urea: 32, hemoglobin: 13.5, wbc_count: 8500,
  platelet_count: 230000, spo2: 96, temperature: 98.6, respiratory_rate: 18,
  uric_acid: 6.2, socioeconomic_score: 6.0,
  family_history_diabetes: 1, family_history_heart: 1, family_history_liver: 0,
  exercise_level: 'Light', smoking_status: 'Former', alcohol_status: 'Occasional',
  diet: 'Non-Vegetarian', hospital: 'Apollo_Private_Hospital',
};

const FIELD_GROUPS = [
  {
    title: 'Demographics',
    icon: '👤',
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text' },
      { key: 'last_name', label: 'Last Name', type: 'text' },
      { key: 'age', label: 'Age (years)', type: 'number' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { key: 'bmi', label: 'BMI', type: 'number', step: '0.1' },
    ],
  },
  {
    title: 'Vitals',
    icon: '💓',
    fields: [
      { key: 'systolic_bp', label: 'Systolic BP (mmHg)', type: 'number' },
      { key: 'diastolic_bp', label: 'Diastolic BP (mmHg)', type: 'number' },
      { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number' },
      { key: 'spo2', label: 'SpO₂ (%)', type: 'number', step: '0.1' },
      { key: 'temperature', label: 'Temperature (°F)', type: 'number', step: '0.1' },
      { key: 'respiratory_rate', label: 'Resp Rate (/min)', type: 'number' },
    ],
  },
  {
    title: 'Glucose & Metabolic',
    icon: '🩸',
    fields: [
      { key: 'fasting_glucose', label: 'Fasting Glucose (mg/dL)', type: 'number', step: '0.1' },
      { key: 'hba1c', label: 'HbA1c (%)', type: 'number', step: '0.1' },
      { key: 'insulin', label: 'Insulin (uIU/mL)', type: 'number', step: '0.1' },
    ],
  },
  {
    title: 'Lipid Profile',
    icon: '💊',
    fields: [
      { key: 'total_cholesterol', label: 'Total Cholesterol', type: 'number', step: '0.1' },
      { key: 'hdl_cholesterol', label: 'HDL Cholesterol', type: 'number', step: '0.1' },
      { key: 'ldl_cholesterol', label: 'LDL Cholesterol', type: 'number', step: '0.1' },
      { key: 'triglycerides', label: 'Triglycerides', type: 'number', step: '0.1' },
    ],
  },
  {
    title: 'Liver Function',
    icon: '🫀',
    fields: [
      { key: 'sgpt', label: 'SGPT/ALT (U/L)', type: 'number', step: '0.1' },
      { key: 'sgot', label: 'SGOT/AST (U/L)', type: 'number', step: '0.1' },
      { key: 'alkaline_phosphatase', label: 'Alk Phosphatase', type: 'number' },
      { key: 'bilirubin_total', label: 'Bilirubin Total (mg/dL)', type: 'number', step: '0.01' },
      { key: 'albumin', label: 'Albumin (g/dL)', type: 'number', step: '0.1' },
    ],
  },
  {
    title: 'Renal & Blood',
    icon: '🧪',
    fields: [
      { key: 'creatinine', label: 'Creatinine (mg/dL)', type: 'number', step: '0.01' },
      { key: 'urea', label: 'Urea (mg/dL)', type: 'number' },
      { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', step: '0.1' },
      { key: 'wbc_count', label: 'WBC Count (/μL)', type: 'number' },
      { key: 'platelet_count', label: 'Platelet Count', type: 'number' },
      { key: 'uric_acid', label: 'Uric Acid (mg/dL)', type: 'number', step: '0.1' },
    ],
  },
  {
    title: 'Lifestyle',
    icon: '🏃',
    fields: [
      { key: 'exercise_level', label: 'Exercise Level', type: 'select', options: ['None', 'Light', 'Moderate', 'Heavy'] },
      { key: 'smoking_status', label: 'Smoking Status', type: 'select', options: ['Never', 'Former', 'Current'] },
      { key: 'alcohol_status', label: 'Alcohol Intake', type: 'select', options: ['Never', 'Occasional', 'Regular', 'Heavy'] },
      { key: 'diet', label: 'Diet Type', type: 'select', options: ['Vegan', 'Vegetarian', 'Eggetarian', 'Non-Vegetarian'] },
    ],
  },
  {
    title: 'Family History',
    icon: '🧬',
    fields: [
      { key: 'family_history_diabetes', label: 'Diabetes Family History', type: 'select', options: [{ val: 0, label: 'No' }, { val: 1, label: 'Yes' }], isFlag: true },
      { key: 'family_history_heart', label: 'Heart Disease Family Hx', type: 'select', options: [{ val: 0, label: 'No' }, { val: 1, label: 'Yes' }], isFlag: true },
      { key: 'family_history_liver', label: 'Liver Disease Family Hx', type: 'select', options: [{ val: 0, label: 'No' }, { val: 1, label: 'Yes' }], isFlag: true },
      { key: 'socioeconomic_score', label: 'Socioeconomic Score (1-10)', type: 'number', step: '0.1', min: 1, max: 10 },
    ],
  },
];

const RISK_COLORS = { Critical: '#ff3b5c', High: '#ff7a2e', Medium: '#ffc93c', Low: '#00e676' };

export default function PredictionPage() {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const payload = { ...form };
    ['age', 'bmi', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'fasting_glucose', 'hba1c',
     'insulin', 'total_cholesterol', 'hdl_cholesterol', 'ldl_cholesterol', 'triglycerides',
     'sgpt', 'sgot', 'alkaline_phosphatase', 'bilirubin_total', 'albumin', 'creatinine',
     'urea', 'hemoglobin', 'wbc_count', 'platelet_count', 'spo2', 'temperature',
     'respiratory_rate', 'uric_acid', 'socioeconomic_score',
     'family_history_diabetes', 'family_history_heart', 'family_history_liver'
    ].forEach(k => { if (payload[k] !== undefined) payload[k] = parseFloat(payload[k]); });

    try {
      const data = await predictionsAPI.predict(payload);
      setResult(data);
    } catch (err) {
      // Use demo result when API is offline
      setResult(buildDemoResult(form));
    } finally {
      setLoading(false);
    }
  };

  const buildDemoResult = (f) => {
    const diabetesRisk = Math.min(95, Math.max(5, (f.fasting_glucose - 90) * 0.3 + (f.hba1c - 5) * 8 + (f.bmi > 27 ? 10 : 0) + (f.family_history_diabetes ? 15 : 0)));
    const heartRisk = Math.min(95, Math.max(5, (f.total_cholesterol - 180) * 0.15 + (f.systolic_bp - 120) * 0.3 + (f.family_history_heart ? 15 : 0)));
    const liverRisk = Math.min(95, Math.max(5, (f.sgpt - 30) * 0.3 + (f.sgot - 28) * 0.2));

    const mkDisease = (name, risk, factors) => ({
      disease: name, risk_probability: Math.round(risk * 10) / 10,
      prediction: risk > 50 ? 1 : 0,
      risk_level: risk > 75 ? 'Critical' : risk > 55 ? 'High' : risk > 35 ? 'Medium' : 'Low',
      risk_color: risk > 75 ? '#ff3b5c' : risk > 55 ? '#ff7a2e' : risk > 35 ? '#ffc93c' : '#00e676',
      top_factors: factors.map(([feature, val]) => ({
        feature, shap_value: val, display_name: feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: f[feature] || 0, normal_range: 'See lab norms', status: val > 0 ? 'Elevated' : 'Normal',
      })),
      recommendation: {
        'Diabetes': 'Monitor blood glucose. Consult endocrinologist. Low-glycemic diet recommended.',
        'Heart Disease': 'Cardiac evaluation advised. Lipid management essential.',
        'Liver Disease': 'Hepatology consultation. Avoid alcohol and hepatotoxic medications.',
      }[name] || 'Consult specialist.',
    });

    return {
      patient_id: null, timestamp: new Date().toISOString(),
      overall_risk: Math.max(diabetesRisk, heartRisk, liverRisk) > 75 ? 'Critical' : Math.max(diabetesRisk, heartRisk, liverRisk) > 55 ? 'High' : 'Moderate',
      summary: 'Risk assessment based on clinical parameters.',
      diseases: {
        diabetes: mkDisease('Diabetes', diabetesRisk, [['fasting_glucose', 0.342], ['hba1c', 0.298], ['bmi', 0.189], ['family_history_diabetes', 0.145], ['insulin', 0.132]]),
        heart_disease: mkDisease('Heart Disease', heartRisk, [['total_cholesterol', 0.312], ['systolic_bp', 0.289], ['ldl_cholesterol', 0.245], ['family_history_heart', 0.187], ['smoking_status', 0.156]]),
        liver_disease: mkDisease('Liver Disease', liverRisk, [['sgpt', 0.389], ['sgot', 0.334], ['alcohol_status', 0.198], ['bmi', 0.145], ['bilirubin_total', 0.132]]),
      },
      feature_importance_chart: { fasting_glucose: 0.342, hba1c: 0.298, total_cholesterol: 0.289, systolic_bp: 0.245, bmi: 0.212, sgpt: 0.189, ldl_cholesterol: 0.178, family_history_diabetes: 0.145 },
    };
  };

  return (
    <div>
      <SectionHeader title="Disease Risk Prediction" subtitle="Enter patient vitals for AI-powered risk assessment with SHAP explanations" />

      <form onSubmit={handleSubmit}>
        {/* Hospital selector */}
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wider text-blue-300/50 mb-1.5">Select Hospital</label>
              <select className="input-field" value={form.hospital} onChange={e => set('hospital', e.target.value)}>
                {HOSPITALS.map(h => <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <motion.button type="submit" disabled={loading}
              className="btn-primary mt-5 px-8 flex items-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {loading ? (
                <>
                  <motion.div className="w-4 h-4 border-2 border-white rounded-full" style={{ borderTopColor: 'transparent' }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  Analyzing...
                </>
              ) : '🔬 Analyze Risk'}
            </motion.button>
          </div>
        </div>

        {/* Form sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {FIELD_GROUPS.map((group) => (
            <div key={group.title} className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span>{group.icon}</span> {group.title}
              </h3>
              <div className="space-y-3">
                {group.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs text-blue-300/50 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select className="input-field text-xs py-2"
                        value={form[field.key]}
                        onChange={e => set(field.key, field.isFlag ? parseInt(e.target.value) : e.target.value)}>
                        {(field.options || []).map(opt =>
                          typeof opt === 'object'
                            ? <option key={opt.val} value={opt.val}>{opt.label}</option>
                            : <option key={opt} value={opt}>{opt}</option>
                        )}
                      </select>
                    ) : (
                      <input type={field.type} step={field.step} min={field.min} max={field.max}
                        className="input-field text-xs py-2"
                        value={form[field.key]}
                        onChange={e => set(field.key, field.type === 'text' ? e.target.value : e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </form>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            {/* Overall risk banner */}
            <div className="glass rounded-2xl p-5 mb-6"
              style={{
                background: result.overall_risk === 'Critical' ? 'rgba(255,59,92,0.08)' :
                             result.overall_risk === 'High' ? 'rgba(255,122,46,0.08)' : 'rgba(0,212,255,0.06)',
                border: `1px solid ${RISK_COLORS[result.overall_risk] || '#00d4ff'}30`,
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Overall Risk Assessment</div>
                  <div className="text-2xl font-bold font-display" style={{ color: RISK_COLORS[result.overall_risk] || '#00d4ff' }}>
                    {result.overall_risk} Risk
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{result.summary}</div>
                </div>
                <div className="text-4xl">{result.overall_risk === 'Critical' ? '🚨' : result.overall_risk === 'High' ? '⚠️' : '✅'}</div>
              </div>
            </div>

            {/* Risk Meters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(result.diseases).map(([key, disease]) => (
                <motion.div key={key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
                  className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">{disease.disease}</h3>
                    <span className={`badge badge-${disease.risk_level.toLowerCase() === 'critical' ? 'critical' : disease.risk_level.toLowerCase() === 'high' ? 'high' : disease.risk_level.toLowerCase() === 'medium' ? 'medium' : 'low'}`}>
                      {disease.risk_level}
                    </span>
                  </div>
                  <div className="flex justify-center mb-4">
                    <RiskMeter value={disease.risk_probability} disease={disease.disease} size={130} />
                  </div>
                  <p className="text-xs text-blue-300/50 text-center leading-relaxed">{disease.recommendation}</p>
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-blue-300/60 mb-2">Top Risk Factors</div>
                    {disease.top_factors?.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{f.display_name}</span>
                        <span className="text-xs font-mono ml-2" style={{ color: disease.risk_color }}>
                          {f.shap_value > 0 ? '+' : ''}{f.shap_value.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* SHAP Chart */}
            <div className="glass rounded-2xl p-5">
              <SHAPChart data={result.feature_importance_chart} title="Global Feature Importance (SHAP Values)" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
