"""NFHIS Doctors Router"""
from fastapi import APIRouter
from typing import Optional
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

router = APIRouter()

DOCTORS = [
    {
        "doctor_id": "DOC001", "name": "Dr. Priya Nair", "specialization": "Endocrinology",
        "hospital_id": "Apollo_Private_Hospital", "hospital_name": "Apollo Private Hospital",
        "experience_years": 12, "patients_handled": 342, "avg_response_time_hours": 1.8,
        "alerts_acknowledged": 28, "alerts_ignored": 2, "negligence_count": 1,
        "performance_score": 87.5, "status": "active",
        "email": "priya.nair@apollo.com", "phone": "+91-9876543210"
    },
    {
        "doctor_id": "DOC002", "name": "Dr. Karthik Reddy", "specialization": "Cardiology",
        "hospital_id": "AIIMS_Government_Hospital", "hospital_name": "AIIMS Government Hospital",
        "experience_years": 18, "patients_handled": 589, "avg_response_time_hours": 1.2,
        "alerts_acknowledged": 45, "alerts_ignored": 0, "negligence_count": 0,
        "performance_score": 96.2, "status": "active",
        "email": "karthik.reddy@aiims.edu", "phone": "+91-9876543211"
    },
    {
        "doctor_id": "DOC003", "name": "Dr. Sunita Gupta", "specialization": "Hepatology",
        "hospital_id": "Fortis_National_Hospital", "hospital_name": "Fortis National Hospital",
        "experience_years": 9, "patients_handled": 215, "avg_response_time_hours": 2.1,
        "alerts_acknowledged": 19, "alerts_ignored": 1, "negligence_count": 0,
        "performance_score": 91.8, "status": "active",
        "email": "sunita.gupta@fortis.com", "phone": "+91-9876543212"
    },
    {
        "doctor_id": "DOC004", "name": "Dr. Mohammed Hussain", "specialization": "General Medicine",
        "hospital_id": "District_Rural_Hospital", "hospital_name": "District Rural Hospital",
        "experience_years": 6, "patients_handled": 478, "avg_response_time_hours": 3.5,
        "alerts_acknowledged": 32, "alerts_ignored": 3, "negligence_count": 0,
        "performance_score": 78.4, "status": "active",
        "email": "mohammed.h@district.gov.in", "phone": "+91-9876543213"
    }
]

@router.get("/")
async def list_doctors(hospital_id: Optional[str] = None):
    docs = DOCTORS if not hospital_id else [d for d in DOCTORS if d["hospital_id"] == hospital_id]
    return {"doctors": docs, "count": len(docs)}

@router.get("/{doctor_id}")
async def get_doctor(doctor_id: str):
    for d in DOCTORS:
        if d["doctor_id"] == doctor_id:
            return d
    from fastapi import HTTPException
    raise HTTPException(404, "Doctor not found")

@router.get("/{doctor_id}/performance")
async def doctor_performance(doctor_id: str):
    for d in DOCTORS:
        if d["doctor_id"] == doctor_id:
            return {
                "doctor": d,
                "monthly_stats": [
                    {"month": m, "patients": 25 + (i*2), "alerts_handled": 8 + i, "avg_response": round(d["avg_response_time_hours"] + (i * 0.05), 1)}
                    for i, m in enumerate(["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"])
                ]
            }
    from fastapi import HTTPException
    raise HTTPException(404, "Doctor not found")
