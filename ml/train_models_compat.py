"""
NFHIS ML Model Training — Sklearn-compatible version
Uses GradientBoostingClassifier when XGBoost is unavailable
"""

import numpy as np
import pandas as pd
import sqlite3
import json
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
import warnings
warnings.filterwarnings("ignore")

try:
    from xgboost import XGBClassifier
    USE_XGB = True
    print("✅ Using XGBoost")
except ImportError:
    USE_XGB = False
    print("⚠️  XGBoost not found — using GradientBoostingClassifier")

FEATURE_COLS = [
    "age", "bmi", "systolic_bp", "diastolic_bp", "heart_rate",
    "fasting_glucose", "hba1c", "insulin", "total_cholesterol",
    "hdl_cholesterol", "ldl_cholesterol", "triglycerides",
    "sgpt", "sgot", "alkaline_phosphatase", "bilirubin_total",
    "albumin", "creatinine", "urea", "hemoglobin", "wbc_count",
    "platelet_count", "spo2", "temperature", "respiratory_rate",
    "family_history_diabetes", "family_history_heart", "family_history_liver",
    "socioeconomic_score", "uric_acid",
    "gender", "exercise_level", "smoking_status", "alcohol_status", "diet"
]

HOSPITALS = [
    "Apollo_Private_Hospital",
    "AIIMS_Government_Hospital",
    "Fortis_National_Hospital",
    "District_Rural_Hospital",
]

TARGET_COLS = ["diabetes", "heart_disease", "liver_disease"]


def preprocess(df):
    df = df.copy()
    maps = {
        "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
        "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
        "alcohol_status": {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3},
        "diet": {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3},
        "gender": {"Female": 0, "Male": 1},
    }
    for col, m in maps.items():
        if col in df.columns and df[col].dtype == object:
            df[col] = df[col].map(m).fillna(0)
    available = [c for c in FEATURE_COLS if c in df.columns]
    X = df[available].fillna(df[available].median(numeric_only=True))
    # Force all columns to numeric, coerce errors to 0
    X = X.apply(pd.to_numeric, errors='coerce').fillna(0)
    return X.values, available


def build_model(scale_pos_weight=1.0):
    if USE_XGB:
        return XGBClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, verbosity=0,
        )
    else:
        return GradientBoostingClassifier(
            n_estimators=80, max_depth=4, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )


