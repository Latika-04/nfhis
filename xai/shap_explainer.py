"""
NFHIS XAI — Explainable AI Module
SHAP-based feature importance and explanations for all disease models
"""

import numpy as np
import pandas as pd
import json
import os
import pickle
import warnings
warnings.filterwarnings("ignore")

try:
    import shap
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("Warning: SHAP not installed. Using fallback feature importance.")

FEATURE_DISPLAY_NAMES = {
    "fasting_glucose": "Fasting Glucose",
    "hba1c": "HbA1c (%)",
    "bmi": "Body Mass Index",
    "systolic_bp": "Systolic Blood Pressure",
    "diastolic_bp": "Diastolic Blood Pressure",
    "age": "Patient Age",
    "total_cholesterol": "Total Cholesterol",
    "ldl_cholesterol": "LDL Cholesterol",
    "hdl_cholesterol": "HDL Cholesterol",
    "triglycerides": "Triglycerides",
    "sgpt": "SGPT (ALT)",
    "sgot": "SGOT (AST)",
    "alkaline_phosphatase": "Alkaline Phosphatase",
    "bilirubin_total": "Total Bilirubin",
    "albumin": "Albumin",
    "insulin": "Insulin Level",
    "creatinine": "Creatinine",
    "urea": "Blood Urea",
    "hemoglobin": "Hemoglobin",
    "wbc_count": "WBC Count",
    "platelet_count": "Platelet Count",
    "spo2": "Oxygen Saturation",
    "family_history_diabetes": "Diabetes Family History",
    "family_history_heart": "Heart Disease Family Hx",
    "family_history_liver": "Liver Disease Family Hx",
    "smoking_status": "Smoking Status",
    "alcohol_status": "Alcohol Consumption",
    "exercise_level": "Exercise Frequency",
    "diet": "Diet Type",
    "gender": "Gender",
    "socioeconomic_score": "Socioeconomic Score",
    "uric_acid": "Uric Acid",
    "heart_rate": "Heart Rate",
    "respiratory_rate": "Respiratory Rate",
    "temperature": "Body Temperature",
}

NORMAL_RANGES = {
    "fasting_glucose": {"min": 70, "max": 100, "unit": "mg/dL", "critical_high": 200},
    "hba1c": {"min": 4.0, "max": 5.7, "unit": "%", "critical_high": 9.0},
    "bmi": {"min": 18.5, "max": 24.9, "unit": "kg/m²", "critical_high": 40},
    "systolic_bp": {"min": 90, "max": 120, "unit": "mmHg", "critical_high": 180},
    "total_cholesterol": {"min": 0, "max": 200, "unit": "mg/dL", "critical_high": 300},
    "ldl_cholesterol": {"min": 0, "max": 100, "unit": "mg/dL", "critical_high": 190},
    "hdl_cholesterol": {"min": 40, "max": 200, "unit": "mg/dL", "critical_high": None},
    "triglycerides": {"min": 0, "max": 150, "unit": "mg/dL", "critical_high": 500},
    "sgpt": {"min": 7, "max": 56, "unit": "U/L", "critical_high": 200},
    "sgot": {"min": 10, "max": 40, "unit": "U/L", "critical_high": 150},
    "bilirubin_total": {"min": 0.2, "max": 1.2, "unit": "mg/dL", "critical_high": 5.0},
    "albumin": {"min": 3.4, "max": 5.4, "unit": "g/dL", "critical_high": None},
    "insulin": {"min": 2.6, "max": 24.9, "unit": "uIU/mL", "critical_high": 100},
    "creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL", "critical_high": 5.0},
    "hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL", "critical_high": None},
}

