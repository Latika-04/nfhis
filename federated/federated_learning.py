"""
NFHIS Federated Learning System
Implements hierarchical FL: Hospital → State → National
With secure aggregation simulation and trust-score weighted averaging
"""

import numpy as np
import pandas as pd
import json
import hashlib
import pickle
import os
import sqlite3
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field, asdict
import copy
import warnings
warnings.filterwarnings("ignore")

try:
    from xgboost import XGBClassifier
    _USE_XGB = True
except ImportError:
    from sklearn.ensemble import GradientBoostingClassifier as XGBClassifier
    _USE_XGB = False

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score

# ─── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class ModelUpdate:
    hospital_id: str
    round_number: int
    disease: str
    weights: List[float]
    n_samples: int
    accuracy: float
    loss: float
    encrypted: bool = False
    noise_level: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class HospitalTrustScore:
    hospital_id: str
    trust_score: float
    accuracy_history: List[float] = field(default_factory=list)
    data_quality_score: float = 1.0
    participation_rate: float = 1.0
    anomaly_count: int = 0
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())


# ─── Secure Aggregation Simulation ──────────────────────────────────────────

class SecureAggregator:
    """Simulates homomorphic encryption for secure weight aggregation"""
    
    def __init__(self, noise_multiplier: float = 0.01):
        self.noise_multiplier = noise_multiplier
        self._public_key = np.random.randint(100, 999)
    
    def encrypt_weights(self, weights: np.ndarray) -> Tuple[np.ndarray, str]:
        """Add Gaussian noise to simulate differential privacy"""
        noise = np.random.normal(0, self.noise_multiplier * np.std(weights), weights.shape)
        encrypted = weights + noise
        nonce = hashlib.sha256(weights.tobytes()).hexdigest()[:16]
        return encrypted, nonce
    
    def decrypt_weights(self, encrypted: np.ndarray, nonce: str) -> np.ndarray:
        """Decrypt weights (in real system would use private key)"""
        return encrypted
    
    def secure_sum(self, weight_list: List[np.ndarray], scales: List[float]) -> np.ndarray:
        """Securely aggregate weights with scaling"""
        total_scale = sum(scales)
        agg = np.zeros_like(weight_list[0])
        for w, s in zip(weight_list, scales):
            agg += w * (s / total_scale)
        return agg
    
    def hash_weights(self, weights: np.ndarray) -> str:
        return hashlib.sha256(weights.tobytes()).hexdigest()


# ─── Trust Score Manager ─────────────────────────────────────────────────────

class TrustScoreManager:
    def __init__(self):
        self.trust_scores: Dict[str, HospitalTrustScore] = {}
        self._initialize_default_trust()
    
    def _initialize_default_trust(self):
        hospitals = [
            "Apollo_Private_Hospital",
            "AIIMS_Government_Hospital",
            "Fortis_National_Hospital",
            "District_Rural_Hospital"
        ]
        initial_scores = {
            "Apollo_Private_Hospital": 0.92,
            "AIIMS_Government_Hospital": 0.88,
            "Fortis_National_Hospital": 0.85,
            "District_Rural_Hospital": 0.75,
        }
        for h in hospitals:
            self.trust_scores[h] = HospitalTrustScore(
                hospital_id=h,
                trust_score=initial_scores.get(h, 0.8),
                accuracy_history=[initial_scores.get(h, 0.8)],
                data_quality_score=initial_scores.get(h, 0.8),
                participation_rate=1.0,
            )
    
    def update_trust(self, hospital_id: str, new_accuracy: float, participated: bool = True):
        if hospital_id not in self.trust_scores:
            self.trust_scores[hospital_id] = HospitalTrustScore(
                hospital_id=hospital_id,
                trust_score=0.7
            )
        
        ts = self.trust_scores[hospital_id]
        ts.accuracy_history.append(new_accuracy)
        
        recent = ts.accuracy_history[-5:]
        accuracy_component = np.mean(recent)
        
        if participated:
            ts.participation_rate = min(1.0, ts.participation_rate + 0.02)
        else:
            ts.participation_rate = max(0.3, ts.participation_rate - 0.05)
        
        ts.trust_score = (
            0.5 * accuracy_component +
            0.3 * ts.data_quality_score +
            0.2 * ts.participation_rate
        )
        ts.trust_score = round(min(1.0, max(0.1, ts.trust_score)), 4)
        ts.last_updated = datetime.now().isoformat()
    
    def detect_anomaly(self, hospital_id: str, update: ModelUpdate) -> bool:
        if hospital_id not in self.trust_scores:
            return False
        ts = self.trust_scores[hospital_id]
        if len(ts.accuracy_history) < 2:
            return False
        avg_acc = np.mean(ts.accuracy_history[-3:])
        if abs(update.accuracy - avg_acc) > 0.15:
            ts.anomaly_count += 1
            ts.trust_score = max(0.3, ts.trust_score - 0.05)
            print(f"  ⚠️  Anomaly detected for {hospital_id}: accuracy jump {avg_acc:.3f} → {update.accuracy:.3f}")
            return True
        return False
    
    def get_aggregation_weights(self, hospital_ids: List[str]) -> List[float]:
        weights = [self.trust_scores.get(h, HospitalTrustScore(h, 0.7)).trust_score 
                   for h in hospital_ids]
        total = sum(weights)
        return [w / total for w in weights]
    
    def get_all_scores(self) -> Dict:
        return {k: asdict(v) for k, v in self.trust_scores.items()}


