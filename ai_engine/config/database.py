from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, UniqueConstraint, text
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
        # Determine SSL requirement based on Host
        connect_args = {}
        if "localhost" not in settings.DB_HOST and "timescaledb" not in settings.DB_HOST:
             # Basic SSL for Neon/Cloud
            connect_args = {"sslmode": "require"}

        self.engine = create_engine(
            settings.DATABASE_URL,
            connect_args=connect_args
        )
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
        
        # Using text() for SQLAlchemy 2.0 compatibility and binding params
        query = text("""
        SELECT count(*) 
        FROM weather_data 
        WHERE latitude = :lat AND longitude = :lon
        AND time >= :start_date AND time <= :end_date
        """)
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(query, {
                    "lat": lat, 
                    "lon": lon, 
                    "start_date": start_date, 
                    "end_date": end_date
                }).scalar()
                # 8760 hours in a year. 
                return result > 8000 # 90% threshold
        except Exception as e:
            # Table doesn't exist or connection error
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
            # Chunksize is important for network performance
            db_df.to_sql('weather_data', self.engine, if_exists='append', index=False, method='multi', chunksize=1000)
            print(f"Saved {len(db_df)} rows to weather_data for ({lat}, {lon})")
        except Exception as e:
            print(f"Error saving to DB (duplicate or constraint): {e}") 

    def load_weather_data(self, lat, lon, year):
        """
        Load from DB into DataFrame format expected by models.
        """
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        
        query = text("""
        SELECT * FROM weather_data 
        WHERE latitude = :lat AND longitude = :lon
        AND time >= :start_date AND time <= :end_date
        ORDER BY time ASC
        """)
        
        try:
            # pd.read_sql can take a connection and params in recent versions, 
            # but standard way with sqlalchemy engine is safer to bind manually or use params arg
            with self.engine.connect() as conn:
                 df = pd.read_sql(query, conn, params={
                    "lat": lat, 
                    "lon": lon, 
                    "start_date": start_date, 
                    "end_date": end_date
                 })
            
            if df.empty:
                return pd.DataFrame()

            # Remap back to internal naming
            out_df = pd.DataFrame()
            out_df['date'] = pd.to_datetime(df['time'])
            out_df['temperature'] = df['temperature_2m']
            out_df['radiation_ghi'] = df['radiation']
            out_df['wind_speed_10m'] = df['wind_speed_10m']
            out_df['wind_speed_100m'] = df.get('wind_speed_100m', 0) # Handle missing col if old schema
            out_df['precipitation'] = df['precipitation']
            if 'surface_pressure' in df:
                out_df['surface_pressure'] = df['surface_pressure']
            
            return out_df
        except Exception as e:
            print(f"Error reading from DB: {e}")
            return pd.DataFrame()

    def init_db_connection(self):
        if self.engine:
             return
             
        try:
            # Handle SSL for Cloud Databases (Neon, AWS RDS, etc)
            connect_args = {}
            if "localhost" not in settings.DB_HOST and "timescaledb" not in settings.DB_HOST:
                connect_args = {"sslmode": "require"}

            self.engine = create_engine(
                settings.DATABASE_URL, 
                pool_pre_ping=True, 
                pool_size=10, 
                max_overflow=20,
                connect_args=connect_args
            )
            # Not using global SessionLocal here, just instance Session
            self.Session = sessionmaker(bind=self.engine)
            print("Database connection initialized.")
        except Exception as e:
            print(f"Error initializing database connection: {e}")

db = DatabaseManager()