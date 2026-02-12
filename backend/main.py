from fastapi import FastAPI, Query
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
    zone: str
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
def get_defaults(zone: str | None = Query(default=None)):
    """
    Return default values for the predictor form.
    If a zone is provided, the latest record for that zone is used,
    otherwise the latest overall record is returned.
    """
    df_z = predictor.df_zones
    df_r = predictor.df_resources

    if zone:
        zone_mask = df_z["zone"].str.lower() == zone.lower()
        df_zone_filtered = df_z[zone_mask]
        if not df_zone_filtered.empty:
            latest_zone = df_zone_filtered.sort_values("week_start").iloc[-1]
        else:
            latest_zone = df_z.sort_values("week_start").iloc[-1]
    else:
        latest_zone = df_z.sort_values("week_start").iloc[-1]

    # Align resources by week if possible
    df_res_same_week = df_r[df_r["week_start"] == latest_zone["week_start"]]
    if not df_res_same_week.empty:
        latest_res = df_res_same_week.iloc[-1]
    else:
        latest_res = df_r.sort_values("week_start").iloc[-1]

    return {
        "zone": str(latest_zone["zone"]),
        "population": int(latest_zone["population"]),
        "res_demand": float(latest_zone["residential_demand_mld"]),
        "com_demand": float(latest_zone["commercial_demand_mld"]),
        "ind_demand": float(latest_zone["industrial_demand_mld"]),
        "temp_avg_c": float(latest_res["temp_avg_c"]),
        "rainfall_mm": 0.0,
        "season": str(latest_res["season"]),
    }

@app.post("/api/predict")
def predict_water_stats(data: PredictionInput):
    return predictor.predict(data.dict())