def train_all():
    os.makedirs("ml/saved_models", exist_ok=True)
    all_metadata = {}

    for hospital in HOSPITALS:
        csv = f"datasets/data/{hospital}.csv"
        if not os.path.exists(csv):
            print(f"  ⚠️  {hospital} CSV not found, skipping")
            continue

        df = pd.read_csv(csv)
        print(f"\n{'='*50}\nTraining: {hospital} ({len(df)} records)")
        X, feature_names = preprocess(df)
        hospital_meta = {}

        for target in TARGET_COLS:
            if target not in df.columns:
                continue
            y = df[target].values
            if len(np.unique(y)) < 2:
                y[0] = 1

            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            w = max((y_tr == 0).sum() / max((y_tr == 1).sum(), 1), 1.0)
            model = build_model(w)
            model.fit(X_tr, y_tr)

            y_pred = model.predict(X_te)
            y_prob = model.predict_proba(X_te)[:, 1]
            metrics = {
                "accuracy": round(accuracy_score(y_te, y_pred), 4),
                "precision": round(precision_score(y_te, y_pred, zero_division=0), 4),
                "recall": round(recall_score(y_te, y_pred, zero_division=0), 4),
                "f1": round(f1_score(y_te, y_pred, zero_division=0), 4),
                "auc_roc": round(roc_auc_score(y_te, y_prob) if len(np.unique(y_te)) > 1 else 0.5, 4),
            }

            fi = dict(zip(feature_names, model.feature_importances_.tolist()))
            fi_sorted = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:12])

            path = f"ml/saved_models/{hospital}_{target}.pkl"
            with open(path, "wb") as f:
                pickle.dump({"model": model, "scaler": None, "feature_names": feature_names,
                             "metrics": metrics, "feature_importance": fi_sorted}, f)

            hospital_meta[target] = {"metrics": metrics, "feature_importance": fi_sorted,
                                      "n_samples": len(X_tr)}
            print(f"  {target}: acc={metrics['accuracy']:.3f}  auc={metrics['auc_roc']:.3f}  f1={metrics['f1']:.3f}")

        all_metadata[hospital] = hospital_meta

    with open("ml/saved_models/metadata.json", "w") as f:
        json.dump(all_metadata, f, indent=2)

    # Save to SQLite
    from datetime import datetime
    conn = sqlite3.connect("datasets/nfhis.db")
    records = []
    for h, diseases in all_metadata.items():
        for d, data in diseases.items():
            m = data["metrics"]
            records.append((h, d, m["accuracy"], m["precision"], m["recall"], m["f1"], m["auc_roc"], 1, datetime.now().isoformat()))

    conn.executemany("""
        INSERT OR REPLACE INTO model_performance
        (hospital, disease_type, accuracy, precision_score, recall, f1_score, auc_roc, round_number, trained_at)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, records)
    conn.commit()
    conn.close()

    print(f"\n✅ Trained {sum(len(v) for v in all_metadata.values())} models")
    return all_metadata


def predict(patient: dict, hospital: str = "Apollo_Private_Hospital") -> dict:
    results = {}
    maps = {
        "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
        "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
        "alcohol_status": {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3},
        "diet": {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3},
        "gender": {"Female": 0, "Male": 1},
    }
    p = {k: (maps.get(k, {}).get(str(v), v) if isinstance(v, str) else v) for k, v in patient.items()}

    for disease in TARGET_COLS:
        path = f"ml/saved_models/{hospital}_{disease}.pkl"
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            saved = pickle.load(f)
        model, feature_names = saved["model"], saved["feature_names"]
        X = np.array([[float(p.get(fn, 0) or 0) for fn in feature_names]])
        X = np.nan_to_num(X)
        prob = float(model.predict_proba(X)[0][1])
        top_fi = sorted(zip(feature_names, model.feature_importances_), key=lambda x: x[1], reverse=True)[:5]
        results[disease] = {
            "risk_probability": round(prob * 100, 2),
            "prediction": int(prob > 0.5),
            "risk_level": "Critical" if prob > 0.75 else "High" if prob > 0.55 else "Medium" if prob > 0.35 else "Low",
            "top_factors": [{"feature": f, "importance": round(v, 4)} for f, v in top_fi],
        }
    return results


if __name__ == "__main__":
    meta = train_all()
    print("\n🧪 Test prediction:")
    sample = {
        "age": 52, "bmi": 28.5, "gender": "Male", "systolic_bp": 145, "diastolic_bp": 92,
        "heart_rate": 82, "fasting_glucose": 165, "hba1c": 7.2, "insulin": 18.5,
        "total_cholesterol": 220, "hdl_cholesterol": 38, "ldl_cholesterol": 145,
        "triglycerides": 185, "sgpt": 45, "sgot": 38, "alkaline_phosphatase": 95,
        "bilirubin_total": 0.9, "albumin": 3.8, "creatinine": 1.1, "urea": 32,
        "hemoglobin": 13.5, "wbc_count": 8500, "platelet_count": 230000,
        "spo2": 96, "temperature": 98.6, "respiratory_rate": 18, "uric_acid": 6.2,
        "family_history_diabetes": 1, "family_history_heart": 1, "family_history_liver": 0,
        "socioeconomic_score": 6.0, "exercise_level": "Light", "smoking_status": "Former",
        "alcohol_status": "Occasional", "diet": "Non-Vegetarian",
    }
    r = predict(sample)
    for d, v in r.items():
        print(f"  {d}: {v['risk_level']} ({v['risk_probability']}%)")
