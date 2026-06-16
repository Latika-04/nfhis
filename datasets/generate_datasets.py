"""
NFHIS Synthetic Indian Healthcare Dataset Generator
Generates realistic datasets for Heart Disease, Diabetes, Liver Disease
with 30+ features and realistic correlations
"""

import numpy as np
import pandas as pd
import sqlite3
import json
import os
from datetime import datetime, timedelta
import random

np.random.seed(42)
random.seed(42)

INDIAN_STATES = [
    "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Maharashtra",
    "Gujarat", "Rajasthan", "Uttar Pradesh", "Bihar", "West Bengal",
    "Madhya Pradesh", "Punjab", "Haryana", "Kerala", "Odisha"
]

INDIAN_FIRST_NAMES = [
    "Aarav", "Arjun", "Rohan", "Vikram", "Suresh", "Ramesh", "Mahesh", "Rajesh",
    "Priya", "Anita", "Sunita", "Kavya", "Meena", "Rekha", "Pooja", "Deepa",
    "Mohammed", "Abdul", "Imran", "Farhan", "Siddharth", "Karthik", "Venkat",
    "Lakshmi", "Saraswati", "Radha", "Geeta", "Sita", "Durga", "Parvati"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Verma", "Singh", "Kumar", "Patel", "Reddy", "Nair", "Pillai",
    "Rao", "Gupta", "Mehta", "Shah", "Joshi", "Mishra", "Dubey", "Pandey",
    "Khan", "Ahmed", "Hussain", "Ali", "Iyer", "Menon", "Naidu", "Raju"
]

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
DIETS = ["Vegetarian", "Non-Vegetarian", "Vegan", "Eggetarian"]
EXERCISE_LEVELS = ["None", "Light", "Moderate", "Heavy"]
SMOKING_STATUS = ["Never", "Former", "Current"]
ALCOHOL_STATUS = ["Never", "Occasional", "Regular", "Heavy"]
EDUCATION = ["No Education", "Primary", "Secondary", "Graduate", "Post Graduate"]
OCCUPATIONS = ["Farmer", "Laborer", "Office Worker", "Business", "Teacher", "Doctor", "Engineer", "Homemaker", "Retired"]


def generate_patient_base(n: int) -> pd.DataFrame:
    ages = np.random.normal(45, 15, n).clip(18, 90).astype(int)
    genders = np.random.choice(["Male", "Female"], n, p=[0.52, 0.48])
    
    bmis = []
    for age, gender in zip(ages, genders):
        if gender == "Male":
            bmi = np.random.normal(24.5 + age * 0.05, 4.5)
        else:
            bmi = np.random.normal(25.2 + age * 0.04, 4.8)
        bmis.append(np.clip(bmi, 14, 55))
    bmis = np.array(bmis)
    
    df = pd.DataFrame({
        "patient_id": [f"PAT{str(i).zfill(6)}" for i in range(1, n+1)],
        "first_name": [random.choice(INDIAN_FIRST_NAMES) for _ in range(n)],
        "last_name": [random.choice(INDIAN_LAST_NAMES) for _ in range(n)],
        "age": ages,
        "gender": genders,
        "bmi": np.round(bmis, 1),
        "state": np.random.choice(INDIAN_STATES, n),
        "blood_group": np.random.choice(BLOOD_GROUPS, n),
        "diet": np.random.choice(DIETS, n, p=[0.40, 0.45, 0.05, 0.10]),
        "exercise_level": np.random.choice(EXERCISE_LEVELS, n, p=[0.30, 0.35, 0.25, 0.10]),
        "smoking_status": np.random.choice(SMOKING_STATUS, n, p=[0.55, 0.20, 0.25]),
        "alcohol_status": np.random.choice(ALCOHOL_STATUS, n, p=[0.45, 0.30, 0.15, 0.10]),
        "education": np.random.choice(EDUCATION, n, p=[0.15, 0.25, 0.30, 0.20, 0.10]),
        "occupation": np.random.choice(OCCUPATIONS, n),
        "family_history_diabetes": np.random.choice([0, 1], n, p=[0.65, 0.35]),
        "family_history_heart": np.random.choice([0, 1], n, p=[0.70, 0.30]),
        "family_history_liver": np.random.choice([0, 1], n, p=[0.75, 0.25]),
        "socioeconomic_score": np.random.normal(5, 2, n).clip(1, 10).round(1),
    })
    return df


