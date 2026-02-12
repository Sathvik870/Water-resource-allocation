import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from sklearn.multioutput import MultiOutputRegressor
import xgboost as xgb
import tensorflow as tf
from tensorflow.keras.models import Sequential #type: ignore
from tensorflow.keras.layers import LSTM, Dense, Input #type: ignore
import warnings
warnings.filterwarnings("ignore")
class WaterPredictor:
    def __init__(self):
        print("--- Initializing Water Management AI ---")
        # 1. Load Data
        try:
            self.df_resources = pd.read_csv("data/water resources data.csv")
            self.df_zones = pd.read_csv("data/zone wise weekly datas.csv")
            self.df_scenarios = pd.read_csv("data/coimbatore_what_if_analysis_weekly_2024.csv")

        except FileNotFoundError as e:
            print(f"Error loading files: {e}")
            raise

        # 2. Preprocessing & Merging
        self.df_zones['week_start'] = pd.to_datetime(self.df_zones['week_start'], dayfirst=True)
        self.df_resources['week_start'] = pd.to_datetime(self.df_resources['week_start'], dayfirst=True)
        
        self.merged_df = pd.merge(self.df_zones, self.df_resources, on="week_start", how="left")
        self.merged_df = self.merged_df.fillna(0)

        # 3. Scalers (Needed for LSTM accuracy)
        self.scaler_supply = StandardScaler()
        self.scaler_ops = StandardScaler()
        
        # 4. Encoders
        self.le_season = LabelEncoder()
        self.le_priority = LabelEncoder()
        self.le_zone = LabelEncoder()

        # 5. Prepare Datasets (X and y)
        self._prepare_datasets()

        # 6. Train All Models
        self._train_models()

    def _prepare_datasets(self):
        # --- Prepare Supply Data ---
        features_supply = ['temp_avg_c', 'avg_humidity_pct', 'rainfall_mm_week', 'water_demand_multiplier', 'season']
        self.X_supply_raw = self.merged_df[features_supply].copy()
        
        # Encode Season
        self.X_supply_raw['season_encoded'] = self.le_season.fit_transform(self.X_supply_raw['season'].astype(str))
        self.X_supply_raw = self.X_supply_raw.drop(columns=['season'])
        
        # Scale Data
        self.X_supply_scaled = self.scaler_supply.fit_transform(self.X_supply_raw)
        self.y_supply = self.merged_df[['siruvani_supply_mld', 'pilloor_supply_mld', 'groundwater_supply_mld']].values

        # --- Prepare Operations Data (zone-aware) ---
        # Include zone so the model can learn different behaviours per zone
        features_ops = [
            'zone',
            'population',
            'residential_demand_mld',
            'commercial_demand_mld',
            'industrial_demand_mld',
            'total_demand_mld',
            'priority_level',
        ]
        self.X_ops_raw = self.merged_df[features_ops].copy()
        
        # Encode categorical features
        self.X_ops_raw['zone_encoded'] = self.le_zone.fit_transform(
            self.X_ops_raw['zone'].astype(str)
        )
        self.X_ops_raw['priority_encoded'] = self.le_priority.fit_transform(self.X_ops_raw['priority_level'].astype(str))
        self.X_ops_raw = self.X_ops_raw.drop(columns=['zone', 'priority_level'])

        # Scale Data
        self.X_ops_scaled = self.scaler_ops.fit_transform(self.X_ops_raw)
        self.y_ops = self.merged_df[['supply_hours_per_day', 'pumping_capacity_mld']].values

    def _train_models(self):
        print("\n--- Training Random Forest Models (per zone) ---")

        # Containers for per-zone models and scores
        self.zone_supply_models = {}
        self.zone_ops_models = {}
        self.zone_scores = {}

        zones = sorted(self.merged_df['zone'].astype(str).unique())
        for zone in zones:
            mask = self.merged_df['zone'].astype(str) == zone
            Xs = self.X_supply_scaled[mask]
            ys = self.y_supply[mask]
            Xo = self.X_ops_scaled[mask]
            yo = self.y_ops[mask]

            # Need enough samples to train/validate
            if len(Xs) < 10 or len(Xo) < 10:
                print(f"  - Skipping zone '{zone}' (insufficient samples: {len(Xs)})")
                continue

            X_supp_train, X_supp_test, y_supp_train, y_supp_test = train_test_split(
                Xs, ys, test_size=0.2, random_state=42
            )
            X_ops_train, X_ops_test, y_ops_train, y_ops_test = train_test_split(
                Xo, yo, test_size=0.2, random_state=42
            )

            # Train Random Forest models for this zone
            rf_supply = RandomForestRegressor(n_estimators=120, random_state=42)
            rf_supply.fit(X_supp_train, y_supp_train)
            score_s = r2_score(y_supp_test, rf_supply.predict(X_supp_test))

            rf_ops = RandomForestRegressor(n_estimators=120, random_state=42)
            rf_ops.fit(X_ops_train, y_ops_train)
            score_o = r2_score(y_ops_test, rf_ops.predict(X_ops_test))

            self.zone_supply_models[zone] = rf_supply
            self.zone_ops_models[zone] = rf_ops
            self.zone_scores[zone] = {
                "supply_r2": float(score_s),
                "ops_r2": float(score_o),
            }

            print(f"  - Zone '{zone}': supply R2={score_s:.3f}, ops R2={score_o:.3f}")

        # Also train a global fallback model across all zones
        print("\n--- Training global fallback Random Forest ---")
        X_supp_train, X_supp_test, y_supp_train, y_supp_test = train_test_split(
            self.X_supply_scaled, self.y_supply, test_size=0.2, random_state=42
        )
        X_ops_train, X_ops_test, y_ops_train, y_ops_test = train_test_split(
            self.X_ops_scaled, self.y_ops, test_size=0.2, random_state=42
        )

        self.global_rf_supply = RandomForestRegressor(n_estimators=120, random_state=42)
        self.global_rf_supply.fit(X_supp_train, y_supp_train)
        global_supply_r2 = r2_score(y_supp_test, self.global_rf_supply.predict(X_supp_test))

        self.global_rf_ops = RandomForestRegressor(n_estimators=120, random_state=42)
        self.global_rf_ops.fit(X_ops_train, y_ops_train)
        global_ops_r2 = r2_score(y_ops_test, self.global_rf_ops.predict(X_ops_test))

        self.global_scores = {
            "supply_r2": float(global_supply_r2),
            "ops_r2": float(global_ops_r2),
        }

        print(
            f"  - Global model: supply R2={global_supply_r2:.3f}, "
            f"ops R2={global_ops_r2:.3f}"
        )

    def _train_random_forest(self, X_s_train, y_s_train, X_s_test, y_s_test, X_o_train, y_o_train, X_o_test, y_o_test):
        print("\n[1] Random Forest Training...")
        
        # Supply Model
        rf_supply = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_supply.fit(X_s_train, y_s_train)
        score_s = r2_score(y_s_test, rf_supply.predict(X_s_test))
        print(f"    - Supply Model Accuracy (R2): {score_s:.4f}")

        # Ops Model
        rf_ops = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_ops.fit(X_o_train, y_o_train)
        score_o = r2_score(y_o_test, rf_ops.predict(X_o_test))
        print(f"    - Operations Model Accuracy (R2): {score_o:.4f}")

        return rf_supply, rf_ops

    def _train_xgboost(self, X_s_train, y_s_train, X_s_test, y_s_test, X_o_train, y_o_train, X_o_test, y_o_test):
        print("\n[2] XGBoost Training...")
        
        # Supply Model (Wrapped in MultiOutput because XGBoost is natively single-output for regression usually)
        xgb_supply = MultiOutputRegressor(xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, random_state=42))
        xgb_supply.fit(X_s_train, y_s_train)
        score_s = r2_score(y_s_test, xgb_supply.predict(X_s_test))
        print(f"    - Supply Model Accuracy (R2): {score_s:.4f}")

        # Ops Model
        xgb_ops = MultiOutputRegressor(xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, random_state=42))
        xgb_ops.fit(X_o_train, y_o_train)
        score_o = r2_score(y_o_test, xgb_ops.predict(X_o_test))
        print(f"    - Operations Model Accuracy (R2): {score_o:.4f}")

    def _train_lstm(self, X_s_train, y_s_train, X_s_test, y_s_test, X_o_train, y_o_train, X_o_test, y_o_test):
        print("\n[3] LSTM (Deep Learning) Training...")
        
        # Reshape for LSTM: [samples, time_steps, features] -> time_steps=1 for this specific inputs
        X_s_train_r = X_s_train.reshape((X_s_train.shape[0], 1, X_s_train.shape[1]))
        X_s_test_r = X_s_test.reshape((X_s_test.shape[0], 1, X_s_test.shape[1]))
        
        X_o_train_r = X_o_train.reshape((X_o_train.shape[0], 1, X_o_train.shape[1]))
        X_o_test_r = X_o_test.reshape((X_o_test.shape[0], 1, X_o_test.shape[1]))

        # Supply Model
        model_s = Sequential([
            Input(shape=(1, X_s_train.shape[1])),
            LSTM(50, activation='relu'),
            Dense(32, activation='relu'),
            Dense(3) # 3 Outputs: Siruvani, Pilloor, Groundwater
        ])
        model_s.compile(optimizer='adam', loss='mse')
        model_s.fit(X_s_train_r, y_s_train, epochs=20, verbose=0)
        
        # Predict & Evaluate
        y_pred_s = model_s.predict(X_s_test_r, verbose=0)
        score_s = r2_score(y_s_test, y_pred_s)
        print(f"    - Supply Model Accuracy (R2): {score_s:.4f}")

        # Ops Model
        model_o = Sequential([
            Input(shape=(1, X_o_train.shape[1])),
            LSTM(50, activation='relu'),
            Dense(32, activation='relu'),
            Dense(2) # 2 Outputs: Hours, Pumping
        ])
        model_o.compile(optimizer='adam', loss='mse')
        model_o.fit(X_o_train_r, y_o_train, epochs=20, verbose=0)

        # Predict & Evaluate
        y_pred_o = model_o.predict(X_o_test_r, verbose=0)
        score_o = r2_score(y_o_test, y_pred_o)
        print(f"    - Operations Model Accuracy (R2): {score_o:.4f}")

    def get_dashboard_stats(self):
        # ... (Same as before) ...
        if self.df_resources.empty:
            return {}
        latest_week = self.df_resources.iloc[-1]

        # Demand by zone (average weekly demand)
        zone_dist = (
            self.df_zones.groupby('zone')['total_demand_mld']
            .mean()
            .reset_index()
            .to_dict('records')
        )

        # Weekly total supply
        weekly_trend = self.df_resources[['week_start', 'total_supply_mld']].copy()
        weekly_trend['week_start'] = weekly_trend['week_start'].dt.strftime('%Y-%m-%d')
        weekly_trend = weekly_trend.to_dict('records')

        # Supply by season
        season_supply = (
            self.df_resources.groupby('season')['total_supply_mld']
            .mean()
            .reset_index()
            .to_dict('records')
        )

        # Source mix over time
        source_mix = self.df_resources[
            ['week_start', 'siruvani_supply_mld', 'pilloor_supply_mld', 'groundwater_supply_mld']
        ].copy()
        source_mix['week_start'] = source_mix['week_start'].dt.strftime('%Y-%m-%d')
        source_mix = source_mix.to_dict('records')

        # Storage levels over time
        storage_trend = self.df_resources[
            ['week_start', 'siruvani_storage_pct', 'pilloor_storage_pct']
        ].copy()
        storage_trend['week_start'] = storage_trend['week_start'].dt.strftime('%Y-%m-%d')
        storage_trend = storage_trend.to_dict('records')

        # Zone reliability: average supply hours per day
        zone_reliability = (
            self.df_zones.groupby('zone')['supply_hours_per_day']
            .mean()
            .reset_index()
            .to_dict('records')
        )

        # Weekly metrics per zone (for zone-filtered charts)
        zone_weekly_metrics = (
            self.df_zones[
                ['week_start', 'zone', 'total_demand_mld', 'supply_hours_per_day']
            ]
            .copy()
        )
        zone_weekly_metrics['week_start'] = zone_weekly_metrics['week_start'].dt.strftime(
            '%Y-%m-%d'
        )
        zone_weekly_metrics = zone_weekly_metrics.to_dict('records')

        # Demand mix per zone (average sectoral demands)
        zone_demand_mix = (
            self.df_zones.groupby('zone')[
                ['residential_demand_mld', 'commercial_demand_mld', 'industrial_demand_mld']
            ]
            .mean()
            .reset_index()
            .to_dict('records')
        )

        # Scenario analytics from what-if analysis file
        scenario_efficiency = []
        status_summary = []
        if hasattr(self, "df_scenarios") and not self.df_scenarios.empty:
            scenario_efficiency = self.df_scenarios[
                ['scenario_id', 'week', 'allocation_efficiency_percent', 'supply_demand_gap_mld']
            ].to_dict('records')

            status_summary = (
                self.df_scenarios.groupby('system_status')
                .size()
                .reset_index(name='count')
                .to_dict('records')
            )

        return {
            "current_week_supply": float(latest_week['total_supply_mld']),
            "zone_distribution": zone_dist,
            "weekly_trend": weekly_trend,
            "season_supply": season_supply,
            "source_mix": source_mix,
            "storage_trend": storage_trend,
            "zone_reliability": zone_reliability,
            "zone_weekly_metrics": zone_weekly_metrics,
            "zone_demand_mix": zone_demand_mix,
            "scenario_efficiency": scenario_efficiency,
            "status_summary": status_summary,
        }

    def predict(self, input_data):
        # 1. Encode Inputs
        # MLD- Million Litres Per Day
        zone_name = str(input_data.get('zone', '') or '')

        try:
            season_code = self.le_season.transform([input_data['season']])[0]
        except ValueError:
            season_code = 0 

        try:
            priority_code = self.le_priority.transform([input_data['priority_level']])[0]
        except ValueError:
            priority_code = 0

        # 2. Prepare Raw Arrays (Must match training feature order)
        # Supply: ['temp_avg_c', 'avg_humidity_pct', 'rainfall_mm_week', 'water_demand_multiplier', 'season_encoded']
        supply_raw = np.array([[
            input_data['temp_avg_c'],
            50.0, # Default Humidity
            input_data['rainfall_mm'], 
            1.0,  # Default Multiplier
            season_code
        ]])
        
        # Operations: ['zone_encoded', 'population', 'residential_demand_mld',
        #              'commercial_demand_mld', 'industrial_demand_mld',
        #              'total_demand_mld', 'priority_encoded']
        total_demand = input_data['res_demand'] + input_data['com_demand'] + input_data['ind_demand']
        try:
            zone_code = self.le_zone.transform([zone_name])[0]
        except ValueError:
            zone_code = 0

        ops_raw = np.array([[
            zone_code,
            input_data['population'],
            input_data['res_demand'],
            input_data['com_demand'],
            input_data['ind_demand'],
            total_demand,
            priority_code
        ]])

        # 3. Scale Inputs
        supply_scaled = self.scaler_supply.transform(supply_raw)
        ops_scaled = self.scaler_ops.transform(ops_raw)

        # 4. Select appropriate model (zone-specific if available, otherwise global)
        if hasattr(self, "zone_supply_models") and zone_name in self.zone_supply_models:
            supply_model = self.zone_supply_models[zone_name]
            ops_model = self.zone_ops_models[zone_name]
            scores = self.zone_scores.get(zone_name, self.global_scores)
            model_scope = "zone"
        else:
            supply_model = self.global_rf_supply
            ops_model = self.global_rf_ops
            scores = self.global_scores
            model_scope = "global"

        supplies = supply_model.predict(supply_scaled)[0]
        ops = ops_model.predict(ops_scaled)[0]

        return {
            "zone": zone_name,
            "model_scope": model_scope,
            "supply_r2": round(scores["supply_r2"], 3),
            "ops_r2": round(scores["ops_r2"], 3),
            "siruvani_supply_mld": round(supplies[0], 2),
            "pilloor_supply_mld": round(supplies[1], 2),
            "groundwater_supply_mld": round(supplies[2], 2),
            "supply_hours_per_day": round(ops[0], 1),
            "pumping_capacity_mld": round(ops[1], 2),
        }
