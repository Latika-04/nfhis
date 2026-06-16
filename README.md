# NFHIS — National Federated Healthcare Intelligence System

> AI-powered federated learning platform for Indian healthcare — connecting hospitals for real-time disease prediction, medical analytics, and patient safety monitoring.

---

## Architecture

```
nfhis/
├── backend/          FastAPI REST API
│   ├── routers/      auth, patients, predictions, federated, hospitals, alerts, doctors, analytics
│   ├── database/     MongoDB (alerts, logs, trust) + SQLite (patients, predictions, FL rounds)
│   ├── services/     background monitor
│   └── main.py
├── frontend/         React 18 + Tailwind CSS + Framer Motion
│   └── src/
│       ├── pages/    LoginPage, DoctorDashboard, NurseDashboard, HeadDoctorDashboard, AdminDashboard, PredictionPage
│       ├── components/ Charts, Sidebar, TopBar
│       ├── hooks/    useAuth
│       └── utils/    api.js
├── datasets/         Synthetic dataset generator + SQLite DB
├── ml/               XGBoost model training + SHAP explainer
├── federated/        Hierarchical FL system (Hospital→State→National)
└── xai/              SHAP explainability module
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (optional — falls back to in-memory)

---

### Step 1: Generate Datasets + Train Models

```bash
cd nfhis

# Install Python dependencies
pip install -r backend/requirements.txt

# 1. Generate synthetic Indian healthcare datasets (3,600 patients across 4 hospitals)
python datasets/generate_datasets.py

# 2. Train XGBoost models for diabetes, heart disease, liver disease
python ml/train_models.py

# 3. Run federated learning simulation (Hospital → State → National)
python federated/federated_learning.py
```

---

### Step 2: Start the Backend

```bash
# From project root
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

---

### Step 3: Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend will open at **http://localhost:3000**

---

## Demo Login Credentials

| Role | Username | Password |
|------|----------|----------|
| 🩺 Doctor | `doctor1` | `doctor123` |
| 💉 Nurse | `nurse1` | `nurse123` |
| 🏥 Head Doctor | `head1` | `head123` |
| ⚙️ Admin | `admin1` | `admin123` |

---

## Dashboards

### Doctor Dashboard (`/doctor`)
- Patient table with risk levels, glucose, BP, cholesterol
- Active alerts panel with acknowledge action
- Disease trend charts (12 months)
- XAI Panel with SHAP feature importance graphs
- Quick prediction access

### Nurse Dashboard (`/nurse`)
- Live patient vitals monitoring (updates every 2 seconds)
- Vital entry form (heart rate, BP, SpO₂, glucose, temperature)
- Alert panel for pending patient alerts
- Real-time line graphs per patient

### Head Doctor Dashboard (`/head-doctor`)
- Doctor performance table (response times, negligence flags, scores)
- Medical negligence reports with escalation status
- Hospital analytics (disease trends, model accuracy comparison)
- National disease trend charts

### Admin Dashboard (`/admin`)
- Audit logs (full activity trail across all users)
- Hospital trust scores with visual progress bars
- Federated learning status + round history charts
- Anomaly detection (data quality, model drift, behavioral)
- Hospital network management

---

## API Endpoints

```
POST   /api/auth/login                    Role-based login
GET    /api/patients/                     List patients (with filters)
GET    /api/patients/{id}                 Get patient by ID
GET    /api/patients/query/high-glucose   SELECT WHERE glucose > threshold
POST   /api/predictions/predict           Run disease prediction with SHAP
GET    /api/predictions/shap-demo/{disease} SHAP demo values
GET    /api/federated/status              FL system status
GET    /api/federated/rounds              Training round history
GET    /api/federated/trust-scores        Hospital trust scores
POST   /api/federated/run                 Trigger new FL round
GET    /api/hospitals/comparison/all      Multi-hospital model comparison
GET    /api/alerts/                       List patient alerts
POST   /api/alerts/                       Create new alert
PUT    /api/alerts/{id}/acknowledge       Acknowledge alert
GET    /api/alerts/negligence/reports     Negligence reports
GET    /api/analytics/summary             System-wide analytics
GET    /api/analytics/disease-trends      Monthly trends
GET    /api/analytics/state-heatmap       State-level disease map
```

---

## Key SQL Queries Built In

```sql
-- Patients with high glucose
SELECT * FROM patients WHERE fasting_glucose > 140;

-- By hospital
SELECT hospital, COUNT(*) as count, AVG(diabetes_risk_score) as avg_risk
FROM patients GROUP BY hospital;

-- Model performance
SELECT * FROM model_performance ORDER BY auc_roc DESC;

-- FL round progress
SELECT round_number, AVG(accuracy) as avg_accuracy, AVG(loss) as avg_loss
FROM fl_rounds GROUP BY round_number ORDER BY round_number;
```

---

## Datasets Generated

| Hospital | Patients | Diabetes | Heart Disease | Liver Disease |
|----------|----------|----------|---------------|---------------|
| Apollo Private Hospital | 800 | ~25% | ~20% | ~12% |
| AIIMS Government Hospital | 1,200 | ~28% | ~22% | ~14% |
| Fortis National Hospital | 600 | ~23% | ~19% | ~11% |
| District Rural Hospital | 1,000 | ~30% | ~25% | ~15% |

---

## Federated Learning Architecture

```
TIER 3: National Server (Global Aggregation)
         ↑ trust-weighted FedAvg
TIER 2: State Servers (Telangana, Delhi, Punjab, Bihar)
         ↑ secure aggregation with differential privacy noise
TIER 1: Hospital Nodes (Local XGBoost training)
```

**Trust Score Formula:**
```
trust_score = 0.5 × accuracy_component + 0.3 × data_quality + 0.2 × participation_rate
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Framer Motion, Recharts |
| Backend | FastAPI, Uvicorn, Pydantic |
| ML | XGBoost, Scikit-learn, SHAP |
| Federated Learning | Custom hierarchical FL with secure aggregation |
| Database | MongoDB (logs/alerts) + SQLite (patients/predictions) |
| Dataset | Synthetic Indian healthcare data (30+ features, 3,600 patients) |

---

## UI Design System

- **Theme**: Dark glassmorphism with cyan neon accents
- **Font**: Syne (display) + DM Sans (body) + JetBrains Mono (data)
- **Animations**: Framer Motion page transitions, animated risk meters, live sparklines
- **Charts**: Recharts with custom dark theme (area, bar, line, donut, radar)
- **Risk Indicators**: Circular SVG progress meters (Critical/High/Medium/Low)
