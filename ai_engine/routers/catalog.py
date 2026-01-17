from fastapi import APIRouter
import json
import os

router = APIRouter()

# Load catalogs once (or could be DB)
CATALOG_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "catalogs")

def load_json(name):
    try:
        path = os.path.join(CATALOG_DIR, name)
        with open(path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@router.get("/{technology}")
def get_catalog(technology: str):
    """
    Get equipment catalog for technology.
    technology: solar, wind, battery
    """
    if technology == "solar":
        return load_json("panels.json")
    if technology == "wind":
        return load_json("turbines.json")
    if technology == "battery":
        return load_json("batteries.json")
    
    return []
