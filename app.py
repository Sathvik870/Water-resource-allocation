import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from data_loader import DataLoader
from forecaster import DemandForecaster
from optimizer import WaterOptimizer

# --- Page Config ---
st.set_page_config(page_title="Coimbatore Water IDSS", layout="wide")
st.title("💧 Intelligent Decision Support System for Water Allocation")
st.markdown("**Coimbatore City Municipality | 2024 Analysis**")

# --- Initialize Modules ---
loader = DataLoader(data_dir='data')
datasets, error_msg = loader.load_data() 
optimizer = WaterOptimizer()

if datasets is None:
    st.error("🚨 Data Loading Failed")
    st.text(error_msg)  # This will print the exact reason on screen
    with st.expander("See expected filenames"):
        st.write(loader.files_map)
    st.stop()

# --- Sidebar Controls ---
st.sidebar.header("Control Panel")
tabs = st.tabs(["📊 Data Overview", "🔮 Demand Forecasting", "⚙️ Intelligent Allocation", "⚡ What-If Analysis"])

# --- TAB 1: DATA OVERVIEW ---
with tabs[0]:
    st.header("Dataset Explorer")
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Weekly Total Supply Trend")
        if 'supply' in datasets and not datasets['supply'].empty:
            fig_supply = px.line(datasets['supply'], x='week_start', y='total_supply_mld', title="Total Water Supply (MLD)")
            st.plotly_chart(fig_supply, use_container_width=True)
        else:
            st.warning("Supply data is missing.")
    
    with col2:
        st.subheader("Zone-wise Demand Distribution")
        if 'demand' in datasets and not datasets['demand'].empty:
            fig_demand = px.box(datasets['demand'], x='zone', y='total_demand_mld', title="Demand Variation by Zone")
            st.plotly_chart(fig_demand, use_container_width=True)
        else:
            st.warning("Demand data is missing.")

    st.subheader("Infrastructure Capacity vs Demand (Sample Week)")
    # Pick the first available week dynamically
    if 'demand' in datasets and not datasets['demand'].empty:
        sample_week = datasets['demand']['week_start'].iloc[0]
        merged_view, _ = loader.get_merged_week_data(sample_week, datasets)
        
        if not merged_view.empty:
            fig_infra = go.Figure(data=[
                go.Bar(name='Demand', x=merged_view['zone'], y=merged_view['total_demand_mld']),
                go.Bar(name='Pipeline Capacity', x=merged_view['zone'], y=merged_view['pipeline_capacity_mld'])
            ])
            fig_infra.update_layout(title=f"Infrastructure Constraints for {sample_week.date()}", barmode='group')
            st.plotly_chart(fig_infra, use_container_width=True)
        else:
            st.warning("Could not merge data for the sample week.")

# --- TAB 2: DEMAND FORECASTING ---
with tabs[1]:
    st.header("ML-Based Demand Forecasting")
    
    forecaster = DemandForecaster()
    # Check if necessary columns exist before training
    if 'demand' in datasets and 'weather' in datasets:
        training_data = forecaster.prepare_features(datasets['demand'], datasets['weather'])
        
        if st.button("Train Forecasting Model (XGBoost)"):
            metrics, y_test, preds = forecaster.train(training_data)
            col1, col2 = st.columns(2)
            col1.metric("Model MAE", f"{metrics['MAE']:.2f}")
            col2.metric("Model RMSE", f"{metrics['RMSE']:.2f}")
            
            # Plot Actual vs Predicted
            fig_pred = go.Figure()
            fig_pred.add_trace(go.Scatter(y=y_test.values[:50], mode='lines', name='Actual'))
            fig_pred.add_trace(go.Scatter(y=preds[:50], mode='lines+markers', name='Predicted'))
            fig_pred.update_layout(title="Actual vs Predicted Demand (Validation Set Subset)")
            st.plotly_chart(fig_pred, use_container_width=True)
            st.success("Model Trained Successfully!")
    else:
        st.error("Required datasets for forecasting are missing.")

