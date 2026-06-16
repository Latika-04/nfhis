"""
NFHIS ML Model Training
XGBoost + Scikit-learn models for Heart Disease, Diabetes, Liver Disease
With SHAP explainability
"""

import numpy as np
import pandas as pd
import sqlite3
import json
import pickle
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, classification_report
)
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier
import shap
import warnings
warnings.filterwarnings("ignore")

FEATURE_COLS = [
    "age", "bmi", "systolic_bp", "diastolic_bp", "heart_rate",
    "fasting_glucose", "hba1c", "insulin", "total_cholesterol",
    "hdl_cholesterol", "ldl_cholesterol", "triglycerides",
    "sgpt", "sgot", "alkaline_phosphatase", "bilirubin_total",
    "albumin", "creatinine", "urea", "hemoglobin", "wbc_count",
    "platelet_count", "spo2", "temperature", "respiratory_rate",
    "family_history_diabetes", "family_history_heart", "family_history_liver",
    "socioeconomic_score", "uric_acid"
]

CATEGORICAL_COLS = ["gender", "exercise_level", "smoking_status", "alcohol_status", "diet"]

TARGET_COLS = {
    "diabetes": "diabetes",
    "heart_disease": "heart_disease",
    "liver_disease": "liver_disease"
}

HOSPITALS = [
    "Apollo_Private_Hospital",
    "AIIMS_Government_Hospital",
    "Fortis_National_Hospital",
    "District_Rural_Hospital"
]


def load_hospital_data(hospital: str) -> pd.DataFrame:
    csv_path = f"datasets/data/{hospital}.csv"
    if os.path.exists(csv_path):
        return pd.read_csv(csv_path)
    
    conn = sqlite3.connect("datasets/nfhis.db")
    table = hospital.lower().replace(" ", "_")
    try:
        df = pd.read_sql(f"SELECT * FROM {table}", conn)
    except:
        df = pd.read_sql("SELECT * FROM patients WHERE hospital = ?", conn, params=(hospital,))
    conn.close()
    return df


def preprocess_data(df: pd.DataFrame) -> tuple:
    df = df.copy()
    
    exercise_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
    smoking_map = {"Never": 0, "Former": 1, "Current": 2}
    alcohol_map = {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3}
    diet_map = {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3}
    gender_map = {"Female": 0, "Male": 1}
    
    df["exercise_level"] = df["exercise_level"].map(exercise_map).fillna(0)
    df["smoking_status"] = df["smoking_status"].map(smoking_map).fillna(0)
    df["alcohol_status"] = df["alcohol_status"].map(alcohol_map).fillna(0)
    df["diet"] = df["diet"].map(diet_map).fillna(1)
    df["gender"] = df["gender"].map(gender_map).fillna(0)
    
    all_features = FEATURE_COLS + ["gender", "exercise_level", "smoking_status", "alcohol_status", "diet"]
    available_features = [f for f in all_features if f in df.columns]
    
    X = df[available_features].fillna(df[available_features].median())
    
    return X, available_features


def train_hospital_models(hospital: str, df: pd.DataFrame) -> dict:
    print(f"\n{'='*50}")
    print(f"Training models for: {hospital}")
    print(f"Dataset size: {len(df)}")
    
    X, feature_names = preprocess_data(df)
    models = {}
    
    for disease, target_col in TARGET_COLS.items():
        if target_col not in df.columns:
            continue
        
        y = df[target_col]
        if y.nunique() < 2:
            continue
        
        print(f"\n  Training {disease} model...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
        
        model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            verbosity=0
        )
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
        
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_test[:50])
        
        feature_importance = dict(zip(
            feature_names,
            np.abs(shap_values).mean(axis=0).tolist()
        ))
        feature_importance_sorted = dict(
            sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:15]
        )
        
        model_weights = {
            "feature_importances": model.feature_importances_.tolist(),
            "feature_names": feature_names,
            "n_estimators": model.n_estimators,
            "learning_rate": model.learning_rate,
            "max_depth": model.max_depth,
        }
        
        models[disease] = {
            "model": model,
            "scaler": scaler,
            "metrics": metrics,
            "feature_names": feature_names,
            "feature_importance": feature_importance_sorted,
            "model_weights": model_weights,
            "shap_explainer": explainer,
            "n_samples": len(X_train),
        }
        
        print(f"    Accuracy: {metrics['accuracy']:.3f} | AUC-ROC: {metrics['auc_roc']:.3f} | F1: {metrics['f1']:.3f}")
    
    return models


def save_models(all_models: dict):
    os.makedirs("ml/saved_models", exist_ok=True)
    
    model_metadata = {}
    
    for hospital, models in all_models.items():
        hospital_metadata = {}
        for disease, model_data in models.items():
            model_path = f"ml/saved_models/{hospital}_{disease}.pkl"
            save_data = {
                "model": model_data["model"],
                "scaler": model_data["scaler"],
                "feature_names": model_data["feature_names"],
                "metrics": model_data["metrics"],
                "feature_importance": model_data["feature_importance"],
            }
            with open(model_path, "wb") as f:
                pickle.dump(save_data, f)
            
            hospital_metadata[disease] = {
                "metrics": model_data["metrics"],
                "feature_importance": model_data["feature_importance"],
                "n_samples": model_data["n_samples"],
                "model_path": model_path,
            }
        model_metadata[hospital] = hospital_metadata
    
    with open("ml/saved_models/metadata.json", "w") as f:
        json.dump(model_metadata, f, indent=2)
    
    print("\nModels saved successfully!")
    return model_metadata


