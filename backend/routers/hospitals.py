"""NFHIS Hospitals Router"""
from fastapi import APIRouter
from typing import List, Dict
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

router = APIRouter()

HOSPITALS_DATA = {
    "Apollo_Private_Hospital": {
        "id": "Apollo_Private_Hospital", "name": "Apollo Private Hospital",
        "type": "Private", "tier": "Tertiary", "state": "Telangana", "city": "Hyderabad",
        "established": 1983, "beds": 500, "doctors": 45, "nurses": 120,
        "trust_score": 0.92, "fl_participation": 15, "total_patients": 800,
        "specialties": ["Cardiology", "Endocrinology", "Hepatology", "Oncology"],
        "lat": 17.4065, "lng": 78.4772,
        "contact": "+91-40-2360-7777"
    },
    "AIIMS_Government_Hospital": {
        "id": "AIIMS_Government_Hospital", "name": "AIIMS Government Hospital",
        "type": "Government", "tier": "National", "state": "Delhi", "city": "New Delhi",
        "established": 1956, "beds": 2000, "doctors": 200, "nurses": 500,
        "trust_score": 0.88, "fl_participation": 14, "total_patients": 1200,
        "specialties": ["All specialties", "Research", "Teaching"],
        "lat": 28.5672, "lng": 77.2100,
        "contact": "+91-11-2658-8500"
    },
    "Fortis_National_Hospital": {
        "id": "Fortis_National_Hospital", "name": "Fortis National Hospital",
        "type": "Private", "tier": "Tertiary", "state": "Punjab", "city": "Chandigarh",
        "established": 2001, "beds": 350, "doctors": 80, "nurses": 200,
        "trust_score": 0.85, "fl_participation": 13, "total_patients": 600,
        "specialties": ["Cardiology", "Neurology", "Orthopedics", "Oncology"],
        "lat": 30.7333, "lng": 76.7794,
        "contact": "+91-172-4921-000"
    },
    "District_Rural_Hospital": {
        "id": "District_Rural_Hospital", "name": "District Rural Hospital",
        "type": "Government", "tier": "Primary", "state": "Bihar", "city": "Patna",
        "established": 1975, "beds": 100, "doctors": 12, "nurses": 35,
        "trust_score": 0.75, "fl_participation": 11, "total_patients": 1000,
        "specialties": ["General Medicine", "Obstetrics", "Pediatrics"],
        "lat": 25.5941, "lng": 85.1376,
        "contact": "+91-612-222-1234"
    }
}

@router.get("/")
async def list_hospitals():
    return {"hospitals": list(HOSPITALS_DATA.values()), "count": len(HOSPITALS_DATA)}

@router.get("/{hospital_id}")
async def get_hospital(hospital_id: str):
    h = HOSPITALS_DATA.get(hospital_id)
    if not h:
        from fastapi import HTTPException
        raise HTTPException(404, "Hospital not found")
    return h

@router.get("/{hospital_id}/trust-score")
async def get_trust_score(hospital_id: str):
    h = HOSPITALS_DATA.get(hospital_id)
    if not h:
        from fastapi import HTTPException
        raise HTTPException(404, "Hospital not found")
    return {
        "hospital_id": hospital_id,
        "trust_score": h["trust_score"],
        "fl_participation": h["fl_participation"],
        "total_patients": h["total_patients"]
    }

@router.get("/comparison/all")
async def compare_hospitals():
    from backend.database.sqlite_db import get_connection
    conn = get_connection()
    perf = [dict(r) for r in conn.execute(
        "SELECT hospital, AVG(accuracy) as avg_accuracy, AVG(auc_roc) as avg_auc FROM model_performance GROUP BY hospital"
    ).fetchall()]
    conn.close()
    perf_map = {p["hospital"]: p for p in perf}
    
    comparison = []
    for h_id, h_data in HOSPITALS_DATA.items():
        p = perf_map.get(h_id, {})
        comparison.append({
            **h_data,
            "avg_model_accuracy": round(p.get("avg_accuracy", 0.82), 4),
            "avg_auc_roc": round(p.get("avg_auc", 0.88), 4),
        })
    return {"comparison": comparison}