# ─── Hospital Node ────────────────────────────────────────────────────────────

class HospitalNode:
    def __init__(self, hospital_id: str, state: str, tier: str = "hospital"):
        self.hospital_id = hospital_id
        self.state = state
        self.tier = tier
        self.local_models: Dict[str, XGBClassifier] = {}
        self.global_weights: Dict[str, np.ndarray] = {}
        self.round_history = []
        self.data: Optional[pd.DataFrame] = None
    
    def load_data(self, data_path: str):
        if os.path.exists(data_path):
            self.data = pd.read_csv(data_path)
            print(f"  Loaded {len(self.data)} records for {self.hospital_id}")
        else:
            print(f"  ⚠️  Data not found at {data_path}, using synthetic data")
            self.data = self._generate_synthetic_data(200)
    
    def _generate_synthetic_data(self, n: int) -> pd.DataFrame:
        np.random.seed(hash(self.hospital_id) % 2**31)
        df = pd.DataFrame({
            "age": np.random.normal(45, 15, n).clip(18, 90),
            "bmi": np.random.normal(25, 5, n).clip(15, 50),
            "fasting_glucose": np.random.normal(100, 30, n).clip(60, 400),
            "hba1c": np.random.normal(5.8, 1.2, n).clip(4, 14),
            "systolic_bp": np.random.normal(125, 20, n).clip(80, 200),
            "diastolic_bp": np.random.normal(82, 12, n).clip(50, 120),
            "total_cholesterol": np.random.normal(190, 35, n).clip(120, 400),
            "hdl_cholesterol": np.random.normal(50, 12, n).clip(20, 90),
            "ldl_cholesterol": np.random.normal(120, 30, n).clip(50, 300),
            "triglycerides": np.random.normal(150, 50, n).clip(50, 600),
            "sgpt": np.random.normal(35, 20, n).clip(7, 300),
            "sgot": np.random.normal(32, 18, n).clip(7, 250),
            "family_history_diabetes": np.random.randint(0, 2, n),
            "family_history_heart": np.random.randint(0, 2, n),
            "gender": np.random.randint(0, 2, n),
            "smoking_status": np.random.randint(0, 3, n),
            "exercise_level": np.random.randint(0, 4, n),
        })
        df["diabetes"] = ((df["fasting_glucose"] > 126) | (df["hba1c"] > 6.5)).astype(int)
        df["heart_disease"] = ((df["total_cholesterol"] > 200) & (df["systolic_bp"] > 140)).astype(int)
        df["liver_disease"] = (df["sgpt"] > 56).astype(int)
        return df
    
    def _get_features(self) -> Tuple[np.ndarray, List[str]]:
        feature_cols = [
            "age", "bmi", "fasting_glucose", "hba1c", "systolic_bp", "diastolic_bp",
            "total_cholesterol", "hdl_cholesterol", "ldl_cholesterol", "triglycerides",
            "sgpt", "sgot", "family_history_diabetes", "family_history_heart",
            "gender", "smoking_status", "exercise_level"
        ]
        available = [c for c in feature_cols if c in self.data.columns]
        
        categorical_maps = {
            "exercise_level": {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3},
            "smoking_status": {"Never": 0, "Former": 1, "Current": 2},
            "gender": {"Female": 0, "Male": 1}
        }
        
        df = self.data.copy()
        for col, mapping in categorical_maps.items():
            if col in df.columns and df[col].dtype == object:
                df[col] = df[col].map(mapping).fillna(0)
        
        X = df[available].fillna(df[available].median())
        return X.values, available
    
    def train_local(self, disease: str, round_num: int, 
                    global_weights: Optional[np.ndarray] = None) -> ModelUpdate:
        if self.data is None:
            raise ValueError(f"No data loaded for {self.hospital_id}")
        
        if disease not in self.data.columns:
            raise ValueError(f"Target '{disease}' not in data")
        
        X, feature_names = self._get_features()
        y = self.data[disease].values
        
        if len(np.unique(y)) < 2:
            y[0] = 1
        
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=round_num)
        
        scale_pos_weight = max((y_train == 0).sum() / max((y_train == 1).sum(), 1), 1)
        
        if _USE_XGB:
            model = XGBClassifier(
                n_estimators=50, max_depth=4, learning_rate=0.1,
                scale_pos_weight=scale_pos_weight,
                use_label_encoder=False, eval_metric="logloss",
                random_state=42, verbosity=0
            )
        else:
            model = XGBClassifier(
                n_estimators=50, max_depth=4, learning_rate=0.1,
                subsample=0.8, random_state=42,
            )
        
        if global_weights is not None and len(global_weights) > 0:
            model.fit(X_train, y_train, verbose=False)
        else:
            model.fit(X_train, y_train)
        
        self.local_models[disease] = model
        
        y_pred = model.predict(X_val)
        y_prob = model.predict_proba(X_val)[:, 1]
        
        accuracy = accuracy_score(y_val, y_pred)
        auc = roc_auc_score(y_val, y_prob) if len(np.unique(y_val)) > 1 else 0.5
        loss = -np.mean(y_val * np.log(y_prob + 1e-8) + (1 - y_val) * np.log(1 - y_prob + 1e-8))
        
        weights = model.feature_importances_.tolist()
        
        return ModelUpdate(
            hospital_id=self.hospital_id,
            round_number=round_num,
            disease=disease,
            weights=weights,
            n_samples=len(X_train),
            accuracy=accuracy,
            loss=loss,
        )
    
    def apply_global_weights(self, disease: str, weights: np.ndarray):
        self.global_weights[disease] = weights


