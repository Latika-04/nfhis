"""
NFHIS SQLite Database Layer
Patient data, predictions, model performance
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "datasets", "nfhis.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_sqlite():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT UNIQUE,
            first_name TEXT,
            last_name TEXT,
            age INTEGER,
            gender TEXT,
            bmi REAL,
            state TEXT,
            blood_group TEXT,
            diet TEXT,
            exercise_level TEXT,
            smoking_status TEXT,
            alcohol_status TEXT,
            systolic_bp INTEGER,
            diastolic_bp INTEGER,
            heart_rate INTEGER,
            fasting_glucose REAL,
            hba1c REAL,
            insulin REAL,
            total_cholesterol REAL,
            hdl_cholesterol REAL,
            ldl_cholesterol REAL,
            triglycerides REAL,
            sgpt REAL,
            sgot REAL,
            bilirubin_total REAL,
            hemoglobin REAL,
            creatinine REAL,
            family_history_diabetes INTEGER DEFAULT 0,
            family_history_heart INTEGER DEFAULT 0,
            family_history_liver INTEGER DEFAULT 0,
            diabetes INTEGER DEFAULT 0,
            heart_disease INTEGER DEFAULT 0,
            liver_disease INTEGER DEFAULT 0,
            diabetes_risk_score REAL DEFAULT 0,
            heart_risk_score REAL DEFAULT 0,
            liver_risk_score REAL DEFAULT 0,
            hospital TEXT,
            admission_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            hospital TEXT,
            disease_type TEXT,
            risk_score REAL,
            prediction INTEGER,
            model_version TEXT DEFAULT '1.0',
            shap_values TEXT,
            top_factors TEXT,
            predicted_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES patients(patient_id)
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS model_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital TEXT,
            disease_type TEXT,
            accuracy REAL,
            precision_score REAL,
            recall REAL,
            f1_score REAL,
            auc_roc REAL,
            round_number INTEGER DEFAULT 1,
            trained_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS fl_rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_number INTEGER,
            hospital TEXT,
            weights_hash TEXT,
            num_samples INTEGER,
            loss REAL,
            accuracy REAL,
            completed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    patients_count = conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    if patients_count == 0:
        _seed_sample_patients(conn)
    
    perf_count = conn.execute("SELECT COUNT(*) FROM model_performance").fetchone()[0]
    if perf_count == 0:
        _seed_model_performance(conn)
    
    fl_count = conn.execute("SELECT COUNT(*) FROM fl_rounds").fetchone()[0]
    if fl_count == 0:
        _seed_fl_rounds(conn)
    
    conn.commit()
    conn.close()
    print(f"✅ SQLite initialized at {DB_PATH}")


def _seed_sample_patients(conn: sqlite3.Connection):
    patients = [
        ("PAT000001", "Arjun", "Sharma", 52, "Male", 28.5, "Telangana", "B+",
         "Non-Vegetarian", "Light", "Former", "Occasional", 145, 92, 82,
         165.0, 7.2, 18.5, 220.0, 38.0, 145.0, 185.0, 45.0, 38.0, 0.9, 13.5, 1.1,
         1, 1, 0, 1, 0, 0, 78.5, 62.1, 22.3, "Apollo_Private_Hospital", "2024-01-15"),
        ("PAT000002", "Priya", "Verma", 45, "Female", 24.2, "Karnataka", "O+",
         "Vegetarian", "Moderate", "Never", "Never", 118, 76, 72,
         95.0, 5.4, 12.0, 175.0, 58.0, 98.0, 120.0, 28.0, 25.0, 0.7, 12.8, 0.9,
         0, 0, 0, 0, 0, 0, 15.2, 18.4, 8.1, "Apollo_Private_Hospital", "2024-02-10"),
        ("PAT000003", "Rajesh", "Kumar", 61, "Male", 32.1, "Bihar", "A+",
         "Non-Vegetarian", "None", "Current", "Regular", 162, 105, 88,
         198.0, 8.5, 24.2, 265.0, 32.0, 178.0, 245.0, 38.0, 31.0, 0.8, 11.8, 1.3,
         1, 1, 1, 1, 1, 0, 88.2, 91.5, 35.8, "AIIMS_Government_Hospital", "2024-03-22"),
        ("PAT000004", "Sunita", "Patel", 38, "Female", 26.8, "Gujarat", "AB+",
         "Vegetarian", "Moderate", "Never", "Never", 125, 82, 76,
         108.0, 5.9, 14.5, 188.0, 52.0, 112.0, 145.0, 32.0, 28.0, 0.8, 13.2, 0.95,
         1, 0, 0, 0, 0, 0, 32.4, 21.8, 12.5, "Fortis_National_Hospital", "2024-04-05"),
        ("PAT000005", "Mohammed", "Khan", 55, "Male", 30.5, "Uttar Pradesh", "O-",
         "Non-Vegetarian", "None", "Current", "Heavy", 155, 98, 85,
         145.0, 6.8, 16.8, 235.0, 35.0, 158.0, 210.0, 145.0, 112.0, 2.8, 12.2, 1.2,
         0, 1, 1, 1, 1, 1, 68.5, 78.3, 79.4, "Fortis_National_Hospital", "2024-05-18"),
        ("PAT000006", "Rekha", "Singh", 48, "Female", 27.4, "West Bengal", "B-",
         "Eggetarian", "Light", "Never", "Occasional", 138, 88, 78,
         132.0, 6.4, 15.2, 208.0, 45.0, 135.0, 172.0, 41.0, 35.0, 0.9, 12.5, 1.0,
         1, 1, 0, 1, 0, 0, 55.8, 48.2, 18.6, "AIIMS_Government_Hospital", "2024-06-12"),
        ("PAT000007", "Vikram", "Reddy", 35, "Male", 22.8, "Andhra Pradesh", "A-",
         "Vegetarian", "Heavy", "Never", "Never", 112, 72, 65,
         88.0, 5.1, 10.5, 162.0, 62.0, 88.0, 98.0, 22.0, 19.0, 0.6, 15.2, 0.85,
         0, 0, 0, 0, 0, 0, 5.8, 8.2, 4.1, "District_Rural_Hospital", "2024-07-01"),
        ("PAT000008", "Lakshmi", "Nair", 67, "Female", 29.8, "Kerala", "O+",
         "Non-Vegetarian", "Light", "Never", "Never", 148, 94, 80,
         175.0, 7.8, 21.5, 242.0, 40.0, 162.0, 198.0, 52.0, 44.0, 1.1, 11.5, 1.15,
         1, 1, 0, 1, 1, 0, 82.1, 75.6, 28.4, "District_Rural_Hospital", "2024-08-20"),
    ]
    
    conn.executemany("""
        INSERT OR IGNORE INTO patients (
            patient_id, first_name, last_name, age, gender, bmi, state, blood_group,
            diet, exercise_level, smoking_status, alcohol_status,
            systolic_bp, diastolic_bp, heart_rate, fasting_glucose, hba1c, insulin,
            total_cholesterol, hdl_cholesterol, ldl_cholesterol, triglycerides,
            sgpt, sgot, bilirubin_total, hemoglobin, creatinine,
            family_history_diabetes, family_history_heart, family_history_liver,
            diabetes, heart_disease, liver_disease,
            diabetes_risk_score, heart_risk_score, liver_risk_score,
            hospital, admission_date
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, patients)


