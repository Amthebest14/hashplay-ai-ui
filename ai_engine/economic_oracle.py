import requests
import json
import numpy as np
import time
from sklearn.linear_model import LinearRegression

# ---------------------------------------------------------
# Hashplay AI: Off-Chain Economic Oracle (v1.0)
# ---------------------------------------------------------
# This script monitors the Hedera Mainnet Mirror Node to
# analyze wager velocity and dynamically calculate the 
# optimal XP Mining Multiplier using predictive modeling.
#
# MISSION: To ensure long-term economic sustainability by
# dynamically adjusting the difficulty of 'Mining' XP based 
# on real-time on-chain game velocity.
# ---------------------------------------------------------

# Contract ID for Hashplay Arena V5.2
CONTRACT_ID = "0.0.10420650"
MIRROR_NODE_URL = f"https://mainnet-public.mirrornode.hedera.com/api/v1/contracts/{CONTRACT_ID}/results"

def fetch_recent_metrics():
    """Fetches the latest smart contract call results from the Mirror Node."""
    print(f"[SYSTEM] Connecting to Hedera Mainnet Mirror Node ({CONTRACT_ID})...")
    try:
        # Fetch last 50 transactions to analyze velocity
        response = requests.get(MIRROR_NODE_URL, params={"limit": 50, "order": "desc"})
        if response.status_code == 200:
            data = response.json().get('results', [])
            print(f"[SYSTEM] Successfully ingested {len(data)} on-chain events.")
            return data
        else:
            print(f"[ERROR] Mirror Node returned status: {response.status_code}")
            return []
    except Exception as e:
        print(f"[ERROR] Failed to connect to Hedera Network: {e}")
        return []

def run_economic_inference(wager_data):
    """
    Runs a lightweight Scikit-Learn predictive model to forecast
    economic inflation and recommend a mining multiplier.
    """
    if not wager_data or len(wager_data) < 5:
        print("[AI ENGINE] Insufficient historical data for accurate inference. Returning baseline.")
        return 1.50

    print("[AI ENGINE] Initializing Linear Regression inference...")

    # Data Feature Extraction: 
    # Use 'gas_used' as a proxy for computational complexity/load
    # Use timestamp deltas to measure 'Wager Velocity'
    gas_usage = []
    timestamps = []
    
    for tx in wager_data:
        gas_usage.append(int(tx.get('gas_used', 55000)))
        timestamps.append(float(tx.get('timestamp', time.time())))

    # Convert to NumPy arrays for modeling
    X = np.array(range(len(gas_usage))).reshape(-1, 1) # Time steps
    y = np.array(gas_usage).reshape(-1, 1)            # Gas load

    # Train the predictive model
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict the load for the 'Next Wave' (10 transactions out)
    future_index = np.array([[len(gas_usage) + 10]])
    predicted_load = model.predict(future_index)[0][0]

    # Calculate Velocity Heat (How fast are people wagering?)
    time_span = max(timestamps) - min(timestamps)
    wagers_per_minute = (len(wager_data) / (time_span / 60)) if time_span > 0 else 0
    
    print(f"[AI ENGINE] Current Velocity: {wagers_per_minute:.2f} wagers/min")
    print(f"[AI ENGINE] Predicted Load Trajectory: {predicted_load:.0f} gas units")

    # LOGIC:
    # If velocity is high (> 2 wagers/min) or predicted load is rising,
    # we lower the multiplier to prevent XP hyper-inflation.
    base_multiplier = 1.50
    inflation_adjustment = 0.0
    
    if wagers_per_minute > 2.0:
        inflation_adjustment -= 0.2
        print("[DECISION] High velocity detected. Deflationary measures recommended.")
    
    if predicted_load > 60000:
        inflation_adjustment -= 0.1
        print("[DECISION] High network stress predicted. Reducing mining yield.")

    final_multiplier = max(1.0, min(2.5, base_multiplier + inflation_adjustment))
    
    return round(final_multiplier, 2)

if __name__ == "__main__":
    print("-" * 50)
    print(" HASHPLAY AI - MINING ENGINE ORACLE (Demo)")
    print("-" * 50)
    
    wagers = fetch_recent_metrics()
    recommendation = run_economic_inference(wagers)
    
    print("\n" + "=" * 50)
    print(f" RECOMMENDED XP MULTIPLIER: {recommendation}x")
    print("=" * 50)
    print("[INFO] This inference is utilized by platform administrators to")
    print("[INFO] maintain the equilibrium of the Hashplay XP economy.")
    print("-" * 50)
