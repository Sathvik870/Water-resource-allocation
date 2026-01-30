from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from ml_engine import WaterPredictor

app = FastAPI()
predictor = WaterPredictor()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    population: int
    priority_level: str
    festival_week: str
    res_demand: float
    com_demand: float
    ind_demand: float
    temp_avg_c: float
    season: str
    rainfall_mm: float

@app.get("/api/dashboard")
def get_dashboard():
    return predictor.get_dashboard_stats()

@app.get("/api/defaults")
def get_defaults():
    # Return default values for the predictor form based on latest data
    latest_zone = predictor.df_zones.iloc[-1]
    latest_res = predictor.df_resources.iloc[-1]
    return {
        "population": int(latest_zone['population']),
        "res_demand": float(latest_zone['residential_demand_mld']),
        "com_demand": float(latest_zone['commercial_demand_mld']),
        "ind_demand": float(latest_zone['industrial_demand_mld']),
        "temp_avg_c": float(latest_res['temp_avg_c']),
        "rainfall_mm": 0.0,
        "season": "Summer"
    }

@app.post("/api/predict")
def predict_water_stats(data: PredictionInput):
    return predictor.predict(data.dict())