# ─── Federated Server ─────────────────────────────────────────────────────────

class FederatedServer:
    def __init__(self, min_hospitals: int = 2):
        self.min_hospitals = min_hospitals
        self.global_weights: Dict[str, np.ndarray] = {}
        self.round_history = []
        self.trust_manager = TrustScoreManager()
        self.secure_agg = SecureAggregator(noise_multiplier=0.005)
        self.current_round = 0
    
    def aggregate(self, updates: List[ModelUpdate], disease: str) -> np.ndarray:
        if len(updates) < self.min_hospitals:
            raise ValueError(f"Need at least {self.min_hospitals} hospitals, got {len(updates)}")
        
        hospital_ids = [u.hospital_id for u in updates]
        trust_weights = self.trust_manager.get_aggregation_weights(hospital_ids)
        
        anomalies = []
        clean_updates = []
        clean_weights = []
        
        for update, tw in zip(updates, trust_weights):
            is_anomaly = self.trust_manager.detect_anomaly(update.hospital_id, update)
            if is_anomaly:
                anomalies.append(update.hospital_id)
            else:
                clean_updates.append(update)
                sample_weight = update.n_samples / sum(u.n_samples for u in updates)
                combined_weight = 0.6 * tw + 0.4 * sample_weight
                clean_weights.append(combined_weight)
        
        if not clean_updates:
            clean_updates = updates
            clean_weights = trust_weights
        
        total = sum(clean_weights)
        clean_weights = [w / total for w in clean_weights]
        
        max_len = max(len(u.weights) for u in clean_updates)
        padded_weights = []
        for u in clean_updates:
            w = np.array(u.weights)
            if len(w) < max_len:
                w = np.pad(w, (0, max_len - len(w)))
            padded_weights.append(w)
        
        encrypted_weights = []
        for w in padded_weights:
            enc, nonce = self.secure_agg.encrypt_weights(w)
            encrypted_weights.append(enc)
        
        aggregated = self.secure_agg.secure_sum(encrypted_weights, clean_weights)
        
        return aggregated
    
    def run_round(self, hospital_nodes: List[HospitalNode], disease: str) -> Dict:
        self.current_round += 1
        print(f"\n  🔄 FL Round {self.current_round} for {disease}")
        
        updates = []
        round_metrics = []
        
        for node in hospital_nodes:
            try:
                global_w = self.global_weights.get(disease)
                update = node.train_local(disease, self.current_round, global_w)
                
                self.trust_manager.update_trust(node.hospital_id, update.accuracy)
                updates.append(update)
                
                round_metrics.append({
                    "hospital": node.hospital_id,
                    "accuracy": update.accuracy,
                    "loss": update.loss,
                    "n_samples": update.n_samples,
                    "trust_score": self.trust_manager.trust_scores[node.hospital_id].trust_score
                })
                print(f"    ✓ {node.hospital_id}: acc={update.accuracy:.3f}, loss={update.loss:.3f}")
                
            except Exception as e:
                print(f"    ✗ {node.hospital_id} failed: {e}")
                self.trust_manager.update_trust(node.hospital_id, 0.5, participated=False)
        
        if len(updates) >= self.min_hospitals:
            aggregated = self.aggregate(updates, disease)
            self.global_weights[disease] = aggregated
            
            for node in hospital_nodes:
                node.apply_global_weights(disease, aggregated)
            
            weights_hash = self.secure_agg.hash_weights(aggregated)
            print(f"    🔐 Aggregated weights hash: {weights_hash[:16]}...")
        
        round_result = {
            "round": self.current_round,
            "disease": disease,
            "n_hospitals": len(updates),
            "hospital_metrics": round_metrics,
            "avg_accuracy": np.mean([m["accuracy"] for m in round_metrics]),
            "avg_loss": np.mean([m["loss"] for m in round_metrics]),
            "trust_scores": self.trust_manager.get_all_scores(),
            "timestamp": datetime.now().isoformat()
        }
        
        self.round_history.append(round_result)
        return round_result


