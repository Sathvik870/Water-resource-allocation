import pulp

class WaterOptimizer:
    def optimize_allocation(self, zone_data, total_supply_available):
        """
        Runs Linear Programming to determine optimal water allocation.
        
        Constraints:
        1. Allocation <= Demand
        2. Allocation <= Infrastructure Capacity (Effective Deliverable)
        3. Sum(Allocation) <= Total Supply
        """
        
        # Initialize LP Problem (Maximize Allocation/Satisfaction)
        prob = pulp.LpProblem("Water_Allocation_Optimization", pulp.LpMaximize)

        # Decision Variables: Allocation for each zone
        zones = zone_data['zone'].tolist()
        allocations = pulp.LpVariable.dicts("Allocated_MLD", zones, lowBound=0, cat='Continuous')

        # Priority Weights Mapping (High=3, Medium=2, Low=1)
        priority_map = {'High': 5, 'Medium': 3, 'Low': 1}
        
        # Objective Function: Maximize (Allocation * Priority Weight)
        prob += pulp.lpSum([
            allocations[row['zone']] * priority_map.get(row['priority_level'], 1) 
            for _, row in zone_data.iterrows()
        ])

        # Constraint 1: Supply Constraint
        prob += pulp.lpSum([allocations[z] for z in zones]) <= total_supply_available, "Total_Supply_Limit"

        # Zone-wise Constraints
        for _, row in zone_data.iterrows():
            z = row['zone']
            demand = row['total_demand_mld']
            infra_cap = row['effective_deliverable_capacity_mld']
            
            # Constraint 2: Demand Cap (Don't oversupply)
            prob += allocations[z] <= demand, f"Demand_Limit_{z}"
            
            # Constraint 3: Infrastructure Cap
            prob += allocations[z] <= infra_cap, f"Infra_Limit_{z}"

        # Solve
        prob.solve(pulp.PULP_CBC_CMD(msg=False))

        # Extract Results
        results = []
        for _, row in zone_data.iterrows():
            z = row['zone']
            allocated = allocations[z].varValue
            demand = row['total_demand_mld']
            deficit = demand - allocated
            status = "Optimal" if deficit < 1 else ("Critical" if deficit > (demand*0.2) else "Stressed")
            
            results.append({
                'zone': z,
                'demand': demand,
                'allocated': allocated,
                'deficit': deficit,
                'status': status
            })
            
        return results, pulp.LpStatus[prob.status]