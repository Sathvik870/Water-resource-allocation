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

        # --- Prepare Operations Data ---
        features_ops = ['population', 'residential_demand_mld', 'commercial_demand_mld', 
                        'industrial_demand_mld', 'total_demand_mld', 'priority_level']
        self.X_ops_raw = self.merged_df[features_ops].copy()
        
        # Encode Priority
        self.X_ops_raw['priority_encoded'] = self.le_priority.fit_transform(self.X_ops_raw['priority_level'].astype(str))
        self.X_ops_raw = self.X_ops_raw.drop(columns=['priority_level'])

        # Scale Data
        self.X_ops_scaled = self.scaler_ops.fit_transform(self.X_ops_raw)
        self.y_ops = self.merged_df[['supply_hours_per_day', 'pumping_capacity_mld']].values

    def _train_models(self):
        print("\n--- Training Models ---")
        
        # Split Data for Validation
        X_supp_train, X_supp_test, y_supp_train, y_supp_test = train_test_split(self.X_supply_scaled, self.y_supply, test_size=0.2, random_state=42)
        X_ops_train, X_ops_test, y_ops_train, y_ops_test = train_test_split(self.X_ops_scaled, self.y_ops, test_size=0.2, random_state=42)

        # 1. Random Forest
        self.rf_supply, self.rf_ops = self._train_random_forest(X_supp_train, y_supp_train, X_supp_test, y_supp_test, 
                                                                X_ops_train, y_ops_train, X_ops_test, y_ops_test)

        # 2. XGBoost
        self._train_xgboost(X_supp_train, y_supp_train, X_supp_test, y_supp_test, 
                            X_ops_train, y_ops_train, X_ops_test, y_ops_test)

        # 3. LSTM
        self._train_lstm(X_supp_train, y_supp_train, X_supp_test, y_supp_test, 
                         X_ops_train, y_ops_train, X_ops_test, y_ops_test)

        # Set ACTIVE model for the dashboard (Using Random Forest for stability on small tabular data)
        self.active_supply_model = self.rf_supply
        self.active_ops_model = self.rf_ops
        print(">>> System Active Model: Random Forest (Selected for stability)")

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
        zone_dist = self.df_zones.groupby('zone')['total_demand_mld'].mean().reset_index().to_dict('records')
        weekly_trend = self.df_resources[['week_start', 'total_supply_mld']].copy()
        weekly_trend['week_start'] = weekly_trend['week_start'].dt.strftime('%Y-%m-%d')
        weekly_trend = weekly_trend.to_dict('records')
        season_supply = self.df_resources.groupby('season')['total_supply_mld'].mean().reset_index().to_dict('records')
        pop_trend = self.df_zones.groupby('week_start')['population'].sum().reset_index()
        pop_trend['week_start'] = pop_trend['week_start'].dt.strftime('%Y-%m-%d')
        pop_trend = pop_trend.to_dict('records')

        return {
            "current_week_supply": float(latest_week['total_supply_mld']),
            "zone_distribution": zone_dist,
            "weekly_trend": weekly_trend,
            "season_supply": season_supply,
            "population_trend": pop_trend
        }

    def predict(self, input_data):
        # 1. Encode Inputs
        # MLD- Million Litres Per Day
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
        
        # Operations: ['population', 'residential_demand_mld', 'commercial_demand_mld', 'industrial_demand_mld', 'total_demand_mld', 'priority_encoded']
        total_demand = input_data['res_demand'] + input_data['com_demand'] + input_data['ind_demand']
        ops_raw = np.array([[
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

        # 4. Predict (Using Active Model - RF)
        supplies = self.active_supply_model.predict(supply_scaled)[0]
        ops = self.active_ops_model.predict(ops_scaled)[0]

        return {
            "siruvani_supply_mld": round(supplies[0], 2),
            "pilloor_supply_mld": round(supplies[1], 2),
            "groundwater_supply_mld": round(supplies[2], 2),
            "supply_hours_per_day": round(ops[0], 1),
            "pumping_capacity_mld": round(ops[1], 2)
        }
