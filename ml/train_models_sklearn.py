"""
NFHIS ML Model Training — Sklearn + GradientBoosting fallback
Works with or without XGBoost installed
"""

import numpy as np
import pandas as pd
import sqlite3
import json
import pickle
import os
import sys
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score
)
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
import warnings
warnings.filterwarnings("ignore")

# Try xgboost, fall back to GradientBoosting
try:
    from xgboost import XGBClassifier
    USE_XGB = True
    print("Using XGBoost")
except ImportError:
    USE_XGB = False
    print("XGBoost not available — using GradientBoostingClassifier")

# Try shap, fall back to feature_importances_
try:
    import shap
    USE_SHAP = True
except ImportError:
    USE_SHAP = False

FEATURE_COLS = [
    "age", "bmi", "systolic_bp", "diastolic_bp", "heart_rate",
    "fasting_glucose", "hba1c", "insulin", "total_cholesterol",
    "hdl_cholesterol", "ldl_cholesterol", "triglycerides",
    "sgpt", "sgot", "alkaline_phosphatase", "bilirubin_total",
    "albumin", "creatinine", "urea", "hemoglobin", "wbc_count",
    "platelet_count", "spo2", "temperature", "respiratory_rate",
    "family_history_diabetes", "family_history_heart", "family_history_liver",
    "socioeconomic_score", "uric_acid",
    "gender", "exercise_level", "smoking_status", "alcohol_status", "diet",
]

HOSPITALS = [
    "Apollo_Private_Hospital",
    "AIIMS_Government_Hospital",
    "Fortis_National_Hospital",
    "District_Rural_Hospital",
]

TARGET_COLS = ["diabetes", "heart_disease", "liver_disease"]


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    maps = {
        "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
        "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
        "alcohol_status": {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3},
        "diet": {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3},
        "gender": {"Female": 0, "Male": 1},
    }
    for col, mapping in maps.items():
        if col in df.columns and df[col].dtype == object:
            df[col] = df[col].map(mapping).fillna(0)
    return df


def build_model(scale_pos_weight: float = 1.0):
    if USE_XGB:
        from xgboost import XGBClassifier
        return XGBClassifier(
            n_estimators=100, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, verbosity=0
        )
    else:
        return GradientBoostingClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42, verbose=0
        )


def train_hospital(hospital: str) -> dict:
    csv_path = f"datasets/data/{hospital}.csv"
    if not os.path.exists(csv_path):
        print(f"  No data for {hospital}")
        return {}

    df = pd.read_csv(csv_path)
    df = encode_categoricals(df)

    available_features = [f for f in FEATURE_COLS if f in df.columns]
    Xdf = df[available_features].copy()
    # encode any remaining string columns
    for col in Xdf.select_dtypes(include="object").columns:
        Xdf[col] = pd.Categorical(Xdf[col]).codes
    num_cols = Xdf.select_dtypes(include=[np.number]).columns
    Xdf[num_cols] = Xdf[num_cols].fillna(Xdf[num_cols].median())
    Xdf = Xdf.fillna(0)
    X = Xdf.astype(float)

    results = {}
    for target in TARGET_COLS:
        if target not in df.columns:
            continue
        y = df[target].values
        if len(np.unique(y)) < 2:
            y[0] = 1

        X_train, X_test, y_train, y_test = train_test_split(
            X.values, y, test_size=0.2, random_state=42, stratify=y
        )
        scale_pw = max((y_train == 0).sum() / max((y_train == 1).sum(), 1), 1.0)
        model = build_model(scale_pw)
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        metrics = {
            "accuracy": round(accuracy_score(y_test, y_pred), 4),
            "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
            "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
            "f1": round(f1_score(y_test, y_pred, zero_division=0), 4),
            "auc_roc": round(roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.5, 4),
        }

        fi = model.feature_importances_
        fi_dict = dict(sorted(
            zip(available_features, fi.tolist()),
            key=lambda x: x[1], reverse=True
        )[:15])

        # Optional SHAP
        shap_dict = {}
        if USE_SHAP:
            try:
                explainer = shap.TreeExplainer(model)
                sv = explainer.shap_values(X_test[:50])
                if isinstance(sv, list):
                    sv = sv[1]
                shap_dict = dict(sorted(
                    zip(available_features, np.abs(sv).mean(axis=0).tolist()),
                    key=lambda x: x[1], reverse=True
                )[:15])
            except Exception:
                shap_dict = fi_dict

        results[target] = {
            "model": model,
            "feature_names": available_features,
            "metrics": metrics,
            "feature_importance": shap_dict or fi_dict,
            "n_samples": len(X_train),
        }

        print(f"    {target}: acc={metrics['accuracy']:.3f} "
              f"auc={metrics['auc_roc']:.3f} f1={metrics['f1']:.3f}")

    return results