def save_metrics_to_sqlite(metadata: dict):
    conn = sqlite3.connect("datasets/nfhis.db")
    
    from datetime import datetime
    records = []
    for hospital, diseases in metadata.items():
        for disease, data in diseases.items():
            m = data["metrics"]
            records.append({
                "hospital": hospital,
                "disease_type": disease,
                "accuracy": m["accuracy"],
                "precision_score": m["precision"],
                "recall": m["recall"],
                "f1_score": m["f1"],
                "auc_roc": m["auc_roc"],
                "round_number": 1,
                "trained_at": datetime.now().isoformat()
            })
    
    pd.DataFrame(records).to_sql("model_performance", conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()
    print("Metrics saved to SQLite")


def predict_patient(patient_data: dict, hospital: str = "Apollo_Private_Hospital") -> dict:
    results = {}
    
    for disease in ["diabetes", "heart_disease", "liver_disease"]:
        model_path = f"ml/saved_models/{hospital}_{disease}.pkl"
        if not os.path.exists(model_path):
            continue
        
        with open(model_path, "rb") as f:
            saved = pickle.load(f)
        
        model = saved["model"]
        feature_names = saved["feature_names"]
        explainer_model = shap.TreeExplainer(model)
        
        exercise_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
        smoking_map = {"Never": 0, "Former": 1, "Current": 2}
        alcohol_map = {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3}
        diet_map = {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3}
        gender_map = {"Female": 0, "Male": 1}
        
        processed = patient_data.copy()
        processed["exercise_level"] = exercise_map.get(processed.get("exercise_level", "Light"), 1)
        processed["smoking_status"] = smoking_map.get(processed.get("smoking_status", "Never"), 0)
        processed["alcohol_status"] = alcohol_map.get(processed.get("alcohol_status", "Never"), 0)
        processed["diet"] = diet_map.get(processed.get("diet", "Vegetarian"), 1)
        processed["gender"] = gender_map.get(processed.get("gender", "Male"), 1)
        
        X = np.array([[processed.get(f, 0) for f in feature_names]])
        X = np.nan_to_num(X)
        
        prob = model.predict_proba(X)[0][1]
        prediction = int(prob > 0.5)
        
        shap_vals = explainer_model.shap_values(X)[0]
        top_features = sorted(
            zip(feature_names, shap_vals.tolist()),
            key=lambda x: abs(x[1]),
            reverse=True
        )[:5]
        
        results[disease] = {
            "risk_probability": round(prob * 100, 2),
            "prediction": prediction,
            "risk_level": "High" if prob > 0.7 else "Medium" if prob > 0.4 else "Low",
            "top_factors": [{"feature": f, "shap_value": round(v, 4)} for f, v in top_features],
            "feature_importance": saved["feature_importance"],
        }
    
    return results


if __name__ == "__main__":
    print("NFHIS ML Model Training Pipeline")
    print("=" * 60)
    
    all_models = {}
    for hospital in HOSPITALS:
        df = load_hospital_data(hospital)
        if len(df) == 0:
            print(f"No data found for {hospital}, skipping...")
            continue
        models = train_hospital_models(hospital, df)
        all_models[hospital] = models
    
    metadata = save_models(all_models)
    save_metrics_to_sqlite(metadata)
    
    print("\n" + "=" * 60)
    print("Testing prediction on sample patient:")
    sample_patient = {
        "age": 52, "bmi": 28.5, "gender": "Male",
        "systolic_bp": 145, "diastolic_bp": 92,
        "fasting_glucose": 165, "hba1c": 7.2, "insulin": 18.5,
        "total_cholesterol": 220, "hdl_cholesterol": 38, "ldl_cholesterol": 145,
        "triglycerides": 185, "sgpt": 45, "sgot": 38,
        "alkaline_phosphatase": 95, "bilirubin_total": 0.9, "albumin": 3.8,
        "creatinine": 1.1, "urea": 32, "hemoglobin": 13.5, "wbc_count": 8500,
        "platelet_count": 230000, "spo2": 96, "temperature": 98.6,
        "respiratory_rate": 18, "heart_rate": 82, "uric_acid": 6.2,
        "family_history_diabetes": 1, "family_history_heart": 1,
        "family_history_liver": 0, "socioeconomic_score": 6.0,
        "exercise_level": "Light", "smoking_status": "Former",
        "alcohol_status": "Occasional", "diet": "Non-Vegetarian"
    }
    
    results = predict_patient(sample_patient)
    for disease, result in results.items():
        print(f"\n{disease}: {result['risk_level']} Risk ({result['risk_probability']}%)")
        print(f"  Top factors: {[f['feature'] for f in result['top_factors'][:3]]}")