CLINICAL_INTERPRETATIONS = {
    "diabetes": {
        "fasting_glucose": {
            "normal": "Fasting glucose is within normal range (70-100 mg/dL).",
            "elevated": "Pre-diabetic range (100-125 mg/dL). Lifestyle intervention recommended.",
            "high": "Diabetic range (≥126 mg/dL). Confirm with repeat testing.",
            "critical": "Critically high glucose. Immediate medical attention required.",
        },
        "hba1c": {
            "normal": "HbA1c is normal (below 5.7%). No diabetes risk.",
            "elevated": "Pre-diabetic HbA1c (5.7-6.4%). Monitor every 3-6 months.",
            "high": "Diabetic HbA1c (≥6.5%). Initiate treatment protocol.",
            "critical": "Poor glycemic control (≥9%). Intensive management required.",
        },
    },
    "heart_disease": {
        "total_cholesterol": {
            "normal": "Total cholesterol is desirable (below 200 mg/dL).",
            "elevated": "Borderline high cholesterol (200-239 mg/dL). Diet modification needed.",
            "high": "High cholesterol (≥240 mg/dL). Statin therapy may be indicated.",
            "critical": "Very high cholesterol. Immediate cardiology referral.",
        },
        "systolic_bp": {
            "normal": "Blood pressure is normal.",
            "elevated": "Elevated blood pressure (120-129 mmHg). Lifestyle changes advised.",
            "high": "Stage 1-2 hypertension. Medical therapy evaluation needed.",
            "critical": "Hypertensive crisis (≥180 mmHg). Emergency care required.",
        },
    },
    "liver_disease": {
        "sgpt": {
            "normal": "SGPT/ALT is within normal range.",
            "elevated": "Mildly elevated ALT. Evaluate for fatty liver or alcohol use.",
            "high": "Significantly elevated ALT. Hepatology referral recommended.",
            "critical": "Critically elevated ALT. Possible acute liver injury.",
        },
        "sgot": {
            "normal": "SGOT/AST is within normal range.",
            "elevated": "Mildly elevated AST. Monitor with repeat testing.",
            "high": "Significantly elevated AST. Liver disease likely.",
            "critical": "Critically elevated AST. Urgent hepatology evaluation.",
        },
    },
}


