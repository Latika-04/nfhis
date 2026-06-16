"""
NFHIS FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.routers import (
    patients, predictions, federated, hospitals, 
    alerts, doctors, analytics, auth
)
from backend.database.mongodb import init_mongodb
from backend.database.sqlite_db import init_sqlite
from backend.services.background_tasks import start_background_monitor

app = FastAPI(
    title="NFHIS - National Federated Healthcare Intelligence System",
    description="AI-powered federated healthcare intelligence platform for Indian hospitals",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions & XAI"])
app.include_router(federated.router, prefix="/api/federated", tags=["Federated Learning"])
app.include_router(hospitals.router, prefix="/api/hospitals", tags=["Hospitals"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts & Negligence"])
app.include_router(doctors.router, prefix="/api/doctors", tags=["Doctors"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.on_event("startup")
async def startup_event():
    print("🚀 NFHIS Starting up...")
    await init_mongodb()
    init_sqlite()
    print("✅ Databases initialized")
    print("✅ NFHIS API ready at http://localhost:8000")


@app.get("/")
async def root():
    return {
        "system": "National Federated Healthcare Intelligence System",
        "version": "1.0.0",
        "status": "operational",
        "hospitals": 4,
        "endpoints": "/api/docs"
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "up",
            "ml_models": "up",
            "federated_learning": "up"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
