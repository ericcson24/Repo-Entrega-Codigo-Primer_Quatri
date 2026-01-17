from fastapi import FastAPI
from routers import simulation, market, catalog

app = FastAPI(title="Renewable Energy AI Engine", version="1.0")

# Register Routers
app.include_router(simulation.router, prefix="/predict", tags=["Prediction"])
app.include_router(market.router, prefix="/market", tags=["Market"])
app.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])

@app.get("/")
def read_root():
    return {"message": "AI Engine & Data Service Operational"}
