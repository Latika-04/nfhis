"""
NFHIS MongoDB Database Layer
Handles alerts, doctor_logs, hospital_trust, audit_logs
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from datetime import datetime
from typing import Optional, Dict, List, Any
import json

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = "nfhis"

_client: Optional[AsyncIOMotorClient] = None
_sync_client: Optional[MongoClient] = None


async def init_mongodb():
    global _client
    try:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=3000)
        await _client.admin.command("ping")
        db = _client[DB_NAME]
        
        await db.alerts.create_index("patient_id")
        await db.alerts.create_index("created_at")
        await db.alerts.create_index("status")
        await db.doctor_logs.create_index("doctor_id")
        await db.doctor_logs.create_index("timestamp")
        await db.hospital_trust.create_index("hospital_id")
        await db.audit_logs.create_index("user_id")
        await db.audit_logs.create_index("timestamp")
        
        await seed_initial_data(db)
        print("✅ MongoDB connected and initialized")
        
    except Exception as e:
        print(f"⚠️  MongoDB not available: {e}")
        print("   Using in-memory fallback for MongoDB operations")
        _client = None


async def seed_initial_data(db):
    if await db.hospital_trust.count_documents({}) == 0:
        trust_docs = [
            {
                "hospital_id": "Apollo_Private_Hospital",
                "hospital_name": "Apollo Private Hospital",
                "trust_score": 0.92,
                "tier": "private",
                "state": "Telangana",
                "city": "Hyderabad",
                "data_quality_score": 0.95,
                "participation_rate": 1.0,
                "anomaly_count": 0,
                "total_patients": 800,
                "fl_rounds_participated": 15,
                "last_updated": datetime.now().isoformat()
            },
            {
                "hospital_id": "AIIMS_Government_Hospital",
                "hospital_name": "AIIMS Government Hospital",
                "trust_score": 0.88,
                "tier": "government",
                "state": "Delhi",
                "city": "New Delhi",
                "data_quality_score": 0.90,
                "participation_rate": 0.95,
                "anomaly_count": 1,
                "total_patients": 1200,
                "fl_rounds_participated": 14,
                "last_updated": datetime.now().isoformat()
            },
            {
                "hospital_id": "Fortis_National_Hospital",
                "hospital_name": "Fortis National Hospital",
                "trust_score": 0.85,
                "tier": "private",
                "state": "Punjab",
                "city": "Chandigarh",
                "data_quality_score": 0.88,
                "participation_rate": 0.92,
                "anomaly_count": 0,
                "total_patients": 600,
                "fl_rounds_participated": 13,
                "last_updated": datetime.now().isoformat()
            },
            {
                "hospital_id": "District_Rural_Hospital",
                "hospital_name": "District Rural Hospital",
                "trust_score": 0.75,
                "tier": "government",
                "state": "Bihar",
                "city": "Patna",
                "data_quality_score": 0.78,
                "participation_rate": 0.85,
                "anomaly_count": 2,
                "total_patients": 1000,
                "fl_rounds_participated": 11,
                "last_updated": datetime.now().isoformat()
            }
        ]
        await db.hospital_trust.insert_many(trust_docs)
    
    if await db.alerts.count_documents({}) == 0:
        alerts = [
            {
                "alert_id": "ALT001",
                "patient_id": "PAT000042",
                "patient_name": "Arjun Sharma",
                "doctor_id": "DOC001",
                "doctor_name": "Dr. Priya Nair",
                "hospital_id": "Apollo_Private_Hospital",
                "alert_type": "critical_glucose",
                "severity": "critical",
                "message": "Fasting glucose critically high: 320 mg/dL. Immediate intervention required.",
                "vitals": {"fasting_glucose": 320, "hba1c": 9.8, "systolic_bp": 165},
                "risk_scores": {"diabetes": 94.2, "heart_disease": 72.1},
                "status": "acknowledged",
                "acknowledged_at": datetime.now().isoformat(),
                "resolved": False,
                "created_at": datetime.now().isoformat()
            },
            {
                "alert_id": "ALT002",
                "patient_id": "PAT000078",
                "patient_name": "Rekha Verma",
                "doctor_id": "DOC002",
                "doctor_name": "Dr. Karthik Reddy",
                "hospital_id": "AIIMS_Government_Hospital",
                "alert_type": "cardiac_risk",
                "severity": "high",
                "message": "High cardiac risk detected. Cholesterol: 285 mg/dL, BP: 158/98 mmHg.",
                "vitals": {"total_cholesterol": 285, "systolic_bp": 158, "ldl_cholesterol": 198},
                "risk_scores": {"heart_disease": 88.5, "diabetes": 45.2},
                "status": "pending",
                "acknowledged_at": None,
                "resolved": False,
                "created_at": datetime.now().isoformat()
            },
            {
                "alert_id": "ALT003",
                "patient_id": "PAT000156",
                "patient_name": "Mohammed Khan",
                "doctor_id": "DOC003",
                "doctor_name": "Dr. Sunita Gupta",
                "hospital_id": "Fortis_National_Hospital",
                "alert_type": "liver_enzymes",
                "severity": "high",
                "message": "SGPT elevated to 145 U/L. Liver function compromised.",
                "vitals": {"sgpt": 145, "sgot": 112, "bilirubin_total": 2.8},
                "risk_scores": {"liver_disease": 79.3},
                "status": "pending",
                "acknowledged_at": None,
                "resolved": False,
                "created_at": datetime.now().isoformat()
            },
            {
                "alert_id": "ALT004",
                "patient_id": "PAT000201",
                "patient_name": "Lakshmi Patel",
                "doctor_id": "DOC001",
                "doctor_name": "Dr. Priya Nair",
                "hospital_id": "Apollo_Private_Hospital",
                "alert_type": "negligence_flag",
                "severity": "critical",
                "message": "NEGLIGENCE ALERT: Critical glucose alert ignored for 6 hours. Patient risk escalated.",
                "vitals": {"fasting_glucose": 298, "systolic_bp": 170},
                "risk_scores": {"diabetes": 91.5},
                "status": "escalated",
                "acknowledged_at": None,
                "resolved": False,
                "negligence": True,
                "hours_ignored": 6,
                "created_at": datetime.now().isoformat()
            }
        ]
        await db.alerts.insert_many(alerts)
    
    if await db.doctor_logs.count_documents({}) == 0:
        logs = [
            {
                "log_id": "LOG001",
                "doctor_id": "DOC001",
                "doctor_name": "Dr. Priya Nair",
                "hospital_id": "Apollo_Private_Hospital",
                "action": "reviewed_alert",
                "patient_id": "PAT000042",
                "details": "Reviewed critical glucose alert. Ordered insulin adjustment.",
                "alert_id": "ALT001",
                "response_time_hours": 0.5,
                "timestamp": datetime.now().isoformat()
            },
            {
                "log_id": "LOG002",
                "doctor_id": "DOC001",
                "doctor_name": "Dr. Priya Nair",
                "hospital_id": "Apollo_Private_Hospital",
                "action": "ignored_alert",
                "patient_id": "PAT000201",
                "details": "Critical alert for PAT000201 NOT acknowledged within 4-hour window.",
                "alert_id": "ALT004",
                "response_time_hours": 6,
                "negligence_flag": True,
                "timestamp": datetime.now().isoformat()
            },
            {
                "log_id": "LOG003",
                "doctor_id": "DOC002",
                "doctor_name": "Dr. Karthik Reddy",
                "hospital_id": "AIIMS_Government_Hospital",
                "action": "prescribed_medication",
                "patient_id": "PAT000078",
                "details": "Prescribed atorvastatin 40mg for hypercholesterolemia.",
                "response_time_hours": 1.2,
                "timestamp": datetime.now().isoformat()
            }
        ]
        await db.doctor_logs.insert_many(logs)
    
    if await db.audit_logs.count_documents({}) == 0:
        audit = [
            {
                "audit_id": "AUD001",
                "user_id": "admin_001",
                "user_role": "admin",
                "action": "viewed_patient_records",
                "resource": "patients",
                "ip_address": "192.168.1.100",
                "hospital_id": "Apollo_Private_Hospital",
                "details": "Accessed 50 patient records for quality review",
                "timestamp": datetime.now().isoformat()
            },
            {
                "audit_id": "AUD002",
                "user_id": "doc_001",
                "user_role": "doctor",
                "action": "ran_prediction",
                "resource": "predictions",
                "ip_address": "192.168.1.105",
                "hospital_id": "Apollo_Private_Hospital",
                "details": "Ran diabetes prediction for patient PAT000042",
                "timestamp": datetime.now().isoformat()
            }
        ]
        await db.audit_logs.insert_many(audit)


def get_db():
    if _client is None:
        return None
    return _client[DB_NAME]


async def get_async_db():
    if _client is None:
        return None
    return _client[DB_NAME]


# ─── In-memory fallback when MongoDB is unavailable ──────────────────────────

_in_memory_store: Dict[str, List] = {
    "alerts": [],
    "doctor_logs": [],
    "hospital_trust": [],
    "audit_logs": []
}


class InMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self.store = _in_memory_store[name]
    
    async def find(self, query: Dict = {}) -> List:
        return self.store
    
    async def find_one(self, query: Dict = {}) -> Optional[Dict]:
        return self.store[0] if self.store else None
    
    async def insert_one(self, doc: Dict):
        self.store.append(doc)
        return type("InsertResult", (), {"inserted_id": len(self.store)})()
    
    async def insert_many(self, docs: List[Dict]):
        self.store.extend(docs)
    
    async def update_one(self, query: Dict, update: Dict, upsert: bool = False):
        pass
    
    async def count_documents(self, query: Dict = {}) -> int:
        return len(self.store)
