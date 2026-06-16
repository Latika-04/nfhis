# NFHIS Datasets Package
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(os.path.dirname(__file__), "nfhis.db")

__all__ = ["DATA_DIR", "DB_PATH"]
