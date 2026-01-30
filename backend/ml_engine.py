import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

class WaterPredictor:
    def __init__(self):
        # Load Data
        try:
            self.df_resources = pd.read_csv("data/water resources data.csv")
            self.df_zones = pd.read_csv("data/zone wise weekly datas.csv")
            self.df_whatif = pd.read_csv("data/coimbatore_what_if_analysis_weekly_2024.csv")
        except FileNotFoundError as e:
            print(f"Error loading files: {e}")
            raise

        # Preprocessing & Merging
        # Convert dates
        self.df_zones['week_start'] = pd.to_datetime(self.df_zones['week_start'], dayfirst=True)
        self.df_resources['week_start'] = pd.to_datetime(self.df_resources['week_start'], dayfirst=True)
        
        # Merge datasets
        self.merged_df = pd.merge(self.df_zones, self.df_resources, on="week_start", how="left")
        self.merged_df = self.merged_df.fillna(0) # Handle missing values

        self._train_models()

    def _train_models(self):
        # --- Model 1: Resource Supply ---
        # 1. Select relevant features and make a COPY to avoid SettingWithCopyWarning
        features_supply = ['temp_avg_c', 'avg_humidity_pct', 'rainfall_mm_week', 'water_demand_multiplier', 'season']
        X_supply = self.merged_df[features_supply].copy()
        
        # 2. Encode 'season'
        self.le_season = LabelEncoder()
        # Fit on all unique seasons to ensure we know them all
        X_supply['season_encoded'] = self.le_season.fit_transform(X_supply['season'].astype(str))
        
        # 3. DROP the text column so the model only sees numbers
        X_supply = X_supply.drop(columns=['season'])
        
        y_supply = self.merged_df[['siruvani_supply_mld', 'pilloor_supply_mld', 'groundwater_supply_mld']]
        
        self.supply_model = RandomForestRegressor(n_estimators=50, random_state=42)
        self.supply_model.fit(X_supply, y_supply)

        # --- Model 2: Operations (Hours, Pumping) ---
        # 1. Select features and make a COPY
        features_ops = ['population', 'residential_demand_mld', 'commercial_demand_mld', 
                        'industrial_demand_mld', 'total_demand_mld', 'priority_level']
        X_ops = self.merged_df[features_ops].copy()
        
        # 2. Encode 'priority_level'
        self.le_priority = LabelEncoder()
        X_ops['priority_encoded'] = self.le_priority.fit_transform(X_ops['priority_level'].astype(str))

        # 3. DROP the text column
        X_ops = X_ops.drop(columns=['priority_level'])

        y_ops = self.merged_df[['supply_hours_per_day', 'pumping_capacity_mld']]

        self.ops_model = RandomForestRegressor(n_estimators=50, random_state=42)
        self.ops_model.fit(X_ops, y_ops)

    def get_dashboard_stats(self):
        # Aggregate data for dashboard
        if self.df_resources.empty:
            return {}
            
        latest_week = self.df_resources.iloc[-1]
        
        # Zone Distribution
        zone_dist = self.df_zones.groupby('zone')['total_demand_mld'].mean().reset_index().to_dict('records')
        
        # Weekly Trend (Convert timestamp to string for JSON)
        weekly_trend = self.df_resources[['week_start', 'total_supply_mld']].copy()
        weekly_trend['week_start'] = weekly_trend['week_start'].dt.strftime('%Y-%m-%d')
        weekly_trend = weekly_trend.to_dict('records')

        # Season Supply
        season_supply = self.df_resources.groupby('season')['total_supply_mld'].mean().reset_index().to_dict('records')
        
        # Population Trend
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
        # 1. Handle Categorical Encoding safely
        try:
            season_code = self.le_season.transform([input_data['season']])[0]
        except ValueError:
            # If season input is not in training data, default to first class
            season_code = 0 

        try:
            priority_code = self.le_priority.transform([input_data['priority_level']])[0]
        except ValueError:
            priority_code = 0

        # 2. Prepare Input Arrays
        # MUST MATCH ORDER: ['temp_avg_c', 'avg_humidity_pct', 'rainfall_mm_week', 'water_demand_multiplier', 'season_encoded']
        supply_features = [[
            input_data['temp_avg_c'],
            50.0, # Default Humidity
            input_data['rainfall_mm'], 
            1.0,  # Default Multiplier
            season_code
        ]]
        
        supplies = self.supply_model.predict(supply_features)[0]

        # Calculate total demand dynamically
        total_demand = input_data['res_demand'] + input_data['com_demand'] + input_data['ind_demand']

        # MUST MATCH ORDER: ['population', 'residential_demand_mld', 'commercial_demand_mld', 'industrial_demand_mld', 'total_demand_mld', 'priority_encoded']
        ops_features = [[
            input_data['population'],
            input_data['res_demand'],
            input_data['com_demand'],
            input_data['ind_demand'],
            total_demand,
            priority_code
        ]]

        ops = self.ops_model.predict(ops_features)[0]

        return {
            "siruvani_supply_mld": round(supplies[0], 2),
            "pilloor_supply_mld": round(supplies[1], 2),
            "groundwater_supply_mld": round(supplies[2], 2),
            "supply_hours_per_day": round(ops[0], 1),
            "pumping_capacity_mld": round(ops[1], 2)
        }