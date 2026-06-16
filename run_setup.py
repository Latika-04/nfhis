#!/usr/bin/env python3
"""
NFHIS One-Shot Setup Script
Runs dataset generation, model training, and federated learning in sequence
"""

import subprocess
import sys
import os
import time

ROOT = os.path.dirname(os.path.abspath(__file__))

STEPS = [
    {
        "name": "Generate Synthetic Datasets",
        "cmd": [sys.executable, "datasets/generate_datasets.py"],
        "desc": "Creating 3,600 synthetic Indian healthcare patient records...",
    },
    {
        "name": "Train ML Models",
        "cmd": [sys.executable, "ml/train_models.py"],
        "desc": "Training XGBoost models for Diabetes, Heart Disease, Liver Disease...",
    },
    {
        "name": "Run Federated Learning",
        "cmd": [sys.executable, "federated/federated_learning.py"],
        "desc": "Simulating hierarchical FL (Hospital → State → National)...",
    },
]


def run_step(step, idx, total):
    print(f"\n{'='*60}")
    print(f"[{idx}/{total}] {step['name']}")
    print(f"  {step['desc']}")
    start = time.time()
    result = subprocess.run(step["cmd"], cwd=ROOT, text=True)
    elapsed = time.time() - start
    status = "✅" if result.returncode == 0 else "⚠️ "
    print(f"  {status} Done in {elapsed:.1f}s")
    return result.returncode == 0


def main():
    print("=" * 60)
    print("NFHIS — Setup Pipeline")
    print("=" * 60)
    total = len(STEPS)
    ok = sum(run_step(s, i + 1, total) for i, s in enumerate(STEPS))
    print(f"\n{'='*60}")
    print(f"Setup: {ok}/{total} steps succeeded")
    print("\nStart commands:")
    print("  uvicorn backend.main:app --port 8000 --reload")
    print("  cd frontend && npm install && npm start")
    print("\nLogins: doctor1/doctor123  nurse1/nurse123  head1/head123  admin1/admin123")


if __name__ == "__main__":
    main()
