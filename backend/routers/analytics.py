"""NFHIS Analytics Router"""
from fastapi import APIRouter
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

router = APIRouter()

@router.get("/summary")
async def analytics_summary():
    from backend.database.sqlite_db import get_analytics_summary
    return get_analytics_summary()

@router.get("/disease-trends")
async def disease_trends():
    return {
        "monthly_trends": [
            {"month": "Jan 2024", "diabetes": 142, "heart_disease": 98, "liver_disease": 67},
            {"month": "Feb 2024", "diabetes": 156, "heart_disease": 112, "liver_disease": 72},
            {"month": "Mar 2024", "diabetes": 168, "heart_disease": 125, "liver_disease": 81},
            {"month": "Apr 2024", "diabetes": 155, "heart_disease": 108, "liver_disease": 75},
            {"month": "May 2024", "diabetes": 178, "heart_disease": 132, "liver_disease": 88},
            {"month": "Jun 2024", "diabetes": 192, "heart_disease": 145, "liver_disease": 95},
            {"month": "Jul 2024", "diabetes": 185, "heart_disease": 138, "liver_disease": 91},
            {"month": "Aug 2024", "diabetes": 201, "heart_disease": 152, "liver_disease": 102},
            {"month": "Sep 2024", "diabetes": 195, "heart_disease": 148, "liver_disease": 98},
            {"month": "Oct 2024", "diabetes": 210, "heart_disease": 165, "liver_disease": 108},
            {"month": "Nov 2024", "diabetes": 205, "heart_disease": 158, "liver_disease": 105},
            {"month": "Dec 2024", "diabetes": 218, "heart_disease": 172, "liver_disease": 115},
        ]
    }

@router.get("/state-heatmap")
async def state_heatmap():
    return {
        "states": [
            {"state": "Uttar Pradesh", "diabetes": 245, "heart": 189, "liver": 98, "total": 1250},
            {"state": "Maharashtra", "diabetes": 198, "heart": 165, "liver": 87, "total": 980},
            {"state": "Bihar", "diabetes": 215, "heart": 142, "liver": 112, "total": 1100},
            {"state": "West Bengal", "diabetes": 178, "heart": 134, "liver": 76, "total": 890},
            {"state": "Telangana", "diabetes": 165, "heart": 128, "liver": 68, "total": 820},
            {"state": "Tamil Nadu", "diabetes": 145, "heart": 118, "liver": 59, "total": 720},
            {"state": "Karnataka", "diabetes": 132, "heart": 108, "liver": 55, "total": 680},
            {"state": "Gujarat", "diabetes": 152, "heart": 122, "liver": 62, "total": 760},
            {"state": "Rajasthan", "diabetes": 189, "heart": 148, "liver": 82, "total": 940},
            {"state": "Punjab", "diabetes": 122, "heart": 98, "liver": 48, "total": 610},
        ]
    }

@router.get("/realtime-vitals")
async def realtime_vitals():
    import random
    return {
        "timestamp": datetime.now().isoformat(),
        "critical_patients": random.randint(3, 8),
        "active_alerts": random.randint(5, 15),
        "today_admissions": random.randint(20, 45),
        "today_predictions": random.randint(35, 80),
        "vitals_stream": [
            {
                "patient_id": "PAT000001",
                "heart_rate": 72 + random.randint(-5, 5),
                "spo2": 96 + random.uniform(-1, 1),
                "systolic_bp": 145 + random.randint(-10, 10),
                "timestamp": datetime.now().isoformat()
            }
        ]
    }
