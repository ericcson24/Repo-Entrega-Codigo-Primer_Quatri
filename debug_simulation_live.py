
import requests
import json
import time

URL = "http://localhost:8000/predict/"

def test_simulation(tech, payload):
    print(f"\n--- Testing {tech.upper()} Simulation ---")
    try:
        start = time.time()
        response = requests.post(URL + tech, json=payload)
        duration = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success ({duration:.2f}s)")
            print(f"Annual Generation: {data.get('total_annual_generation_kwh', 0):,.2f} kWh")
            
            # Analyze Monthly
            monthly = data.get('monthly_generation_kwh', {})
            print("Monthly Sample:", list(monthly.values())[:3], "...")
            
            annual_sum = sum(monthly.values())
            print(f"Sum of Monthly: {annual_sum:,.2f} kWh (Check vs Annual)")
            
            # Analyze Hourly
            hourly = data.get('hourly_generation_kwh', [])
            print(f"Hourly Count: {len(hourly)}")
            print("Hourly Sample:", hourly[:10], "...")
            
        else:
            print(f"❌ Failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Solar Payload (Standard 1MW Plant in Madrid)
    test_simulation("solar", {
        "latitude": 40.4168,
        "longitude": -3.7038,
        "capacity_kw": 1000,
        "project_type": "solar",
        "parameters": {
            "tilt": 30,
            "azimuth": 180,
            "system_loss": 0.14
        }
    })
    
    # Wind Payload
    test_simulation("wind", {
        "latitude": 40.4168,
        "longitude": -3.7038,
        "capacity_kw": 2000,
        "parameters": {
            "hub_height": 80
        }
    })
