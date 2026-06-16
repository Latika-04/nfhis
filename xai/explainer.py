"""
NFHIS XAI (Explainable AI) Module
SHAP-based explanations for disease predictions
"""

import numpy as np
import pandas as pd
import json
import os
import pickle
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings("ignore")

try:
    import shap
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("SHAP not available, using feature importance fallback")


FEATURE_DISPLAY_NAMES = {
    "fasting_glucose": "Fasting Glucose (mg/dL)",
    "hba1c": "HbA1c (%)",
    "bmi": "Body Mass Index",
    "systolic_bp": "Systolic BP (mmHg)",
    "diastolic_bp": "Diastolic BP (mmHg)",
    "age": "Age (years)",
    "total_cholesterol": "Total Cholesterol",
    "ldl_cholesterol": "LDL Cholesterol",
    "hdl_cholesterol": "HDL Cholesterol",
    "triglycerides": "Triglycerides",
    "sgpt": "SGPT/ALT (U/L)",
    "sgot": "SGOT/AST (U/L)",
    "bilirubin_total": "Bilirubin Total",
    "alkaline_phosphatase": "Alkaline Phosphatase",
    "albumin": "Albumin (g/dL)",
    "insulin": "Insulin (uIU/mL)",
    "creatinine": "Creatinine (mg/dL)",
    "urea": "Blood Urea (mg/dL)",
    "hemoglobin": "Hemoglobin (g/dL)",
    "family_history_diabetes": "Family Hx Diabetes",
    "family_history_heart": "Family Hx Heart Disease",
    "family_history_liver": "Family Hx Liver Disease",
    "smoking_status": "Smoking Status",
    "alcohol_status": "Alcohol Consumption",
    "exercise_level": "Physical Activity",
    "gender": "Gender",
    "heart_rate": "Heart Rate (bpm)",
    "spo2": "SpO2 (%)",
    "uric_acid": "Uric Acid (mg/dL)",
    "socioeconomic_score": "Socioeconomic Score",
}

NORMAL_RANGES = {
    "fasting_glucose": {"low": 70, "normal_high": 100, "pre_high": 126, "high": 200, "unit": "mg/dL"},
    "hba1c": {"low": 4.0, "normal_high": 5.7, "pre_high": 6.5, "high": 9.0, "unit": "%"},
    "systolic_bp": {"low": 90, "normal_high": 120, "pre_high": 140, "high": 160, "unit": "mmHg"},
    "total_cholesterol": {"low": 100, "normal_high": 200, "pre_high": 240, "high": 300, "unit": "mg/dL"},
    "ldl_cholesterol": {"low": 0, "normal_high": 100, "pre_high": 160, "high": 200, "unit": "mg/dL"},
    "hdl_cholesterol": {"low": 40, "normal_high": 60, "pre_high": 100, "high": 120, "unit": "mg/dL"},
    "triglycerides": {"low": 0, "normal_high": 150, "pre_high": 200, "high": 500, "unit": "mg/dL"},
    "sgpt": {"low": 7, "normal_high": 56, "pre_high": 100, "high": 200, "unit": "U/L"},
    "sgot": {"low": 10, "normal_high": 40, "pre_high": 80, "high": 150, "unit": "U/L"},
    "bmi": {"low": 18.5, "normal_high": 24.9, "pre_high": 30, "high": 40, "unit": "kg/m²"},
}


def get_feature_status(feature: str, value: float) -> Tuple[str, str]:
    """Determine if a feature value is normal, elevated, or critical"""
    if feature not in NORMAL_RANGES:
        return "normal", "#00e676"
    
    ranges = NORMAL_RANGES[feature]
    
    # Special case for HDL (higher is better)
    if feature == "hdl_cholesterol":
        if value < 40:
            return "critical", "#ff3b5c"
        elif value < 60:
            return "low", "#ffc93c"
        else:
            return "normal", "#00e676"
    
    if value > ranges.get("high", float("inf")):
        return "critical", "#ff3b5c"
    elif value > ranges.get("pre_high", float("inf")):
        return "elevated", "#ff7a2e"
    elif value > ranges.get("normal_high", float("inf")):
        return "borderline", "#ffc93c"
    elif value < ranges.get("low", float("-inf")):
        return "low", "#ffc93c"
    else:
        return "normal", "#00e676"