class SHAPExplainer:
    def __init__(self, model_dir: str = "ml/saved_models"):
        self.model_dir = model_dir
        self.loaded_models = {}
        self.explainers = {}

    def load_model(self, hospital: str, disease: str):
        key = f"{hospital}_{disease}"
        if key in self.loaded_models:
            return self.loaded_models[key]

        path = os.path.join(self.model_dir, f"{key}.pkl")
        if not os.path.exists(path):
            return None

        with open(path, "rb") as f:
            saved = pickle.load(f)
        self.loaded_models[key] = saved
        return saved

    def explain_prediction(
        self, patient_data: dict, hospital: str, disease: str
    ) -> dict:
        """Generate SHAP explanation for a single patient prediction."""
        saved = self.load_model(hospital, disease)
        if saved is None:
            return self._rule_based_explanation(patient_data, disease)

        model = saved["model"]
        feature_names = saved["feature_names"]

        _enc_maps = {
            "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
            "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
            "alcohol_status": {"Never": 0, "Occasional": 1, "Regular": 2, "Heavy": 3},
            "diet": {"Vegan": 0, "Vegetarian": 1, "Eggetarian": 2, "Non-Vegetarian": 3},
            "gender": {"Female": 0, "Male": 1},
        }
        def _enc(k, v):
            if k in _enc_maps and isinstance(v, str):
                return float(_enc_maps[k].get(v, 0))
            try:
                return float(v)
            except (TypeError, ValueError):
                return 0.0
        X = np.array([[_enc(f, patient_data.get(f, 0)) for f in feature_names]])
        X = np.nan_to_num(X)

        if SHAP_AVAILABLE:
            try:
                if disease not in self.explainers:
                    self.explainers[disease] = shap.TreeExplainer(model)
                explainer = self.explainers[disease]
                shap_values = explainer.shap_values(X)[0]
                base_value = float(explainer.expected_value)
            except Exception:
                shap_values = model.feature_importances_
                base_value = 0.5
        else:
            shap_values = model.feature_importances_
            base_value = 0.5

        prob = model.predict_proba(X)[0][1]

        feature_contributions = []
        for fname, fval, sval in zip(feature_names, X[0], shap_values):
            nr = NORMAL_RANGES.get(fname, {})
            is_abnormal = False
            if nr.get("max") and float(fval) > nr["max"]:
                is_abnormal = True
            elif nr.get("min") and float(fval) < nr["min"]:
                is_abnormal = True

            feature_contributions.append({
                "feature": fname,
                "display_name": FEATURE_DISPLAY_NAMES.get(fname, fname.replace("_", " ").title()),
                "value": round(float(fval), 3),
                "shap_value": round(float(sval), 4),
                "direction": "increases_risk" if sval > 0 else "decreases_risk",
                "magnitude": "high" if abs(sval) > 0.1 else "medium" if abs(sval) > 0.05 else "low",
                "normal_range": f"{nr.get('min', '?')}–{nr.get('max', '?')} {nr.get('unit', '')}" if nr else "N/A",
                "is_abnormal": is_abnormal,
                "unit": nr.get("unit", ""),
            })

        feature_contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        top_risk_factors = [f for f in feature_contributions if f["direction"] == "increases_risk"][:5]
        top_protective = [f for f in feature_contributions if f["direction"] == "decreases_risk"][:3]

        return {
            "disease": disease,
            "hospital": hospital,
            "risk_probability": round(float(prob) * 100, 2),
            "prediction": int(prob > 0.5),
            "risk_level": "Critical" if prob > 0.75 else "High" if prob > 0.55 else "Medium" if prob > 0.35 else "Low",
            "base_value": round(base_value, 4),
            "all_contributions": feature_contributions[:15],
            "top_risk_factors": top_risk_factors,
            "top_protective_factors": top_protective,
            "feature_importance_dict": {
                fc["feature"]: abs(fc["shap_value"])
                for fc in feature_contributions[:10]
            },
            "clinical_summary": self._generate_clinical_summary(patient_data, disease, feature_contributions, prob),
        }

    def _generate_clinical_summary(
        self, patient_data: dict, disease: str, contributions: list, prob: float
    ) -> str:
        top_3 = [c["display_name"] for c in contributions[:3] if c["direction"] == "increases_risk"]
        risk_pct = round(prob * 100, 1)

        summaries = {
            "diabetes": f"Diabetes risk is {risk_pct}%. Primary contributors: {', '.join(top_3[:3] or ['elevated glucose levels'])}.",
            "heart_disease": f"Cardiac risk is {risk_pct}%. Key factors: {', '.join(top_3[:3] or ['lipid abnormalities'])}.",
            "liver_disease": f"Liver disease risk is {risk_pct}%. Contributing factors: {', '.join(top_3[:3] or ['elevated enzymes'])}.",
        }
        return summaries.get(disease, f"Risk probability: {risk_pct}%.")

    def _rule_based_explanation(self, patient_data: dict, disease: str) -> dict:
        feature_map = {
            "diabetes": [
                ("fasting_glucose", 0.34), ("hba1c", 0.28), ("bmi", 0.18),
                ("family_history_diabetes", 0.14), ("insulin", 0.13), ("age", 0.10),
                ("exercise_level", -0.08), ("diet", -0.06),
            ],
            "heart_disease": [
                ("ldl_cholesterol", 0.31), ("total_cholesterol", 0.27), ("systolic_bp", 0.24),
                ("smoking_status", 0.19), ("family_history_heart", 0.18), ("age", 0.15),
                ("hdl_cholesterol", -0.13), ("triglycerides", 0.10),
            ],
            "liver_disease": [
                ("sgpt", 0.38), ("sgot", 0.33), ("alcohol_status", 0.27),
                ("bilirubin_total", 0.19), ("bmi", 0.14), ("family_history_liver", 0.13),
                ("alkaline_phosphatase", 0.09), ("albumin", -0.07),
            ],
        }

        contributions = []
        for fname, base_shap in feature_map.get(disease, []):
            fval = patient_data.get(fname, 0)
            nr = NORMAL_RANGES.get(fname, {})
            contributions.append({
                "feature": fname,
                "display_name": FEATURE_DISPLAY_NAMES.get(fname, fname.replace("_", " ").title()),
                "value": round(float(fval), 3),
                "shap_value": round(float(base_shap), 4),
                "direction": "increases_risk" if base_shap > 0 else "decreases_risk",
                "magnitude": "high" if abs(base_shap) > 0.2 else "medium",
                "normal_range": f"{nr.get('min', '?')}–{nr.get('max', '?')} {nr.get('unit', '')}" if nr else "N/A",
                "is_abnormal": False,
                "unit": nr.get("unit", ""),
            })

        return {
            "disease": disease,
            "risk_probability": 50.0,
            "prediction": 0,
            "risk_level": "Medium",
            "all_contributions": contributions,
            "top_risk_factors": [c for c in contributions if c["direction"] == "increases_risk"][:5],
            "top_protective_factors": [c for c in contributions if c["direction"] == "decreases_risk"][:3],
            "feature_importance_dict": {c["feature"]: abs(c["shap_value"]) for c in contributions},
            "clinical_summary": f"Rule-based explanation for {disease}. ML models not loaded.",
        }

    def batch_explain(self, patients_df: pd.DataFrame, hospital: str, disease: str) -> list:
        results = []
        for _, row in patients_df.iterrows():
            try:
                result = self.explain_prediction(row.to_dict(), hospital, disease)
                results.append(result)
            except Exception as e:
                results.append({"error": str(e)})
        return results

    def global_feature_importance(self, hospital: str, disease: str) -> dict:
        saved = self.load_model(hospital, disease)
        if saved is None:
            return {}
        model = saved["model"]
        feature_names = saved["feature_names"]
        importances = model.feature_importances_
        fi = dict(zip(feature_names, importances.tolist()))
        return dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])

    def generate_report(self, patient_data: dict, hospital: str) -> dict:
        report = {
            "patient": {
                "name": f"{patient_data.get('first_name', 'Unknown')} {patient_data.get('last_name', '')}",
                "age": patient_data.get("age"),
                "gender": patient_data.get("gender"),
                "hospital": hospital,
            },
            "diseases": {},
            "overall_risk": "Low",
            "critical_flags": [],
        }

        max_risk = 0
        for disease in ["diabetes", "heart_disease", "liver_disease"]:
            exp = self.explain_prediction(patient_data, hospital, disease)
            report["diseases"][disease] = exp
            if exp["risk_probability"] > max_risk:
                max_risk = exp["risk_probability"]
            if exp["risk_probability"] > 75:
                report["critical_flags"].append(f"Critical {disease.replace('_', ' ')} risk: {exp['risk_probability']}%")

        report["overall_risk"] = (
            "Critical" if max_risk > 75 else
            "High" if max_risk > 55 else
            "Medium" if max_risk > 35 else "Low"
        )
        report["max_risk_percentage"] = round(max_risk, 2)
        return report


_explainer_instance = None


def get_explainer() -> SHAPExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = SHAPExplainer()
    return _explainer_instance


if __name__ == "__main__":
    explainer = SHAPExplainer()

    sample = {
        "age": 52, "bmi": 28.5, "gender": 1,
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
        "exercise_level": 1, "smoking_status": 1,
        "alcohol_status": 1, "diet": 3,
    }

    print("NFHIS XAI — SHAP Explainability Module")
    print("=" * 60)
    report = explainer.generate_report(sample, "Apollo_Private_Hospital")
    print(f"Patient: {report['patient']['name']}")
    print(f"Overall Risk: {report['overall_risk']} ({report['max_risk_percentage']}%)")

    for disease, data in report["diseases"].items():
        print(f"\n{disease.upper()}: {data['risk_probability']}% ({data['risk_level']})")
        print(f"  Top factors: {[f['display_name'] for f in data['top_risk_factors'][:3]]}")
        print(f"  Summary: {data['clinical_summary']}")

    if report["critical_flags"]:
        print("\n⚠️  CRITICAL FLAGS:")
        for flag in report["critical_flags"]:
            print(f"  • {flag}")
