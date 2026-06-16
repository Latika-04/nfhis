"""
NFHIS Patients Router
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from backend.database.sqlite_db import query_patients, get_patient_by_id, get_analytics_summary

router = APIRouter()

@router.get("/")
async def list_patients(
    hospital: Optional[str] = None,
    min_glucose: Optional[float] = Query(None),
    disease: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0)
):
    patients = query_patients(hospital=hospital, min_glucose=min_glucose, disease=disease, limit=limit, offset=offset)
    return {"patients": patients, "count": len(patients), "offset": offset}

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/query/high-glucose")
async def high_glucose_patients(threshold: float = 140.0):
    """SELECT * FROM patients WHERE glucose > threshold"""
    patients = query_patients(min_glucose=threshold, limit=50)
    return {"query": f"fasting_glucose > {threshold}", "results": patients, "count": len(patients)}

@router.get("/stats/summary")
async def patient_stats():
    return get_analytics_summary()
