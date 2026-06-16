# NFHIS ML Package
import os
import pickle
from typing import Optional, Dict

_MODEL_REGISTRY: Dict[str, dict] = {}


def load_model(hospital: str, disease: str) -> Optional[dict]:
    key = f"{hospital}_{disease}"
    if key in _MODEL_REGISTRY:
        return _MODEL_REGISTRY[key]

    base = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base, "saved_models", f"{key}.pkl")
    if os.path.exists(path):
        with open(path, "rb") as f:
            saved = pickle.load(f)
        _MODEL_REGISTRY[key] = saved
        return saved
    return None


def list_models() -> list:
    base = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base, "saved_models")
    if not os.path.exists(model_dir):
        return []
    return [f.replace(".pkl", "") for f in os.listdir(model_dir) if f.endswith(".pkl")]


__all__ = ["load_model", "list_models"]