# ─── Hierarchical FL ─────────────────────────────────────────────────────────

class HierarchicalFLSystem:
    """
    Implements 3-tier FL:
    Tier 1: Hospital local training
    Tier 2: State aggregation
    Tier 3: National aggregation
    """
    
    def __init__(self):
        self.hospital_nodes: Dict[str, HospitalNode] = {}
        self.state_servers: Dict[str, FederatedServer] = {}
        self.national_server = FederatedServer(min_hospitals=2)
        self.state_groupings: Dict[str, List[str]] = {}
        self.fl_logs = []
    
    def add_hospital(self, hospital_id: str, state: str, data_path: str):
        node = HospitalNode(hospital_id, state)
        node.load_data(data_path)
        self.hospital_nodes[hospital_id] = node
        
        if state not in self.state_groupings:
            self.state_groupings[state] = []
            self.state_servers[state] = FederatedServer(min_hospitals=1)
        self.state_groupings[state].append(hospital_id)
    
    def run_hierarchical_round(self, disease: str, n_rounds: int = 3) -> Dict:
        print(f"\n{'='*60}")
        print(f"HIERARCHICAL FL: {disease.upper()}")
        print(f"{'='*60}")
        
        all_results = {
            "disease": disease,
            "n_rounds": n_rounds,
            "tiers": []
        }
        
        for round_num in range(n_rounds):
            print(f"\n📍 ROUND {round_num + 1}/{n_rounds}")
            
            print("\n  🏥 TIER 1: Hospital Local Training")
            tier1_results = {}
            for hospital_id, node in self.hospital_nodes.items():
                try:
                    update = node.train_local(disease, round_num + 1)
                    tier1_results[hospital_id] = {
                        "accuracy": update.accuracy,
                        "loss": update.loss,
                        "n_samples": update.n_samples
                    }
                except Exception as e:
                    print(f"    Error for {hospital_id}: {e}")
            
            print("\n  🏙️  TIER 2: State-Level Aggregation")
            tier2_results = {}
            for state, hospital_ids in self.state_groupings.items():
                state_nodes = [self.hospital_nodes[h] for h in hospital_ids if h in self.hospital_nodes]
                if len(state_nodes) >= 1:
                    try:
                        result = self.state_servers[state].run_round(state_nodes, disease)
                        tier2_results[state] = {
                            "avg_accuracy": result["avg_accuracy"],
                            "n_hospitals": result["n_hospitals"]
                        }
                        print(f"    State {state}: avg_accuracy={result['avg_accuracy']:.3f}")
                    except Exception as e:
                        print(f"    State {state} aggregation failed: {e}")
            
            print("\n  🌐 TIER 3: National Aggregation")
            state_virtual_nodes = []
            for state, h_ids in self.state_groupings.items():
                for h_id in h_ids:
                    if h_id in self.hospital_nodes:
                        state_virtual_nodes.append(self.hospital_nodes[h_id])
                        break
            
            if len(state_virtual_nodes) >= 2:
                nat_result = self.national_server.run_round(state_virtual_nodes, disease)
                print(f"    🌍 National avg accuracy: {nat_result['avg_accuracy']:.3f}")
            
            round_summary = {
                "round": round_num + 1,
                "tier1": tier1_results,
                "tier2": tier2_results,
                "timestamp": datetime.now().isoformat()
            }
            all_results["tiers"].append(round_summary)
            self.fl_logs.append(round_summary)
        
        return all_results
    
    def save_fl_logs(self, output_path: str = "federated/fl_results.json"):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        logs = {
            "trust_scores": self.national_server.trust_manager.get_all_scores(),
            "round_history": self.national_server.round_history,
            "fl_logs": self.fl_logs,
            "generated_at": datetime.now().isoformat()
        }
        with open(output_path, "w") as f:
            json.dump(logs, f, indent=2, default=str)
        print(f"\n✅ FL logs saved to {output_path}")
        return logs
    
    def save_logs_to_sqlite(self):
        conn = sqlite3.connect("datasets/nfhis.db")
        records = []
        for r in self.national_server.round_history:
            for hm in r.get("hospital_metrics", []):
                records.append({
                    "round_number": r["round"],
                    "hospital": hm["hospital"],
                    "weights_hash": "aggregated",
                    "num_samples": hm["n_samples"],
                    "loss": hm["loss"],
                    "accuracy": hm["accuracy"],
                    "completed_at": r["timestamp"]
                })
        
        if records:
            pd.DataFrame(records).to_sql("fl_rounds", conn, if_exists="replace", index=False)
            conn.commit()
        conn.close()
        print("FL logs saved to SQLite")


