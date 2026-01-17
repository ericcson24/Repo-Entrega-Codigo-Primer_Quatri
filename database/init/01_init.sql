-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Project Management
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    technology VARCHAR(50) NOT NULL, -- 'solar', 'wind', 'hydro', 'biomass'
    location_lat DECIMAL(10, 6) NOT NULL,
    location_lon DECIMAL(10, 6) NOT NULL,
    capacity_kw DECIMAL(10, 2) NOT NULL,
    budget DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parameters JSONB -- Specific params (panels, turbine height, etc.)
);

-- 2. Weather Data (Hypertable)
CREATE TABLE IF NOT EXISTS weather_data (
    time TIMESTAMP NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    temperature_2m DECIMAL(5, 2), -- Celsius
    radiation DECIMAL(10, 2), -- W/m2 (GHI or DNI depending on column interpretation, usually GHI here)
    wind_speed_10m DECIMAL(5, 2), -- m/s
    wind_speed_100m DECIMAL(5, 2), -- m/s
    precipitation DECIMAL(10, 2), -- mm
    surface_pressure DECIMAL(10, 2), -- hPa (Added for Density Correction)
    UNIQUE (time, latitude, longitude)
);

-- Convert to hypertable partitioned by time
SELECT create_hypertable('weather_data', 'time', if_not_exists => TRUE);

-- 3. Electricity Prices (Hypertable)
CREATE TABLE IF NOT EXISTS prices_hourly (
    time TIMESTAMP NOT NULL,
    price_eur_mwh DECIMAL(10, 2) NOT NULL,
    source VARCHAR(50) DEFAULT 'OMIE', -- 'OMIE', 'PREDICTION', etc.
    UNIQUE (time, source)
);

SELECT create_hypertable('prices_hourly', 'time', if_not_exists => TRUE);

-- 4. Biomass Prices (Time Series)
CREATE TABLE IF NOT EXISTS biomass_prices (
    time TIMESTAMP NOT NULL,
    fuel_type VARCHAR(50) NOT NULL, -- 'pellets', 'chips', 'olive_pit'
    price_eur_ton DECIMAL(10, 2) NOT NULL,
    UNIQUE (time, fuel_type)
);

SELECT create_hypertable('biomass_prices', 'time', if_not_exists => TRUE);