# --- TAB 3: INTELLIGENT ALLOCATION ---
with tabs[2]:
    st.header("Optimization Engine")
    
    if 'demand' in datasets and not datasets['demand'].empty:
        # Date Selection
        available_dates = datasets['demand']['week_start'].dt.date.unique()
        selected_date = st.selectbox("Select Week for Allocation:", available_dates)
        
        # Convert date back to datetime for filtering
        selected_datetime = pd.to_datetime(selected_date)
        
        merged_data, total_supply = loader.get_merged_week_data(selected_datetime, datasets)
        
        st.markdown(f"### Supply Available: **{total_supply:.2f} MLD**")
        
        if st.button("Run Optimizer"):
            if not merged_data.empty:
                results, status = optimizer.optimize_allocation(merged_data, total_supply)
                res_df = pd.DataFrame(results)
                
                # KPI Cards
                c1, c2, c3 = st.columns(3)
                total_alloc = res_df['allocated'].sum()
                total_deficit = res_df['deficit'].sum()
                # Avoid division by zero
                efficiency = (total_alloc / total_supply * 100) if total_supply > 0 else 0
                
                c1.metric("Total Allocated", f"{total_alloc:.2f} MLD")
                c2.metric("Total Deficit", f"{total_deficit:.2f} MLD", delta_color="inverse")
                c3.metric("Utilization Efficiency", f"{efficiency:.1f}%")
                
                # Detailed Table
                st.dataframe(res_df.style.map(
                    lambda x: 'background-color: #ffcdd2' if x == 'Critical' else ('background-color: #fff9c4' if x == 'Stressed' else ''),
                    subset=['status']
                ))
                
                # Visualization
                fig_alloc = go.Figure(data=[
                    go.Bar(name='Demand', x=res_df['zone'], y=res_df['demand']),
                    go.Bar(name='Allocated (Optimized)', x=res_df['zone'], y=res_df['allocated'])
                ])
                fig_alloc.update_layout(title="Optimized Allocation vs Demand", barmode='group')
                st.plotly_chart(fig_alloc, use_container_width=True)
            else:
                st.error("No data found for the selected week. Please check your data files.")
    else:
        st.error("Demand data is not loaded.")

# --- TAB 4: WHAT-IF SCENARIOS ---
with tabs[3]:
    st.header("Scenario Simulation")
    
    # Controls for What-If
    col1, col2 = st.columns(2)
    supply_modifier = col1.slider("Supply Adjustment (%)", -50, 50, 0)
    demand_growth = col2.slider("Demand Growth (%)", 0, 50, 0)
    
    if 'demand' in datasets and not datasets['demand'].empty:
        # FIX: Dynamically pick a valid week from the dataset (Middle of the year)
        unique_weeks = datasets['demand']['week_start'].sort_values().unique()
        if len(unique_weeks) > 0:
            peak_week = unique_weeks[len(unique_weeks) // 2] # Pick middle week
            
            base_data, base_supply = loader.get_merged_week_data(peak_week, datasets)
            
            if not base_data.empty:
                # Apply Modifiers
                mod_supply = base_supply * (1 + supply_modifier/100)
                mod_data = base_data.copy()
                
                # Ensure the column exists before multiplying
                if 'total_demand_mld' in mod_data.columns:
                    mod_data['total_demand_mld'] = mod_data['total_demand_mld'] * (1 + demand_growth/100)
                    
                    st.markdown("---")
                    st.markdown(f"**Simulated Scenario ({peak_week.date()}):** Supply: {mod_supply:.2f} MLD | Demand Growth: {demand_growth}%")
                    
                    # Run Optimization on Scenario
                    sim_results, _ = optimizer.optimize_allocation(mod_data, mod_supply)
                    sim_df = pd.DataFrame(sim_results)
                    
                    # Visualization
                    fig_sim = px.bar(sim_df, x='zone', y=['demand', 'allocated'], barmode='group',
                                     title="Scenario Allocation Outcome")
                    st.plotly_chart(fig_sim, use_container_width=True)
                    
                    # Equity & Metrics
                    total_unmet = sim_df['deficit'].sum()
                    st.warning(f"Projected Unmet Demand in this Scenario: {total_unmet:.2f} MLD")
                else:
                    st.error("Column 'total_demand_mld' missing in merged data.")
            else:
                st.error(f"Could not load base data for week: {peak_week}")
        else:
            st.error("No valid weeks found in demand dataset.")
    else:
        st.error("Demand dataset is missing or empty.")