def run_federated_system():
    system = HierarchicalFLSystem()
    
    hospital_configs = [
        ("Apollo_Private_Hospital", "Telangana", "datasets/data/Apollo_Private_Hospital.csv"),
        ("AIIMS_Government_Hospital", "Delhi", "datasets/data/AIIMS_Government_Hospital.csv"),
        ("Fortis_National_Hospital", "Punjab", "datasets/data/Fortis_National_Hospital.csv"),
        ("District_Rural_Hospital", "Bihar", "datasets/data/District_Rural_Hospital.csv"),
    ]
    
    print("Initializing Federated Learning System...")
    for hospital_id, state, data_path in hospital_configs:
        system.add_hospital(hospital_id, state, data_path)
    
    all_fl_results = {}
    for disease in ["diabetes", "heart_disease", "liver_disease"]:
        results = system.run_hierarchical_round(disease, n_rounds=3)
        all_fl_results[disease] = results
    
    logs = system.save_fl_logs()
    system.save_logs_to_sqlite()
    
    print("\n" + "=" * 60)
    print("Federated Learning Complete!")
    print("=" * 60)
    print("\nFinal Trust Scores:")
    for hospital, data in logs["trust_scores"].items():
        print(f"  {hospital}: {data['trust_score']:.3f}")
    
    return system, logs


if __name__ == "__main__":
    system, logs = run_federated_system()