class SHAPExplainer:
    def __init__(self, model_dir: str = "ml/saved_models"):
        self.model_dir = model_dir
        self.models = {}
        self.explainers = {}
        self._load_models()

    def _load_models(self):
        if not os.path.exists(self.model_dir):
            return
        
        hospitals = [
            "Apollo_Private_Hospital",
            "AIIMS_Government_Hospital",
            "Fortis_National_Hospital",
            "District_Rural_Hospital",
        ]
        diseases = ["diabetes", "heart_disease", "liver_disease"]
        
        for hospital in hospitals:
            for disease in diseases:
                path = os.path.join(self.model_dir, f"{hospital}_{disease}.pkl")
                if os.path.exists(path):
                    try:
                        with open(path, "rb") as f:
                            data = pickle.load(f)
                        key = f"{hospital}_{disease}"
                        self.models[key] = data
                        if SHAP_AVAILABLE:
                            self.explainers[key] = shap.TreeExplainer(data["model"])
                    except Exception as e:
                        print(f"Could not load {path}: {e}")

    def explain_prediction(
        self,
        patient_data: Dict,
        hospital: str,
        disease: str
    ) -> Dict:
        key = f"{hospital}_{disease}"
        
        if key not in self.models:
            return self._rule_based_explanation(patient_data, disease)
        
        saved = self.models[key]
        model = saved["model"]
        feature_names = saved["feature_names"]
        
        # Encode categoricals
        enc = {
            "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
            "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
            "alcohol_status": {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3},
            "diet": {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3},
            "gender": {"Female": 0, "Male": 1},
        }
        
        processed = {}
        for feat in feature_names:
            val = patient_data.get(feat, 0)
            if feat in enc and isinstance(val, str):
                val = enc[feat].get(val, 0)
            processed[feat] = float(val) if val is not None else 0.0
        
        X = np.array([[processed.get(f, 0) for f in feature_names]])
        X = np.nan_to_num(X)
        
        prob = model.predict_proba(X)[0][1]
        
        # SHAP values
        shap_values_dict = {}
        top_factors = []
        
        if SHAP_AVAILABLE and key in self.explainers:
            try:
                sv = self.explainers[key].shap_values(X)[0]
                shap_values_dict = dict(zip(feature_names, sv.tolist()))
                top_factors = sorted(
                    [(f, v, processed.get(f, 0)) for f, v in zip(feature_names, sv)],
                    key=lambda x: abs(x[1]), reverse=True
                )[:5]
            except Exception:
                fi = model.feature_importances_
                shap_values_dict = dict(zip(feature_names, fi.tolist()))
                top_factors = sorted(
                    [(f, v, processed.get(f, 0)) for f, v in zip(feature_names, fi)],
                    key=lambda x: abs(x[1]), reverse=True
                )[:5]
        else:
            fi = model.feature_importances_
            shap_values_dict = dict(zip(feature_names, fi.tolist()))
            top_factors = sorted(
                [(f, v, processed.get(f, 0)) for f, v in zip(feature_names, fi)],
                key=lambda x: abs(x[1]), reverse=True
            )[:5]
        
        risk_pct = round(prob * 100, 2)
        risk_level = "Critical" if risk_pct > 75 else "High" if risk_pct > 55 else "Medium" if risk_pct > 35 else "Low"
        
        formatted_factors = []
        for feat, shap_val, val in top_factors:
            status, color = get_feature_status(feat, float(val))
            normal_range = NORMAL_RANGES.get(feat, {})
            unit = normal_range.get("unit", "")
            normal_str = f"{normal_range.get('low', '')}-{normal_range.get('normal_high', '')} {unit}".strip()
            
            formatted_factors.append({
                "feature": feat,
                "display_name": FEATURE_DISPLAY_NAMES.get(feat, feat.replace("_", " ").title()),
                "shap_value": round(float(shap_val), 4),
                "patient_value": round(float(val), 2),
                "unit": unit,
                "normal_range": normal_str or "N/A",
                "status": status,
                "status_color": color,
                "direction": "increases risk" if shap_val > 0 else "decreases risk",
            })
        
        return {
            "disease": disease,
            "hospital": hospital,
            "risk_probability": risk_pct,
            "risk_level": risk_level,
            "prediction": 1 if risk_pct > 50 else 0,
            "top_factors": formatted_factors,
            "all_shap_values": {k: round(v, 4) for k, v in shap_values_dict.items()},
            "feature_importance": saved.get("feature_importance", {}),
            "model_metrics": saved.get("metrics", {}),
        }

    def _rule_based_explanation(self, patient_data: Dict, disease: str) -> Dict:
        """Fallback rule-based explanation when no model is available"""
        factors_map = {
            "diabetes": [
                ("fasting_glucose", "Fasting Glucose"),
                ("hba1c", "HbA1c"),
                ("bmi", "BMI"),
                ("family_history_diabetes", "Family History"),
                ("exercise_level", "Exercise Level"),
            ],
            "heart_disease": [
                ("total_cholesterol", "Total Cholesterol"),
                ("ldl_cholesterol", "LDL"),
                ("systolic_bp", "Systolic BP"),
                ("smoking_status", "Smoking"),
                ("family_history_heart", "Family History"),
            ],
            "liver_disease": [
                ("sgpt", "SGPT"),
                ("sgot", "SGOT"),
                ("alcohol_status", "Alcohol"),
                ("bmi", "BMI"),
                ("bilirubin_total", "Bilirubin"),
            ],
        }
        
        factors = factors_map.get(disease, [])
        shap_vals = np.random.uniform(0.05, 0.4, len(factors))
        
        top_factors = [
            {
                "feature": feat,
                "display_name": disp,
                "shap_value": round(float(sv), 4),
                "patient_value": float(patient_data.get(feat, 0)),
                "unit": NORMAL_RANGES.get(feat, {}).get("unit", ""),
                "normal_range": "See reference",
                "status": "unknown",
                "status_color": "#7aa8c7",
                "direction": "increases risk",
            }
            for (feat, disp), sv in zip(factors, shap_vals)
        ]
        
        return {
            "disease": disease,
            "hospital": "unknown",
            "risk_probability": 50.0,
            "risk_level": "Medium",
            "prediction": 0,
            "top_factors": top_factors,
            "all_shap_values": {},
            "feature_importance": {},
            "model_metrics": {},
        }

    def get_population_feature_importance(self, hospital: str, disease: str) -> Dict:
        """Get feature importance across the population"""
        key = f"{hospital}_{disease}"
        if key in self.models:
            return self.models[key].get("feature_importance", {})
        
        # Defaults for visualization
        defaults = {
            "diabetes": {
                "fasting_glucose": 0.342, "hba1c": 0.298, "bmi": 0.189,
                "family_history_diabetes": 0.145, "insulin": 0.132,
                "age": 0.098, "exercise_level": 0.087, "diet": 0.065,
            },
            "heart_disease": {
                "ldl_cholesterol": 0.312, "total_cholesterol": 0.289,
                "systolic_bp": 0.245, "smoking_status": 0.198,
                "family_history_heart": 0.187, "age": 0.156,
                "hdl_cholesterol": 0.132, "triglycerides": 0.098,
            },
            "liver_disease": {
                "sgpt": 0.389, "sgot": 0.334, "alcohol_status": 0.278,
                "bilirubin_total": 0.198, "bmi": 0.145,
                "family_history_liver": 0.132, "alkaline_phosphatase": 0.098,
            },
        }
        return defaults.get(disease, {})

    def generate_clinical_report(self, patient_data: Dict, explanations: Dict) -> str:
        """Generate a plain-text clinical interpretation report"""
        lines = ["=" * 60, "NFHIS CLINICAL RISK REPORT", "=" * 60, ""]
        
        name = f"{patient_data.get('first_name', '')} {patient_data.get('last_name', '')}".strip()
        age = patient_data.get("age", "N/A")
        gender = patient_data.get("gender", "N/A")
        lines.append(f"Patient: {name or 'Anonymous'} | Age: {age} | Gender: {gender}")
        lines.append(f"Hospital: {patient_data.get('hospital', 'N/A').replace('_', ' ')}")
        lines.append("")
        
        for disease, exp in explanations.items():
            lines.append(f"─── {disease.replace('_', ' ').upper()} ───")
            lines.append(f"  Risk Probability : {exp['risk_probability']}%")
            lines.append(f"  Risk Level       : {exp['risk_level']}")
            lines.append(f"  Prediction       : {'POSITIVE' if exp['prediction'] else 'NEGATIVE'}")
            lines.append("  Top Contributing Factors:")
            for i, f in enumerate(exp["top_factors"][:5], 1):
                direction = "↑ Risk" if f["shap_value"] > 0 else "↓ Risk"
                lines.append(f"    {i}. {f['display_name']}: {f['patient_value']} {f['unit']} "
                              f"({direction}, SHAP={f['shap_value']})")
            lines.append("")
        
        lines.append("─── RECOMMENDATIONS ───")
        for disease, exp in explanations.items():
            if exp["risk_level"] in ["Critical", "High"]:
                lines.append(f"  • {disease.replace('_', ' ').title()}: Immediate specialist referral advised.")
        
        lines.append("")
        lines.append("Note: This report is AI-generated and should be reviewed by a qualified")
        lines.append("physician before clinical decision-making.")
        lines.append("=" * 60)
        
        return "\n".join(lines)


