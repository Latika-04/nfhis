"""NFHIS Auth Router - Role-based authentication"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

USERS = {
    "doctor1": {"user_id": "DOC001", "username": "doctor1", "password": "doctor123", "role": "doctor", "name": "Dr. Priya Nair", "hospital_id": "Apollo_Private_Hospital"},
    "nurse1": {"user_id": "NUR001", "username": "nurse1", "password": "nurse123", "role": "nurse", "name": "Nurse Anita Singh", "hospital_id": "Apollo_Private_Hospital"},
    "head1": {"user_id": "HEAD001", "username": "head1", "password": "head123", "role": "head_doctor", "name": "Dr. Ramesh Sharma", "hospital_id": "Apollo_Private_Hospital"},
    "admin1": {"user_id": "ADM001", "username": "admin1", "password": "admin123", "role": "admin", "name": "System Administrator", "hospital_id": "ALL"},
    "doctor2": {"user_id": "DOC002", "username": "doctor2", "password": "doctor123", "role": "doctor", "name": "Dr. Karthik Reddy", "hospital_id": "AIIMS_Government_Hospital"},
}

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user_id: str
    username: str
    role: str
    name: str
    hospital_id: str

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    import hashlib
    token = hashlib.md5(f"{req.username}{req.password}nfhis".encode()).hexdigest()
    
    return LoginResponse(
        token=token,
        user_id=user["user_id"],
        username=user["username"],
        role=user["role"],
        name=user["name"],
        hospital_id=user["hospital_id"]
    )

@router.get("/demo-credentials")
async def demo_credentials():
    return {
        "credentials": [
            {"username": "doctor1", "password": "doctor123", "role": "Doctor", "name": "Dr. Priya Nair"},
            {"username": "nurse1", "password": "nurse123", "role": "Nurse", "name": "Nurse Anita Singh"},
            {"username": "head1", "password": "head123", "role": "Head Doctor", "name": "Dr. Ramesh Sharma"},
            {"username": "admin1", "password": "admin123", "role": "Admin", "name": "System Administrator"},
        ]
    }

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
