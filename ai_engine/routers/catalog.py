from fastapi import APIRouter
import json
import os

router = APIRouter()

# Cargar catálogos (desde archivo local, extensible a DB)
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
    Obtener catálogo de equipamiento por tecnología.
    tecnología: solar, wind (eólica), battery (baterías), hydro (hidráulica), biomass (biomasa)
    """
    if technology == "solar":
        return load_json("panels.json")
    if technology == "wind":
        return load_json("turbines.json")
    if technology == "battery":
        return load_json("batteries.json")
    if technology == "hydro":
        return load_json("hydro.json")
    if technology == "biomass":
        return load_json("biomass.json")
    
    return []