def _seed_model_performance(conn: sqlite3.Connection):
    performance = [
        ("Apollo_Private_Hospital", "diabetes", 0.8842, 0.7925, 0.8214, 0.8067, 0.9125, 1),
        ("Apollo_Private_Hospital", "heart_disease", 0.8654, 0.8021, 0.7845, 0.7932, 0.8978, 1),
        ("Apollo_Private_Hospital", "liver_disease", 0.9012, 0.8654, 0.8125, 0.8381, 0.9287, 1),
        ("AIIMS_Government_Hospital", "diabetes", 0.8734, 0.7845, 0.8012, 0.7927, 0.9056, 1),
        ("AIIMS_Government_Hospital", "heart_disease", 0.8521, 0.7912, 0.7754, 0.7832, 0.8845, 1),
        ("AIIMS_Government_Hospital", "liver_disease", 0.8945, 0.8521, 0.8025, 0.8265, 0.9145, 1),
        ("Fortis_National_Hospital", "diabetes", 0.8612, 0.7754, 0.7945, 0.7848, 0.8987, 1),
        ("Fortis_National_Hospital", "heart_disease", 0.8425, 0.7845, 0.7654, 0.7748, 0.8754, 1),
        ("Fortis_National_Hospital", "liver_disease", 0.8845, 0.8412, 0.7954, 0.8176, 0.9065, 1),
        ("District_Rural_Hospital", "diabetes", 0.8456, 0.7612, 0.7845, 0.7726, 0.8875, 1),
        ("District_Rural_Hospital", "heart_disease", 0.8312, 0.7725, 0.7512, 0.7616, 0.8645, 1),
        ("District_Rural_Hospital", "liver_disease", 0.8712, 0.8254, 0.7845, 0.8044, 0.8956, 1),
    ]
    
    conn.executemany("""
        INSERT INTO model_performance (hospital, disease_type, accuracy, precision_score, recall, f1_score, auc_roc, round_number)
        VALUES (?,?,?,?,?,?,?,?)
    """, performance)


