from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base
from config.settings import settings
import pandas as pd
from datetime import datetime

Base = declarative_base()

# Define Weather Table Model (Matching init.sql roughly but via ORM)
class WeatherData(Base):
    __tablename__ = 'weather_data'
    
    # Composite PK logically, but SQLAlchemy likes a PK. 
    # Hypertable in raw SQL handles it, but here we can just map.
    # We won't use auto-id for hypertable ideal, but let's stick to simple mapping.
    # Actually, for bulk inserts into Timescale, standard SQL/Pandas is faster than ORM objects.
    # We will use this class primarily for checking existence or reading if needed.
    
    time = Column(DateTime, primary_key=True)
    latitude = Column(Float, primary_key=True)
    longitude = Column(Float, primary_key=True)
    temperature_2m = Column(Float)
    radiation = Column(Float) # GHI
    wind_speed_10m = Column(Float)
    wind_speed_100m = Column(Float)
    precipitation = Column(Float)
    # Extras
    surface_pressure = Column(Float, nullable=True)

class DatabaseManager:
    def __init__(self):
        self.engine = create_engine(settings.DATABASE_URL)
        self.Session = sessionmaker(bind=self.engine)

    def get_session(self):
        return self.Session()

    def check_weather_exists(self, lat, lon, year):
        """
        Check if we have >90% of data for a given location and year.
        Simple query: count rows.
        """
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59)
        
        # Rounding coords to avoid precision mismatch? 
        # Better: use range. But for now exact match as loaded.
        
        query = f"""
        SELECT count(*) 
        FROM weather_data 
        WHERE latitude = {lat} AND longitude = {lon}
        AND time >= '{start_date}' AND time <= '{end_date}'
        """
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(query).scalar()
                # 8760 hours in a year. 
                return result > 8000 # 90% threshold
        except Exception as e:
            print(f"DB Check Error (Table might not exist yet): {e}")
            return False

    def save_weather_data(self, df, lat, lon):
        """
        Bulk save dataframe to DB.
        Expects df to have standard columns.
        """
        # Map DF columns to Table columns
        # DF has: date, temperature, precipitation, wind_speed_10m...
        
        # Prepare for DB
        db_df = pd.DataFrame()
        db_df['time'] = df['date']
        db_df['latitude'] = lat
        db_df['longitude'] = lon
        db_df['temperature_2m'] = df.get('temperature')
        db_df['radiation'] = df.get('radiation_ghi')
        db_df['wind_speed_10m'] = df.get('wind_speed_10m')
        db_df['wind_speed_100m'] = df.get('wind_speed_100m')
        db_df['precipitation'] = df.get('precipitation')
        if 'surface_pressure' in df:
            db_df['surface_pressure'] = df['surface_pressure']
            
        # Write to SQL
        try:
            db_df.to_sql('weather_data', self.engine, if_exists='append', index=False, method='multi', chunksize=1000)
            print(f"Saved {len(db_df)} rows to weather_data for ({lat}, {lon})")
        except Exception as e:
            print(f"Error saving to DB: {e}") 
            # Often dupes if partial data exists. 'append' fails on constraint.
            # In TFG, we might want to just pass or use upsert logic (complex in pandas).

    def load_weather_data(self, lat, lon, year):
        """
        Load from DB into DataFrame format expected by models.
        """
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        
        query = f"""
        SELECT * FROM weather_data 
        WHERE latitude = {lat} AND longitude = {lon}
        AND time >= '{start_date}' AND time <= '{end_date}'
        ORDER BY time ASC
        """
        
        try:
            df = pd.read_sql(query, self.engine)
            
            # Remap back to internal naming
            out_df = pd.DataFrame()
            out_df['date'] = pd.to_datetime(df['time'])
            out_df['temperature'] = df['temperature_2m']
            out_df['radiation_ghi'] = df['radiation']
            out_df['wind_speed_10m'] = df['wind_speed_10m']
            out_df['wind_speed_100m'] = df['wind_speed_100m']
            out_df['precipitation'] = df['precipitation']
            if 'surface_pressure' in df:
                out_df['surface_pressure'] = df['surface_pressure']
            
            return out_df
        except Exception as e:
            print(f"Error reading from DB: {e}")
            return pd.DataFrame()

db = DatabaseManager()
