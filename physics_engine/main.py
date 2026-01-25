from fastapi import FastAPI
from routers import simulation, market, catalog

# Servicio principal del motor de cálculo físico. Inicializa la API y registra las rutas.
app = FastAPI(title="Motor de Cálculo Físico para Renovables", version="1.0")

# Registro de rutas para los módulos de simulación, mercado y catálogo
app.include_router(simulation.router, prefix="/predict", tags=["Predicción"])
app.include_router(market.router, prefix="/market", tags=["Mercado"])
app.include_router(catalog.router, prefix="/catalog", tags=["Catálogo"])

@app.get("/")
def read_root():
    return {"mensaje": "Motor de cálculo físico operativo"}
