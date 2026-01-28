import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

class DemandForecaster:
    def __init__(self):
        self.model = XGBRegressor(n_estimators=100, learning_rate=0.1)
        self.features = ['population', 'rainfall_mm_week', 'temp_avg_c', 'season_code']
        self.target = 'total_demand_mld'

    def prepare_features(self, demand_df, weather_df):
        """Merges demand and weather for training."""
        df = pd.merge(demand_df, weather_df, on='week_start', how='inner')
        
        # Encode Season
        df['season_code'] = df['season'].astype('category').cat.codes
        return df

    def train(self, df):
        """Trains the forecasting model."""
        X = df[self.features]
        y = df[self.target]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.model.fit(X_train, y_train)
        
        preds = self.model.predict(X_test)
        metrics = {
            'MAE': mean_absolute_error(y_test, preds),
            'RMSE': np.sqrt(mean_squared_error(y_test, preds))
        }
        return metrics, y_test, preds

    def predict(self, population, rainfall, temp, season_code):
        """Predicts demand for new inputs."""
        input_data = pd.DataFrame([[population, rainfall, temp, season_code]], columns=self.features)
        return self.model.predict(input_data)[0]