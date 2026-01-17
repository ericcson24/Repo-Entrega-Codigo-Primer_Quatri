# 🧪 PHYSICS VALIDATION REPORT: BIOMASS
**Date:** 2026-01-17T12:40:17.510Z

This document contains detailed monthly breakdowns of the physics simulation logic.

## Scenario: Dry Pellets (Standard)
**Input Parameters:** `{"latitude":39,"longitude":-3,"capacity_kw":1000,"feedstock_type":"pellets","moisture_content":8,"calorific_value_dry":19}`

**Annual Generation:** 8,060,000 kWh

### Internal Physics Logs
```
Biomass: Feedstock=pellets, Moisture=8.0%
Combustion Physics: LHV adjusted for moisture. Dry: 19.0 MJ/kg -> Wet: 17.28 MJ/kg
Operation: Scheduled 701 hours of maintenance. Availability factor 0.92
Economics (Calc): To generate 8060.0 MWh, you need 6714.9 tons of pellets.
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Fuel Rate (kg/h) | Est Fuel Consumed (Tons) |
| --- | --- | --- | --- |
| Jan | 730000 | 833.1 | 608.2 |
| Feb | 730000 | 833.1 | 608.2 |
| Mar | 730000 | 833.1 | 608.2 |
| Apr | 730000 | 833.1 | 608.2 |
| May | 730000 | 833.1 | 608.2 |
| Jun | 380000 | 433.7 | 316.6 |
| Jul | 380000 | 433.7 | 316.6 |
| Aug | 730000 | 833.1 | 608.2 |
| Sep | 730000 | 833.1 | 608.2 |
| Oct | 730000 | 833.1 | 608.2 |
| Nov | 730000 | 833.1 | 608.2 |
| Dec | 730000 | 833.1 | 608.2 |

---

## Scenario: Wet Wood Chips (Low Efficiency)
**Input Parameters:** `{"latitude":39,"longitude":-3,"capacity_kw":1000,"feedstock_type":"chips","moisture_content":45,"calorific_value_dry":19}`

**Annual Generation:** 8,060,000 kWh

### Internal Physics Logs
```
Biomass: Feedstock=chips, Moisture=45.0%
Combustion Physics: LHV adjusted for moisture. Dry: 19.0 MJ/kg -> Wet: 9.35 MJ/kg
Operation: Scheduled 701 hours of maintenance. Availability factor 0.92
Economics (Calc): To generate 8060.0 MWh, you need 12412.4 tons of chips.
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Fuel Rate (kg/h) | Est Fuel Consumed (Tons) |
| --- | --- | --- | --- |
| Jan | 730000 | 1540.0 | 1124.2 |
| Feb | 730000 | 1540.0 | 1124.2 |
| Mar | 730000 | 1540.0 | 1124.2 |
| Apr | 730000 | 1540.0 | 1124.2 |
| May | 730000 | 1540.0 | 1124.2 |
| Jun | 380000 | 801.6 | 585.2 |
| Jul | 380000 | 801.6 | 585.2 |
| Aug | 730000 | 1540.0 | 1124.2 |
| Sep | 730000 | 1540.0 | 1124.2 |
| Oct | 730000 | 1540.0 | 1124.2 |
| Nov | 730000 | 1540.0 | 1124.2 |
| Dec | 730000 | 1540.0 | 1124.2 |

---

## Scenario: Heavy Maintenance Schedule
**Input Parameters:** `{"latitude":39,"longitude":-3,"capacity_kw":1000,"feedstock_type":"pellets","moisture_content":10,"availability_factor":0.7}`

**Annual Generation:** 6,132,000 kWh

### Internal Physics Logs
```
Biomass: Feedstock=pellets, Moisture=10.0%
Combustion Physics: LHV adjusted for moisture. Dry: 19.0 MJ/kg -> Wet: 16.86 MJ/kg
Operation: Scheduled 2628 hours of maintenance. Availability factor 0.7
Economics (Calc): To generate 6132.0 MWh, you need 5238.6 tons of pellets.
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Fuel Rate (kg/h) | Est Fuel Consumed (Tons) |
| --- | --- | --- | --- |
| Jan | 730000 | 854.3 | 623.6 |
| Feb | 730000 | 854.3 | 623.6 |
| Mar | 730000 | 854.3 | 623.6 |
| Apr | 730000 | 854.3 | 623.6 |
| May | 146000 | 170.9 | 124.7 |
| Jun | 0 | 0.0 | 0.0 |
| Jul | 0 | 0.0 | 0.0 |
| Aug | 146000 | 170.9 | 124.7 |
| Sep | 730000 | 854.3 | 623.6 |
| Oct | 730000 | 854.3 | 623.6 |
| Nov | 730000 | 854.3 | 623.6 |
| Dec | 730000 | 854.3 | 623.6 |

---

## Scenario: High Tech Plant (ORC Cycle)
**Input Parameters:** `{"latitude":39,"longitude":-3,"capacity_kw":1000,"feedstock_type":"pellets","moisture_content":10,"plant_efficiency":0.35}`

**Annual Generation:** 8,060,000 kWh

### Internal Physics Logs
```
Biomass: Feedstock=pellets, Moisture=10.0%
Combustion Physics: LHV adjusted for moisture. Dry: 19.0 MJ/kg -> Wet: 16.86 MJ/kg
Operation: Scheduled 701 hours of maintenance. Availability factor 0.92
Economics (Calc): To generate 8060.0 MWh, you need 4918.4 tons of pellets.
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Fuel Rate (kg/h) | Est Fuel Consumed (Tons) |
| --- | --- | --- | --- |
| Jan | 730000 | 610.2 | 445.5 |
| Feb | 730000 | 610.2 | 445.5 |
| Mar | 730000 | 610.2 | 445.5 |
| Apr | 730000 | 610.2 | 445.5 |
| May | 730000 | 610.2 | 445.5 |
| Jun | 380000 | 317.6 | 231.9 |
| Jul | 380000 | 317.6 | 231.9 |
| Aug | 730000 | 610.2 | 445.5 |
| Sep | 730000 | 610.2 | 445.5 |
| Oct | 730000 | 610.2 | 445.5 |
| Nov | 730000 | 610.2 | 445.5 |
| Dec | 730000 | 610.2 | 445.5 |

---