def generate_vitals(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    systolic = []
    diastolic = []
    
    for _, row in df.iterrows():
        base_sys = 110 + row["age"] * 0.5 + row["bmi"] * 0.8
        if row["smoking_status"] == "Current":
            base_sys += 10
        if row["alcohol_status"] in ["Regular", "Heavy"]:
            base_sys += 8
        systolic.append(np.clip(np.random.normal(base_sys, 15), 80, 200))
        diastolic.append(np.clip(np.random.normal(base_sys * 0.65, 10), 50, 120))

    df["systolic_bp"] = np.round(systolic, 0).astype(int)
    df["diastolic_bp"] = np.round(diastolic, 0).astype(int)
    df["heart_rate"] = np.random.normal(75, 12, n).clip(50, 130).astype(int)
    df["respiratory_rate"] = np.random.normal(16, 3, n).clip(10, 30).astype(int)
    df["temperature"] = np.round(np.random.normal(98.6, 0.8, n).clip(96, 103), 1)
    df["spo2"] = np.random.normal(97, 2, n).clip(88, 100).round(1)
    return df


def generate_lab_values(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    glucose_base = []
    
    for _, row in df.iterrows():
        base = 90
        if row["bmi"] > 30:
            base += (row["bmi"] - 30) * 3
        if row["age"] > 45:
            base += (row["age"] - 45) * 0.5
        if row["family_history_diabetes"]:
            base += 15
        if row["exercise_level"] == "None":
            base += 10
        if row["diet"] in ["Non-Vegetarian"]:
            base += 5
        glucose_base.append(base)

    df["fasting_glucose"] = np.round(
        [np.clip(np.random.normal(g, 25), 60, 400) for g in glucose_base], 1
    )
    df["hba1c"] = np.round(
        (df["fasting_glucose"] / 30 + np.random.normal(0, 0.3, n)).clip(4.0, 14.0), 1
    )
    df["insulin"] = np.round(
        (df["fasting_glucose"] * 0.1 + np.random.normal(10, 5, n)).clip(2, 150), 1
    )
    
    cholesterol_base = 150 + df["bmi"] * 2 + df["age"] * 0.5
    if "smoking_status" in df.columns:
        cholesterol_base += (df["smoking_status"] == "Current").astype(int) * 20
    
    df["total_cholesterol"] = np.round(
        (cholesterol_base + np.random.normal(0, 30, n)).clip(120, 400), 1
    )
    df["hdl_cholesterol"] = np.round(
        np.random.normal(50, 12, n).clip(20, 90), 1
    )
    df["ldl_cholesterol"] = np.round(
        (df["total_cholesterol"] - df["hdl_cholesterol"] - np.random.normal(30, 8, n)).clip(50, 300), 1
    )
    df["triglycerides"] = np.round(
        (df["total_cholesterol"] * 0.6 + np.random.normal(0, 40, n)).clip(50, 600), 1
    )
    
    df["sgpt"] = np.round(np.random.normal(35, 20, n).clip(7, 300), 1)
    df["sgot"] = np.round(np.random.normal(32, 18, n).clip(7, 250), 1)
    df["alkaline_phosphatase"] = np.round(np.random.normal(90, 30, n).clip(20, 400), 1)
    df["bilirubin_total"] = np.round(np.random.normal(0.8, 0.4, n).clip(0.1, 8.0), 2)
    df["albumin"] = np.round(np.random.normal(4.0, 0.5, n).clip(2.0, 5.5), 1)
    df["protein_total"] = np.round(np.random.normal(7.0, 0.8, n).clip(4.0, 10.0), 1)
    
    df["creatinine"] = np.round(np.random.normal(1.0, 0.3, n).clip(0.4, 8.0), 2)
    df["urea"] = np.round(np.random.normal(28, 10, n).clip(5, 150), 1)
    df["uric_acid"] = np.round(np.random.normal(5.5, 1.5, n).clip(2.0, 12.0), 1)
    
    df["hemoglobin"] = np.round(
        np.where(df["gender"] == "Male",
                 np.random.normal(14.5, 1.5, n).clip(8, 18),
                 np.random.normal(12.5, 1.5, n).clip(7, 16)), 1
    )
    df["wbc_count"] = np.round(np.random.normal(7500, 1500, n).clip(3000, 15000), 0).astype(int)
    df["platelet_count"] = np.round(np.random.normal(250000, 60000, n).clip(80000, 500000), 0).astype(int)
    
    return df


def assign_disease_labels(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    
    diabetes_score = (
        (df["fasting_glucose"] > 126).astype(int) * 3 +
        (df["hba1c"] > 6.5).astype(int) * 3 +
        (df["bmi"] > 27).astype(int) * 1 +
        (df["age"] > 45).astype(int) * 1 +
        df["family_history_diabetes"] * 2 +
        (df["exercise_level"] == "None").astype(int) * 1 +
        (df["fasting_glucose"] > 200).astype(int) * 2
    )
    diabetes_prob = 1 / (1 + np.exp(-0.5 * (diabetes_score - 5)))
    df["diabetes"] = (np.random.random(n) < diabetes_prob).astype(int)
    
    heart_score = (
        (df["total_cholesterol"] > 200).astype(int) * 1 +
        (df["ldl_cholesterol"] > 130).astype(int) * 2 +
        (df["systolic_bp"] > 140).astype(int) * 2 +
        (df["age"] > 50).astype(int) * 2 +
        (df["smoking_status"] == "Current").astype(int) * 2 +
        df["family_history_heart"] * 2 +
        (df["hdl_cholesterol"] < 40).astype(int) * 1 +
        (df["gender"] == "Male").astype(int) * 1
    )
    heart_prob = 1 / (1 + np.exp(-0.4 * (heart_score - 6)))
    df["heart_disease"] = (np.random.random(n) < heart_prob).astype(int)
    
    liver_score = (
        (df["sgpt"] > 56).astype(int) * 2 +
        (df["sgot"] > 40).astype(int) * 2 +
        (df["alcohol_status"].isin(["Regular", "Heavy"])).astype(int) * 3 +
        (df["bmi"] > 30).astype(int) * 1 +
        df["family_history_liver"] * 2 +
        (df["bilirubin_total"] > 1.2).astype(int) * 1 +
        (df["alkaline_phosphatase"] > 150).astype(int) * 1
    )
    liver_prob = 1 / (1 + np.exp(-0.45 * (liver_score - 5)))
    df["liver_disease"] = (np.random.random(n) < liver_prob).astype(int)
    
    df["diabetes_risk_score"] = np.round(diabetes_prob * 100, 1)
    df["heart_risk_score"] = np.round(heart_prob * 100, 1)
    df["liver_risk_score"] = np.round(liver_prob * 100, 1)
    
    return df


def add_timestamps(df: pd.DataFrame, hospital: str) -> pd.DataFrame:
    n = len(df)
    start_date = datetime(2022, 1, 1)
    end_date = datetime(2024, 12, 31)
    delta = (end_date - start_date).days
    
    timestamps = [start_date + timedelta(days=random.randint(0, delta)) for _ in range(n)]
    df["admission_date"] = [t.strftime("%Y-%m-%d") for t in timestamps]
    df["hospital"] = hospital
    df["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return df


HOSPITALS = {
    "Apollo_Private_Hospital": {"n": 800, "state_bias": ["Telangana", "Karnataka", "Maharashtra"]},
    "AIIMS_Government_Hospital": {"n": 1200, "state_bias": ["Uttar Pradesh", "Bihar", "Rajasthan"]},
    "Fortis_National_Hospital": {"n": 600, "state_bias": ["Punjab", "Haryana", "Delhi"]},
    "District_Rural_Hospital": {"n": 1000, "state_bias": ["Odisha", "Bihar", "Madhya Pradesh"]},
}


def generate_all_datasets():
    os.makedirs("datasets/data", exist_ok=True)
    all_dfs = {}
    
    for hospital, config in HOSPITALS.items():
        print(f"Generating dataset for {hospital}...")
        n = config["n"]
        df = generate_patient_base(n)
        
        state_indices = df.index[~df["state"].isin(config["state_bias"])]
        bias_size = min(int(n * 0.6), len(state_indices))
        if bias_size > 0:
            replace_states = np.random.choice(config["state_bias"], bias_size)
            df.loc[state_indices[:bias_size], "state"] = replace_states
        
        df = generate_vitals(df)
        df = generate_lab_values(df)
        df = assign_disease_labels(df)
        df = add_timestamps(df, hospital)
        
        df.to_csv(f"datasets/data/{hospital}.csv", index=False)
        all_dfs[hospital] = df
        print(f"  Generated {n} records | Diabetes: {df['diabetes'].sum()} | Heart: {df['heart_disease'].sum()} | Liver: {df['liver_disease'].sum()}")
    
    combined = pd.concat(all_dfs.values(), ignore_index=True)
    combined.to_csv("datasets/data/combined_dataset.csv", index=False)
    print(f"\nTotal records: {len(combined)}")
    return all_dfs


def save_to_sqlite(all_dfs: dict):
    db_path = "datasets/nfhis.db"
    conn = sqlite3.connect(db_path)
    
    for hospital, df in all_dfs.items():
        table_name = hospital.lower().replace(" ", "_")
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        print(f"Saved {hospital} to SQLite table '{table_name}'")
    
    combined = pd.concat(all_dfs.values(), ignore_index=True)
    combined.to_sql("patients", conn, if_exists="replace", index=False)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            hospital TEXT,
            disease_type TEXT,
            risk_score REAL,
            prediction INTEGER,
            model_version TEXT,
            shap_values TEXT,
            predicted_at TEXT
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
            round_number INTEGER,
            trained_at TEXT
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
            completed_at TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    print(f"\nSQLite database saved at {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.execute("SELECT COUNT(*) FROM patients")
    print(f"Total patients in DB: {cursor.fetchone()[0]}")
    
    cursor = conn.execute("SELECT COUNT(*) FROM patients WHERE fasting_glucose > 140")
    print(f"Patients with glucose > 140: {cursor.fetchone()[0]}")
    
    cursor = conn.execute("SELECT hospital, COUNT(*) as count, AVG(diabetes_risk_score) as avg_diabetes_risk FROM patients GROUP BY hospital")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} patients, avg diabetes risk: {row[2]:.1f}%")
    conn.close()


def generate_summary_stats(all_dfs: dict) -> dict:
    stats = {}
    for hospital, df in all_dfs.items():
        stats[hospital] = {
            "total_patients": len(df),
            "avg_age": round(df["age"].mean(), 1),
            "diabetes_prevalence": round(df["diabetes"].mean() * 100, 1),
            "heart_disease_prevalence": round(df["heart_disease"].mean() * 100, 1),
            "liver_disease_prevalence": round(df["liver_disease"].mean() * 100, 1),
            "avg_bmi": round(df["bmi"].mean(), 1),
            "avg_glucose": round(df["fasting_glucose"].mean(), 1),
            "avg_cholesterol": round(df["total_cholesterol"].mean(), 1),
            "hypertension_rate": round((df["systolic_bp"] > 140).mean() * 100, 1),
            "smoker_rate": round((df["smoking_status"] == "Current").mean() * 100, 1),
        }
    
    with open("datasets/data/summary_stats.json", "w") as f:
        json.dump(stats, f, indent=2)
    
    return stats


if __name__ == "__main__":
    print("=" * 60)
    print("NFHIS Synthetic Dataset Generator")
    print("=" * 60)
    all_dfs = generate_all_datasets()
    save_to_sqlite(all_dfs)
    stats = generate_summary_stats(all_dfs)
    
    print("\n" + "=" * 60)
    print("Dataset Generation Complete!")
    print("=" * 60)
    for hospital, s in stats.items():
        print(f"\n{hospital}:")
        print(f"  Patients: {s['total_patients']} | Avg Age: {s['avg_age']}")
        print(f"  Diabetes: {s['diabetes_prevalence']}% | Heart: {s['heart_disease_prevalence']}% | Liver: {s['liver_disease_prevalence']}%")
