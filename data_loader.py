import pandas as pd
import os
from datetime import timedelta

class DataLoader:
    def __init__(self, data_dir='data'):
        self.data_dir = data_dir
        # Define the exact filenames expected
        self.files_map = {
            'supply': 'coimbatore_water_supply_weekly_2024.csv',
            'demand': 'coimbatore_zonewise_water_demand_weekly_2024.csv',
            'weather': 'coimbatore_weather_rainfall_weekly_2024.csv',
            'rules': 'coimbatore_allocation_rules_weekly_2024_realistic.csv',
            'infra': 'coimbatore_infrastructure_capacity_weekly_2024.csv',
            'what_if': 'coimbatore_what_if_analysis_weekly_2024.csv'
        }

    def load_data(self):
        """Loads all CSVs with specific handling for the What-If dataset."""
        loaded_data = {}
        
        # 1. Check if folder exists
        if not os.path.exists(self.data_dir):
            return None, f"❌ Folder not found: '{self.data_dir}'."

        for key, filename in self.files_map.items():
            filepath = os.path.join(self.data_dir, filename)
            
            # 2. Check if file exists
            if not os.path.exists(filepath):
                return None, f"❌ Missing file: '{filename}'"
            
            try:
                df = pd.read_csv(filepath)
                
                # --- SPECIAL HANDLING FOR WHAT-IF DATASET ---
                if key == 'what_if':
                    # This file has 'week' (1-52) instead of 'week_start'
                    if 'week' in df.columns and 'week_start' not in df.columns:
                        # Convert Week Number to Date (assuming start of 2024)
                        start_date = pd.to_datetime("2024-01-01")
                        # (Week - 1) * 7 days added to Jan 1st
                        df['week_start'] = start_date + pd.to_timedelta((df['week'] - 1) * 7, unit='D')
                    
                    loaded_data[key] = df
                    continue # Skip the standard date parsing below for this file

                # --- STANDARD DATE PARSING FOR OTHER FILES ---
                date_col = 'week_start' if 'week_start' in df.columns else df.columns[0]
                
                # Parse dates
                df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
                
                # Check for failure
                if df[date_col].isna().all():
                     return None, f"❌ Date parsing failed for '{filename}'. Column '{date_col}'."

                df = df.dropna(subset=[date_col])

                # Rename to standard 'week_start'
                if date_col != 'week_start':
                    df.rename(columns={date_col: 'week_start'}, inplace=True)
                    
                loaded_data[key] = df
                
            except Exception as e:
                return None, f"❌ Error reading '{filename}': {str(e)}"

        return loaded_data, None

    def get_merged_week_data(self, week_date, datasets):
        """Prepares a unified dataset for a specific week."""
        if datasets is None: return None, 0
        
        try:
            # Ensure week_date is timestamp
            week_date = pd.to_datetime(week_date)

            d_week = datasets['demand'][datasets['demand']['week_start'] == week_date]
            s_week = datasets['supply'][datasets['supply']['week_start'] == week_date]
            r_week = datasets['rules'][datasets['rules']['week_start'] == week_date]
            i_week = datasets['infra'][datasets['infra']['week_start'] == week_date]

            if d_week.empty:
                return pd.DataFrame(), 0

            # Merge Strategy: Demand -> Rules -> Infra
            merged = d_week.merge(r_week, on=['week_start', 'zone'], how='left')
            merged = merged.merge(i_week, on=['week_start', 'zone'], how='left')
            
            total_supply = s_week['total_supply_mld'].values[0] if not s_week.empty else 0
            
            return merged, total_supply
        except Exception as e:
            print(f"Error merging data: {e}")
            return pd.DataFrame(), 0