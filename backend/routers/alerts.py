"""NFHIS Alerts & Medical Negligence Detection Router"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

router = APIRouter()

# In-memory store for demo (MongoDB in production)
_alerts_store = [
    {
        "alert_id": "ALT001", "patient_id": "PAT000001", "patient_name": "Arjun Sharma",
        "doctor_id": "DOC001", "doctor_name": "Dr. Priya Nair",
        "hospital_id": "Apollo_Private_Hospital",
        "alert_type": "critical_glucose", "severity": "critical",
        "message": "Fasting glucose critically high: 165 mg/dL. Diabetes risk: 78.5%",
        "vitals": {"fasting_glucose": 165, "hba1c": 7.2, "systolic_bp": 145},
        "risk_scores": {"diabetes": 78.5, "heart_disease": 62.1},
        "status": "acknowledged", "resolved": False,
        "acknowledged_at": datetime.now().isoformat(),
        "negligence": False, "hours_ignored": 0,
        "created_at": datetime.now().isoformat()
    },
    {
        "alert_id": "ALT002", "patient_id": "PAT000003", "patient_name": "Rajesh Kumar",
        "doctor_id": "DOC002", "doctor_name": "Dr. Karthik Reddy",
        "hospital_id": "AIIMS_Government_Hospital",
        "alert_type": "cardiac_risk", "severity": "critical",
        "message": "Critical cardiac risk: Cholesterol 265mg/dL, BP 162/105. Heart risk: 91.5%",
        "vitals": {"total_cholesterol": 265, "systolic_bp": 162, "ldl_cholesterol": 178},
        "risk_scores": {"heart_disease": 91.5, "diabetes": 88.2},
        "status": "pending", "resolved": False,
        "acknowledged_at": None, "negligence": False, "hours_ignored": 2,
        "created_at": datetime.now().isoformat()
    },
    {
        "alert_id": "ALT003", "patient_id": "PAT000005", "patient_name": "Mohammed Khan",
        "doctor_id": "DOC003", "doctor_name": "Dr. Sunita Gupta",
        "hospital_id": "Fortis_National_Hospital",
        "alert_type": "liver_enzymes", "severity": "high",
        "message": "Liver enzymes critically elevated: SGPT=145, SGOT=112. Liver risk: 79.4%",
        "vitals": {"sgpt": 145, "sgot": 112, "bilirubin_total": 2.8},
        "risk_scores": {"liver_disease": 79.4},
        "status": "pending", "resolved": False,
        "acknowledged_at": None, "negligence": False, "hours_ignored": 1,
        "created_at": datetime.now().isoformat()
    },
    {
        "alert_id": "ALT004", "patient_id": "PAT000008", "patient_name": "Lakshmi Nair",
        "doctor_id": "DOC001", "doctor_name": "Dr. Priya Nair",
        "hospital_id": "Apollo_Private_Hospital",
        "alert_type": "negligence_flag", "severity": "critical",
        "message": "⚠️ NEGLIGENCE: Critical BP alert ignored for 7+ hours. Patient condition worsened.",
        "vitals": {"systolic_bp": 148, "heart_rate": 80, "fasting_glucose": 175},
        "risk_scores": {"diabetes": 82.1, "heart_disease": 75.6},
        "status": "escalated", "resolved": False,
        "acknowledged_at": None, "negligence": True, "hours_ignored": 7,
        "created_at": datetime.now().isoformat()
    },
    {
        "alert_id": "ALT005", "patient_id": "PAT000006", "patient_name": "Rekha Singh",
        "doctor_id": "DOC002", "doctor_name": "Dr. Karthik Reddy",
        "hospital_id": "AIIMS_Government_Hospital",
        "alert_type": "diabetes_onset", "severity": "high",
        "message": "Pre-diabetes detected: Glucose 132, HbA1c 6.4%. Intervention recommended.",
        "vitals": {"fasting_glucose": 132, "hba1c": 6.4, "bmi": 27.4},
        "risk_scores": {"diabetes": 55.8},
        "status": "acknowledged", "resolved": True,
        "acknowledged_at": datetime.now().isoformat(),
        "negligence": False, "hours_ignored": 0,
        "created_at": datetime.now().isoformat()
    }
]

_doctor_logs = [
    {
        "log_id": "LOG001", "doctor_id": "DOC001", "doctor_name": "Dr. Priya Nair",
        "hospital_id": "Apollo_Private_Hospital", "action": "reviewed_alert",
        "patient_id": "PAT000001", "details": "Reviewed critical glucose. Ordered insulin + dietary consult.",
        "alert_id": "ALT001", "response_time_hours": 0.5, "negligence_flag": False,
        "timestamp": datetime.now().isoformat()
    },
    {
        "log_id": "LOG002", "doctor_id": "DOC001", "doctor_name": "Dr. Priya Nair",
        "hospital_id": "Apollo_Private_Hospital", "action": "ignored_alert",
        "patient_id": "PAT000008", "details": "CRITICAL: Alert for PAT000008 NOT acknowledged within 4-hour SLA.",
        "alert_id": "ALT004", "response_time_hours": 7, "negligence_flag": True,
        "timestamp": datetime.now().isoformat()
    },
    {
        "log_id": "LOG003", "doctor_id": "DOC002", "doctor_name": "Dr. Karthik Reddy",
        "hospital_id": "AIIMS_Government_Hospital", "action": "prescribed_medication",
        "patient_id": "PAT000003", "details": "Prescribed Atorvastatin 40mg for hypercholesterolemia. ECG ordered.",
        "response_time_hours": 1.2, "negligence_flag": False,
        "timestamp": datetime.now().isoformat()
    },
    {
        "log_id": "LOG004", "doctor_id": "DOC003", "doctor_name": "Dr. Sunita Gupta",
        "hospital_id": "Fortis_National_Hospital", "action": "ordered_tests",
        "patient_id": "PAT000005", "details": "Ordered liver biopsy and ultrasound for elevated enzymes.",
        "response_time_hours": 0.8, "negligence_flag": False,
        "timestamp": datetime.now().isoformat()
    }
]


class AlertCreate(BaseModel):
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    hospital_id: str
    alert_type: str
    severity: str
    message: str
    vitals: dict
    risk_scores: dict


class AlertAcknowledge(BaseModel):
    alert_id: str
    doctor_id: str
    action: str
    notes: Optional[str] = ""


@router.get("/")
async def list_alerts(
    hospital_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    include_negligence: bool = True
):
    alerts = _alerts_store.copy()
    if hospital_id:
        alerts = [a for a in alerts if a["hospital_id"] == hospital_id]
    if status:
        alerts = [a for a in alerts if a["status"] == status]
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if not include_negligence:
        alerts = [a for a in alerts if not a.get("negligence", False)]
    return {"alerts": alerts, "count": len(alerts)}


@router.post("/")
async def create_alert(alert: AlertCreate, background_tasks: BackgroundTasks):
    import random, string
    alert_id = "ALT" + "".join(random.choices(string.digits, k=6))
    new_alert = {
        **alert.dict(),
        "alert_id": alert_id,
        "status": "pending",
        "resolved": False,
        "acknowledged_at": None,
        "negligence": False,
        "hours_ignored": 0,
        "created_at": datetime.now().isoformat()
    }
    _alerts_store.append(new_alert)
    background_tasks.add_task(_check_negligence, alert_id)
    return new_alert


@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, ack: AlertAcknowledge):
    for alert in _alerts_store:
        if alert["alert_id"] == alert_id:
            alert["status"] = "acknowledged"
            alert["acknowledged_at"] = datetime.now().isoformat()
            
            log = {
                "log_id": f"LOG{len(_doctor_logs)+1:03d}",
                "doctor_id": ack.doctor_id,
                "action": "acknowledged_alert",
                "patient_id": alert["patient_id"],
                "alert_id": alert_id,
                "details": ack.notes or "Alert acknowledged",
                "negligence_flag": False,
                "timestamp": datetime.now().isoformat()
            }
            _doctor_logs.append(log)
            return {"success": True, "alert": alert}
    raise HTTPException(404, "Alert not found")


@router.get("/negligence/reports")
async def get_negligence_reports():
    negligence_alerts = [a for a in _alerts_store if a.get("negligence", False)]
    neg_logs = [l for l in _doctor_logs if l.get("negligence_flag", False)]
    
    doctor_neg_count = {}
    for log in neg_logs:
        doc = log.get("doctor_id", "unknown")
        doctor_neg_count[doc] = doctor_neg_count.get(doc, 0) + 1
    
    return {
        "negligence_alerts": negligence_alerts,
        "negligence_logs": neg_logs,
        "doctor_negligence_summary": [
            {"doctor_id": k, "negligence_count": v} for k, v in doctor_neg_count.items()
        ],
        "total_negligence_incidents": len(negligence_alerts)
    }


@router.get("/doctor-logs/all")
async def get_doctor_logs(doctor_id: Optional[str] = None, hospital_id: Optional[str] = None):
    logs = _doctor_logs.copy()
    if doctor_id:
        logs = [l for l in logs if l.get("doctor_id") == doctor_id]
    if hospital_id:
        logs = [l for l in logs if l.get("hospital_id") == hospital_id]
    return {"logs": logs, "count": len(logs)}


async def _check_negligence(alert_id: str):
    """Background task: flag negligence if alert not acknowledged within SLA"""
    import asyncio
    await asyncio.sleep(2)
    for alert in _alerts_store:
        if alert["alert_id"] == alert_id and alert["status"] == "pending":
            if alert["severity"] == "critical":
                alert["negligence"] = True
                alert["status"] = "escalated"
                log = {
                    "log_id": f"LOG{len(_doctor_logs)+1:03d}",
                    "doctor_id": alert["doctor_id"],
                    "action": "negligence_detected",
                    "patient_id": alert["patient_id"],
                    "alert_id": alert_id,
                    "details": f"Critical alert ignored beyond SLA threshold",
                    "negligence_flag": True,
                    "timestamp": datetime.now().isoformat()
                }
                _doctor_logs.append(log)
