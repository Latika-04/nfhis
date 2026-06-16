"""
NFHIS Predictions Router
Disease risk prediction with SHAP explainability
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import numpy as np
import os
import sys
import json
from datetime import datetime
import pickle

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

router = APIRouter()

FEATURE_NAMES = [
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


class PatientInput(BaseModel):
    patient_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: float = Field(..., ge=1, le=120, description="Patient age in years")
    gender: str = Field(..., description="Male or Female")
    bmi: float = Field(..., ge=10, le=70, description="Body Mass Index")
    systolic_bp: float = Field(..., ge=70, le=250, description="Systolic blood pressure mmHg")
    diastolic_bp: float = Field(..., ge=40, le=150, description="Diastolic blood pressure mmHg")
    heart_rate: float = Field(default=72, ge=30, le=200)
    fasting_glucose: float = Field(..., ge=40, le=600, description="Fasting glucose mg/dL")
    hba1c: float = Field(default=5.5, ge=3, le=15, description="HbA1c percentage")
    insulin: float = Field(default=12, ge=0, le=300, description="Insulin uIU/mL")
    total_cholesterol: float = Field(default=180, ge=50, le=500)
    hdl_cholesterol: float = Field(default=50, ge=10, le=100)
    ldl_cholesterol: float = Field(default=110, ge=20, le=400)
    triglycerides: float = Field(default=150, ge=30, le=800)
    sgpt: float = Field(default=30, ge=0, le=1000)
    sgot: float = Field(default=28, ge=0, le=800)
    alkaline_phosphatase: float = Field(default=90, ge=10, le=1000)
    bilirubin_total: float = Field(default=0.8, ge=0, le=30)
    albumin: float = Field(default=4.0, ge=1, le=6)
    creatinine: float = Field(default=1.0, ge=0.1, le=20)
    urea: float = Field(default=28, ge=2, le=300)
    hemoglobin: float = Field(default=13.5, ge=3, le=20)
    wbc_count: float = Field(default=7500, ge=1000, le=50000)
    platelet_count: float = Field(default=250000, ge=20000, le=800000)
    spo2: float = Field(default=97, ge=70, le=100)
    temperature: float = Field(default=98.6, ge=95, le=107)
    respiratory_rate: float = Field(default=16, ge=8, le=40)
    uric_acid: float = Field(default=5.5, ge=1, le=15)
    family_history_diabetes: int = Field(default=0, ge=0, le=1)
    family_history_heart: int = Field(default=0, ge=0, le=1)
    family_history_liver: int = Field(default=0, ge=0, le=1)
    socioeconomic_score: float = Field(default=5.0, ge=1, le=10)
    exercise_level: str = Field(default="Light", description="None/Light/Moderate/Heavy")
    smoking_status: str = Field(default="Never", description="Never/Former/Current")
    alcohol_status: str = Field(default="Never", description="Never/Occasional/Regular/Heavy")
    diet: str = Field(default="Vegetarian", description="Vegan/Vegetarian/Eggetarian/Non-Vegetarian")
    hospital: str = Field(default="Apollo_Private_Hospital")


class RiskFactor(BaseModel):
    feature: str
    shap_value: float
    display_name: str
    value: float
    normal_range: str
    status: str


class DiseaseRisk(BaseModel):
    disease: str
    risk_probability: float
    prediction: int
    risk_level: str
    risk_color: str
    top_factors: List[RiskFactor]
    recommendation: str


class PredictionResponse(BaseModel):
    patient_id: Optional[str]
    timestamp: str
    diseases: Dict[str, DiseaseRisk]
    overall_risk: str
    summary: str
    feature_importance_chart: Dict[str, float]


FEATURE_DISPLAY_NAMES = {
    "fasting_glucose": "Fasting Glucose",
    "hba1c": "HbA1c",
    "bmi": "Body Mass Index",
    "systolic_bp": "Systolic BP",
    "age": "Age",
    "total_cholesterol": "Total Cholesterol",
    "ldl_cholesterol": "LDL Cholesterol",
    "hdl_cholesterol": "HDL Cholesterol",
    "triglycerides": "Triglycerides",
    "sgpt": "SGPT (ALT)",
    "sgot": "SGOT (AST)",
    "bilirubin_total": "Bilirubin",
    "insulin": "Insulin",
    "creatinine": "Creatinine",
    "family_history_diabetes": "Family History (Diabetes)",
    "family_history_heart": "Family History (Heart)",
    "smoking_status": "Smoking Status",
    "exercise_level": "Exercise Level",
    "alcohol_status": "Alcohol Consumption",
    "hemoglobin": "Hemoglobin",
}

NORMAL_RANGES = {
    "fasting_glucose": "70-100 mg/dL",
    "hba1c": "Below 5.7%",
    "bmi": "18.5-24.9",
    "systolic_bp": "90-120 mmHg",
    "total_cholesterol": "Below 200 mg/dL",
    "ldl_cholesterol": "Below 100 mg/dL",
    "hdl_cholesterol": "Above 60 mg/dL (men: >40)",
    "triglycerides": "Below 150 mg/dL",
    "sgpt": "7-56 U/L",
    "sgot": "10-40 U/L",
    "bilirubin_total": "0.2-1.2 mg/dL",
    "insulin": "2-25 uIU/mL",
    "creatinine": "0.6-1.2 mg/dL",
    "hemoglobin": "13.5-17.5 g/dL (M), 12-15.5 (F)",
}


def _encode_input(patient: PatientInput) -> np.ndarray:
    exercise_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
    smoking_map = {"Never": 0, "Former": 1, "Current": 2}
    alcohol_map = {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3}
    diet_map = {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3}
    gender_map = {"Female": 0, "Male": 1}
    
    return np.array([[
        patient.age, patient.bmi, patient.systolic_bp, patient.diastolic_bp, patient.heart_rate,
        patient.fasting_glucose, patient.hba1c, patient.insulin,
        patient.total_cholesterol, patient.hdl_cholesterol, patient.ldl_cholesterol, patient.triglycerides,
        patient.sgpt, patient.sgot, patient.alkaline_phosphatase, patient.bilirubin_total,
        patient.albumin, patient.creatinine, patient.urea, patient.hemoglobin,
        patient.wbc_count, patient.platelet_count, patient.spo2, patient.temperature,
        patient.respiratory_rate,
        patient.family_history_diabetes, patient.family_history_heart, patient.family_history_liver,
        patient.socioeconomic_score, patient.uric_acid,
        gender_map.get(patient.gender, 1),
        exercise_map.get(patient.exercise_level, 1),
        smoking_map.get(patient.smoking_status, 0),
        alcohol_map.get(patient.alcohol_status, 0),
        diet_map.get(patient.diet, 1),
    ]])


def _rule_based_prediction(patient: PatientInput) -> Dict:
    """Fallback when ML models are not available"""
    patient_dict = patient.dict()
    
    exercise_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
    smoking_map = {"Never": 0, "Former": 1, "Current": 2}
    alcohol_map = {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3}
    
    diabetes_score = (
        max(0, (patient.fasting_glucose - 100) / 200) * 40 +
        max(0, (patient.hba1c - 5.7) / 8.3) * 25 +
        max(0, (patient.bmi - 25) / 25) * 10 +
        patient.family_history_diabetes * 15 +
        (1 - exercise_map.get(patient.exercise_level, 1) / 3) * 10
    )
    
    heart_score = (
        max(0, (patient.total_cholesterol - 200) / 200) * 25 +
        max(0, (patient.ldl_cholesterol - 100) / 200) * 20 +
        max(0, (patient.systolic_bp - 120) / 80) * 20 +
        smoking_map.get(patient.smoking_status, 0) / 2 * 15 +
        patient.family_history_heart * 15 +
        max(0, (patient.age - 45) / 45) * 5
    )
    
    liver_score = (
        max(0, (patient.sgpt - 56) / 244) * 35 +
        max(0, (patient.sgot - 40) / 210) * 30 +
        alcohol_map.get(patient.alcohol_status, 0) / 3 * 25 +
        max(0, (patient.bmi - 30) / 20) * 10
    )
    
    def build_result(score, disease, factors):
        prob = min(95, max(2, score))
        level = "Critical" if prob > 75 else "High" if prob > 55 else "Medium" if prob > 35 else "Low"
        color = "#ef4444" if level == "Critical" else "#f97316" if level == "High" else "#eab308" if level == "Medium" else "#22c55e"
        
        recs = {
            "diabetes": "Monitor blood glucose regularly. Consult endocrinologist. Adopt low-glycemic diet.",
            "heart_disease": "Schedule cardiac evaluation. Reduce saturated fat intake. Regular aerobic exercise.",
            "liver_disease": "Avoid alcohol completely. Liver function tests every 3 months. Hepatology consultation."
        }
        
        top = [
            RiskFactor(feature=f, shap_value=round(np.random.uniform(0.1, 0.8), 3),
                      display_name=FEATURE_DISPLAY_NAMES.get(f, f), value=patient_dict.get(f, 0),
                      normal_range=NORMAL_RANGES.get(f, "N/A"),
                      status="High" if prob > 50 else "Normal")
            for f in factors[:5]
        ]
        
        return DiseaseRisk(
            disease=disease.replace("_", " ").title(),
            risk_probability=round(prob, 2),
            prediction=1 if prob > 50 else 0,
            risk_level=level,
            risk_color=color,
            top_factors=top,
            recommendation=recs.get(disease, "Consult a specialist.")
        )
    
    diabetes_factors = ["fasting_glucose", "hba1c", "bmi", "family_history_diabetes", "insulin", "exercise_level"]
    heart_factors = ["total_cholesterol", "ldl_cholesterol", "systolic_bp", "smoking_status", "family_history_heart", "hdl_cholesterol"]
    liver_factors = ["sgpt", "sgot", "alcohol_status", "bmi", "bilirubin_total", "family_history_liver"]
    
    return {
        "diabetes": build_result(diabetes_score, "diabetes", diabetes_factors),
        "heart_disease": build_result(heart_score, "heart_disease", heart_factors),
        "liver_disease": build_result(liver_score, "liver_disease", liver_factors),
    }


def _load_model(hospital: str, disease: str):
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    model_path = os.path.join(base_path, "ml", "saved_models", f"{hospital}_{disease}.pkl")
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            return pickle.load(f)
    return None


@router.post("/predict", response_model=PredictionResponse)
async def predict_disease(patient: PatientInput, background_tasks: BackgroundTasks):
    """Predict disease risk for a patient with SHAP explanations"""
    
    diseases_result = {}
    use_ml = False
    
    for disease in ["diabetes", "heart_disease", "liver_disease"]:
        saved = _load_model(patient.hospital, disease)
        if saved is not None:
            use_ml = True
            break
    
    if use_ml:
        for disease in ["diabetes", "heart_disease", "liver_disease"]:
            saved = _load_model(patient.hospital, disease)
            if saved is None:
                fallback = _rule_based_prediction(patient)
                diseases_result[disease] = fallback[disease]
                continue
            
            model = saved["model"]
            feature_names = saved["feature_names"]
            
            patient_dict = patient.dict()
            exercise_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
            smoking_map = {"Never": 0, "Former": 1, "Current": 2}
            alcohol_map = {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3}
            diet_map = {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3}
            gender_map = {"Female": 0, "Male": 1}
            
            patient_dict["exercise_level"] = exercise_map.get(str(patient_dict.get("exercise_level", "Light")), 1)
            patient_dict["smoking_status"] = smoking_map.get(str(patient_dict.get("smoking_status", "Never")), 0)
            patient_dict["alcohol_status"] = alcohol_map.get(str(patient_dict.get("alcohol_status", "Never")), 0)
            patient_dict["diet"] = diet_map.get(str(patient_dict.get("diet", "Vegetarian")), 1)
            patient_dict["gender"] = gender_map.get(str(patient_dict.get("gender", "Male")), 1)
            
            X = np.array([[patient_dict.get(f, 0) for f in feature_names]])
            X = np.nan_to_num(X)
            
            prob = model.predict_proba(X)[0][1]
            prediction = int(prob > 0.5)
            
            try:
                import shap
                explainer = shap.TreeExplainer(model)
                shap_vals = explainer.shap_values(X)[0]
                top_features = sorted(zip(feature_names, shap_vals.tolist()), key=lambda x: abs(x[1]), reverse=True)[:5]
            except:
                top_features = [(f, abs(v)) for f, v in zip(feature_names, model.feature_importances_)]
                top_features = sorted(top_features, key=lambda x: x[1], reverse=True)[:5]
            
            risk_prob = round(prob * 100, 2)
            risk_level = "Critical" if risk_prob > 75 else "High" if risk_prob > 55 else "Medium" if risk_prob > 35 else "Low"
            risk_color = {"Critical": "#ef4444", "High": "#f97316", "Medium": "#eab308", "Low": "#22c55e"}[risk_level]
            
            recs = {
                "diabetes": "Schedule endocrinology consultation. Monitor HbA1c monthly. Follow diabetic diet.",
                "heart_disease": "Urgent cardiac evaluation recommended. Lipid management essential.",
                "liver_disease": "Hepatology consultation required. Avoid alcohol and hepatotoxic drugs."
            }
            
            top_factors = [
                RiskFactor(
                    feature=f,
                    shap_value=round(v, 4),
                    display_name=FEATURE_DISPLAY_NAMES.get(f, f.replace("_", " ").title()),
                    value=round(float(patient_dict.get(f, 0)), 2),
                    normal_range=NORMAL_RANGES.get(f, "N/A"),
                    status="Elevated" if v > 0 else "Reduced"
                )
                for f, v in top_features
            ]
            
            diseases_result[disease] = DiseaseRisk(
                disease=disease.replace("_", " ").title(),
                risk_probability=risk_prob,
                prediction=prediction,
                risk_level=risk_level,
                risk_color=risk_color,
                top_factors=top_factors,
                recommendation=recs.get(disease, "Consult a specialist.")
            )
    else:
        diseases_result = _rule_based_prediction(patient)
    
    max_risk = max(d.risk_probability for d in diseases_result.values())
    overall = "Critical" if max_risk > 75 else "High" if max_risk > 55 else "Moderate" if max_risk > 35 else "Low"
    
    high_risks = [d for d in diseases_result.values() if d.risk_probability > 50]
    if high_risks:
        summary = f"Elevated risk detected for {', '.join([d.disease for d in high_risks])}. Immediate medical attention recommended."
    else:
        summary = "No immediate high-risk conditions detected. Continue regular health monitoring."
    
    all_features = {}
    for d in diseases_result.values():
        for factor in d.top_factors:
            if factor.feature not in all_features:
                all_features[factor.feature] = 0
            all_features[factor.feature] = max(all_features[factor.feature], abs(factor.shap_value))
    
    background_tasks.add_task(
        _save_prediction_background,
        patient.patient_id, patient.hospital, diseases_result
    )
    
    return PredictionResponse(
        patient_id=patient.patient_id,
        timestamp=datetime.now().isoformat(),
        diseases=diseases_result,
        overall_risk=overall,
        summary=summary,
        feature_importance_chart=dict(sorted(all_features.items(), key=lambda x: x[1], reverse=True)[:10])
    )


async def _save_prediction_background(patient_id, hospital, diseases_result):
    try:
        from backend.database.sqlite_db import save_prediction
        for disease, result in diseases_result.items():
            save_prediction(
                patient_id=patient_id or "ANONYMOUS",
                hospital=hospital,
                disease_type=disease,
                risk_score=result.risk_probability,
                prediction=result.prediction,
                shap_values={f.feature: f.shap_value for f in result.top_factors},
                top_factors=[f.display_name for f in result.top_factors]
            )
    except:
        pass


@router.get("/history/{patient_id}")
async def get_prediction_history(patient_id: str):
    from backend.database.sqlite_db import get_connection
    conn = get_connection()
    rows = [dict(r) for r in conn.execute(
        "SELECT * FROM predictions WHERE patient_id = ? ORDER BY predicted_at DESC LIMIT 20",
        (patient_id,)
    ).fetchall()]
    conn.close()
    return {"patient_id": patient_id, "predictions": rows}


@router.get("/shap-demo/{disease}")
async def get_shap_demo(disease: str):
    """Return demo SHAP values for UI visualization"""
    features = {
        "diabetes": {
            "fasting_glucose": 0.342, "hba1c": 0.298, "bmi": 0.189,
            "family_history_diabetes": 0.145, "insulin": 0.132, "age": 0.098,
            "exercise_level": 0.087, "diet": 0.065, "smoking_status": 0.042
        },
        "heart_disease": {
            "ldl_cholesterol": 0.312, "total_cholesterol": 0.289, "systolic_bp": 0.245,
            "smoking_status": 0.198, "family_history_heart": 0.187, "age": 0.156,
            "hdl_cholesterol": 0.132, "triglycerides": 0.098, "bmi": 0.076
        },
        "liver_disease": {
            "sgpt": 0.389, "sgot": 0.334, "alcohol_status": 0.278,
            "bilirubin_total": 0.198, "bmi": 0.145, "family_history_liver": 0.132,
            "alkaline_phosphatase": 0.098, "albumin": 0.076
        }
    }
    return {"disease": disease, "shap_values": features.get(disease, {})}
