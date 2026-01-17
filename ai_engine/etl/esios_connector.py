import requests
import pandas as pd
import os
from datetime import datetime
from config.settings import settings

class EsiosConnector:
    def __init__(self):
        self.token = settings.ESIOS_TOKEN
        self.base_url = settings.ESIOS_URL
        
    def fetch_prices(self, start_date, end_date):
        """
        Fetch prices between start_date and end_date.
        Dates format: YYYY-MM-DD
        """
        headers = {
            "Accept": "application/json; application/vnd.esios-api-v1+json",
            "Content-Type": "application/json",
            "x-api-key": self.token
        }
        
        # ESIOS format usually requires iteration or specific params. 
        # For simplicity in this step, we construct a request.
        # Note: ESIOS limits might apply.
        
        # Example URL for specific date range
        url = f"{self.base_url}?start_date={start_date}T00:00:00&end_date={end_date}T23:59:59&time_trunc=hour"
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            values = data.get('indicator', {}).get('values', [])
            
            df_data = []
            for item in values:
                df_data.append({
                    "time": item['datetime'],
                    "price": item['value'], # EUR/MWh usually
                    "geo_id": item['geo_id'] # Peninsula, Canarias, etc.
                })
                
            df = pd.DataFrame(df_data)
            if not df.empty:
                df['time'] = pd.to_datetime(df['time'])
                df['price'] = df['price'].astype(float)
                
            return df
            
        except Exception as e:
            print(f"Error fetching ESIOS data: {e}")
            return pd.DataFrame()

if __name__ == "__main__":
    connector = EsiosConnector()
    # Note: Will fail without Valid Token
    # df = connector.fetch_prices("2023-01-01", "2023-01-02")
    # print(df)