def save_models(all_models: dict) -> dict:
    os.makedirs("ml/saved_models", exist_ok=True)
    metadata = {}

    for hospital, diseases in all_models.items():
        metadata[hospital] = {}
        for disease, data in diseases.items():
            path = f"ml/saved_models/{hospital}_{disease}.pkl"
            with open(path, "wb") as f:
                pickle.dump({
                    "model": data["model"],
                    "feature_names": data["feature_names"],
                    "metrics": data["metrics"],
                    "feature_importance": data["feature_importance"],
                }, f)
            metadata[hospital][disease] = {
                "metrics": data["metrics"],
                "feature_importance": data["feature_importance"],
                "n_samples": data["n_samples"],
                "model_path": path,
            }

    with open("ml/saved_models/metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("✅ Models saved to ml/saved_models/")
    return metadata


def save_metrics_sqlite(metadata: dict):
    from datetime import datetime
    conn = sqlite3.connect("datasets/nfhis.db")
    records = []
    for hosp, diseases in metadata.items():
        for disease, data in diseases.items():
            m = data["metrics"]
            records.append((
                hosp, disease,
                m["accuracy"], m["precision"], m["recall"], m["f1"], m["auc_roc"],
                1, datetime.now().isoformat()
            ))
    conn.executemany("""
        INSERT OR REPLACE INTO model_performance
        (hospital, disease_type, accuracy, precision_score, recall, f1_score, auc_roc, round_number, trained_at)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, records)
    conn.commit()
    conn.close()
    print("✅ Metrics saved to SQLite")


def predict_patient(patient_dict: dict, hospital: str = "Apollo_Private_Hospital") -> dict:
    maps = {
        "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
        "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
        "alcohol_status": {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3},
        "diet": {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3},
        "gender": {"Female": 0, "Male": 1},
    }
    results = {}
    for disease in ["diabetes", "heart_disease", "liver_disease"]:
        path = f"ml/saved_models/{hospital}_{disease}.pkl"
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            saved = pickle.load(f)
        model = saved["model"]
        feature_names = saved["feature_names"]

        encoded = {}
        for k, v in patient_dict.items():
            if k in maps and isinstance(v, str):
                encoded[k] = maps[k].get(v, 0)
            else:
                encoded[k] = float(v) if v is not None else 0.0

        X = np.array([[encoded.get(f, 0.0) for f in feature_names]])
        X = np.nan_to_num(X)

        prob = model.predict_proba(X)[0][1]
        fi = saved["feature_importance"]
        top = sorted(fi.items(), key=lambda x: x[1], reverse=True)[:5]

        results[disease] = {
            "risk_probability": round(prob * 100, 2),
            "prediction": int(prob > 0.5),
            "risk_level": "Critical" if prob > 0.75 else "High" if prob > 0.55 else "Medium" if prob > 0.35 else "Low",
            "top_factors": [{"feature": k, "importance": round(v, 4)} for k, v in top],
        }
    return results


if __name__ == "__main__":
    print("=" * 60)
    print("NFHIS ML Training Pipeline")
    print("=" * 60)

    all_models = {}
    for hospital in HOSPITALS:
        print(f"\nTraining {hospital}...")
        models = train_hospital(hospital)
        if models:
            all_models[hospital] = models

    if all_models:
        metadata = save_models(all_models)
        save_metrics_sqlite(metadata)

        print("\n" + "=" * 60)
        print("Test Prediction:")
        sample = {
            "age": 52, "bmi": 28.5, "gender": "Male",
            "systolic_bp": 145, "diastolic_bp": 92, "heart_rate": 82,
            "fasting_glucose": 165, "hba1c": 7.2, "insulin": 18.5,
            "total_cholesterol": 220, "hdl_cholesterol": 38,
            "ldl_cholesterol": 145, "triglycerides": 185,
            "sgpt": 45, "sgot": 38, "alkaline_phosphatase": 95,
            "bilirubin_total": 0.9, "albumin": 3.8, "creatinine": 1.1,
            "urea": 32, "hemoglobin": 13.5, "wbc_count": 8500,
            "platelet_count": 230000, "spo2": 96, "temperature": 98.6,
            "respiratory_rate": 18, "uric_acid": 6.2,
            "family_history_diabetes": 1, "family_history_heart": 1,
            "family_history_liver": 0, "socioeconomic_score": 6.0,
            "exercise_level": "Light", "smoking_status": "Former",
            "alcohol_status": "Occasional", "diet": "Non-Vegetarian",
        }
        results = predict_patient(sample)
        for disease, r in results.items():
            print(f"  {disease}: {r['risk_level']} ({r['risk_probability']}%)")
    else:
        print("No models trained — ensure datasets exist")