def _seed_fl_rounds(conn: sqlite3.Connection):
    import random
    hospitals = ["Apollo_Private_Hospital", "AIIMS_Government_Hospital", "Fortis_National_Hospital", "District_Rural_Hospital"]
    records = []
    for round_num in range(1, 16):
        for hospital in hospitals:
            base_acc = {"Apollo_Private_Hospital": 0.88, "AIIMS_Government_Hospital": 0.85,
                       "Fortis_National_Hospital": 0.83, "District_Rural_Hospital": 0.80}[hospital]
            acc = base_acc + round_num * 0.003 + random.uniform(-0.01, 0.01)
            loss = max(0.1, 0.5 - round_num * 0.02 + random.uniform(-0.02, 0.02))
            records.append((
                round_num, hospital, f"hash_{round_num}_{hospital[:4]}",
                random.randint(600, 1000), round(loss, 4), round(min(0.99, acc), 4),
                f"2024-{str(round_num % 12 + 1).zfill(2)}-01"
            ))
    
    conn.executemany("""
        INSERT INTO fl_rounds (round_number, hospital, weights_hash, num_samples, loss, accuracy, completed_at)
        VALUES (?,?,?,?,?,?,?)
    """, records)


def query_patients(
    hospital: Optional[str] = None,
    min_glucose: Optional[float] = None,
    max_age: Optional[int] = None,
    disease: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict]:
    conn = get_connection()
    
    query = "SELECT * FROM patients WHERE 1=1"
    params = []
    
    if hospital:
        query += " AND hospital = ?"
        params.append(hospital)
    if min_glucose:
        query += " AND fasting_glucose > ?"
        params.append(min_glucose)
    if max_age:
        query += " AND age <= ?"
        params.append(max_age)
    if disease:
        query += f" AND {disease} = 1"
    
    query += f" ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor = conn.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_patient_by_id(patient_id: str) -> Optional[Dict]:
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def save_prediction(
    patient_id: str,
    hospital: str,
    disease_type: str,
    risk_score: float,
    prediction: int,
    shap_values: Dict,
    top_factors: List
) -> int:
    conn = get_connection()
    cursor = conn.execute("""
        INSERT INTO predictions (patient_id, hospital, disease_type, risk_score, prediction, shap_values, top_factors)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (patient_id, hospital, disease_type, risk_score, prediction,
          json.dumps(shap_values), json.dumps(top_factors)))
    pred_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return pred_id


def get_analytics_summary() -> Dict:
    conn = get_connection()
    
    total = conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    diabetic = conn.execute("SELECT COUNT(*) FROM patients WHERE diabetes = 1").fetchone()[0]
    heart = conn.execute("SELECT COUNT(*) FROM patients WHERE heart_disease = 1").fetchone()[0]
    liver = conn.execute("SELECT COUNT(*) FROM patients WHERE liver_disease = 1").fetchone()[0]
    
    high_glucose = conn.execute("SELECT COUNT(*) FROM patients WHERE fasting_glucose > 140").fetchone()[0]
    hypertension = conn.execute("SELECT COUNT(*) FROM patients WHERE systolic_bp > 140").fetchone()[0]
    
    by_hospital = [dict(r) for r in conn.execute("""
        SELECT hospital, COUNT(*) as count,
               AVG(diabetes_risk_score) as avg_diabetes_risk,
               AVG(heart_risk_score) as avg_heart_risk,
               AVG(liver_risk_score) as avg_liver_risk,
               AVG(age) as avg_age,
               AVG(bmi) as avg_bmi
        FROM patients GROUP BY hospital
    """).fetchall()]
    
    state_distribution = [dict(r) for r in conn.execute("""
        SELECT state, COUNT(*) as count FROM patients GROUP BY state ORDER BY count DESC LIMIT 10
    """).fetchall()]
    
    model_perf = [dict(r) for r in conn.execute("""
        SELECT * FROM model_performance ORDER BY hospital, disease_type
    """).fetchall()]
    
    fl_progress = [dict(r) for r in conn.execute("""
        SELECT round_number, AVG(accuracy) as avg_accuracy, AVG(loss) as avg_loss
        FROM fl_rounds GROUP BY round_number ORDER BY round_number
    """).fetchall()]
    
    conn.close()
    
    return {
        "total_patients": total,
        "disease_counts": {
            "diabetes": diabetic,
            "heart_disease": heart,
            "liver_disease": liver
        },
        "risk_indicators": {
            "high_glucose_count": high_glucose,
            "hypertension_count": hypertension
        },
        "by_hospital": by_hospital,
        "state_distribution": state_distribution,
        "model_performance": model_perf,
        "fl_progress": fl_progress
    }