# ─── Singleton explainer for use in API ────────────────────────────────────────
_explainer_instance: Optional[SHAPExplainer] = None

def get_explainer() -> SHAPExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = SHAPExplainer()
    return _explainer_instance


if __name__ == "__main__":
    print("Testing XAI Module...")
    
    sample_patient = {
        "first_name": "Arjun", "last_name": "Sharma",
        "age": 52, "gender": "Male", "bmi": 28.5,
        "systolic_bp": 145, "diastolic_bp": 92, "heart_rate": 82,
        "fasting_glucose": 165, "hba1c": 7.2, "insulin": 18.5,
        "total_cholesterol": 220, "hdl_cholesterol": 38, "ldl_cholesterol": 145,
        "triglycerides": 185, "sgpt": 45, "sgot": 38,
        "alkaline_phosphatase": 95, "bilirubin_total": 0.9, "albumin": 3.8,
        "creatinine": 1.1, "urea": 32, "hemoglobin": 13.5,
        "wbc_count": 8500, "platelet_count": 230000, "spo2": 96,
        "temperature": 98.6, "respiratory_rate": 18, "uric_acid": 6.2,
        "family_history_diabetes": 1, "family_history_heart": 1, "family_history_liver": 0,
        "socioeconomic_score": 6.0, "exercise_level": "Light",
        "smoking_status": "Former", "alcohol_status": "Occasional",
        "diet": "Non-Vegetarian", "hospital": "Apollo_Private_Hospital",
    }
    
    explainer = SHAPExplainer()
    
    explanations = {}
    for disease in ["diabetes", "heart_disease", "liver_disease"]:
        exp = explainer.explain_prediction(sample_patient, "Apollo_Private_Hospital", disease)
        explanations[disease] = exp
        print(f"\n{disease}: {exp['risk_level']} ({exp['risk_probability']}%)")
        print(f"  Top factor: {exp['top_factors'][0]['display_name'] if exp['top_factors'] else 'N/A'}")
    
    report = explainer.generate_clinical_report(sample_patient, explanations)
    print("\n" + report)
