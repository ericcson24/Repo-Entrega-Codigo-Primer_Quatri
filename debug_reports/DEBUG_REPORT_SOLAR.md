# 🧪 PHYSICS VALIDATION REPORT: SOLAR
**Date:** 2026-01-17T12:40:16.751Z

This document contains detailed monthly breakdowns of the physics simulation logic.

## Scenario: Optimal Conditions (Madrid, South, New)
**Input Parameters:** `{"latitude":40.41,"longitude":-3.7,"capacity_kw":100,"tilt":35,"azimuth":180,"years_operation":0,"soiling_loss":0.02}`

**Annual Generation:** 197,063 kWh

### Internal Physics Logs
```
Initialization: Lat=40.41, Lon=-3.7, Capacity=100.0kW
Geometry: Solar Position calculated for 8760 hours using NREL SPA algorithm.
Irradiance: Clear Sky GHI prepared. Yearly Max: 938.1 W/m2, Avg: 219.6 W/m2
Transposition: Hay-Davies Model applied. POA Global Avg: 268.2 W/m2. Optical Gain: 22.1%
Thermal: Faiman Model (U0=25.0, U1=6.84). Avg Cell Temp: 23.4 C
Losses: Step-by-step breakdown for Year 0
  - Soiling: 2.0%
  - Mismatch: 2.0%
  - LID: 1.5%
  - Cabling: 1.4000000000000001%
  - Ageing Factor: 1.0000 (Year 0)
  - Total Performance Ratio (PR) Impact: 0.9234
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg GHI (W/m2) | Avg POA (W/m2) | Avg Cell Temp (C) |
| --- | --- | --- | --- | --- |
| Jan | 13187 | 106.5 | 205.5 | 12.6 |
| Feb | 16020 | 158.1 | 255.3 | 17.5 |
| Mar | 17956 | 221.8 | 294.4 | 23.5 |
| Apr | 19013 | 288.1 | 318.3 | 29.3 |
| May | 18195 | 319.6 | 308.4 | 32.9 |
| Jun | 17869 | 332.5 | 303.9 | 34.4 |
| Jul | 18028 | 323.5 | 305.5 | 33.5 |
| Aug | 17524 | 278.5 | 293.0 | 29.8 |
| Sep | 17593 | 233.8 | 288.4 | 24.8 |
| Oct | 15400 | 165.5 | 246.2 | 18.4 |
| Nov | 13501 | 117.6 | 210.8 | 13.4 |
| Dec | 12364 | 93.9 | 191.1 | 11.1 |

---

## Scenario: Bad Orientation (North Facing)
**Input Parameters:** `{"latitude":40.41,"longitude":-3.7,"capacity_kw":100,"tilt":35,"azimuth":0,"years_operation":0,"soiling_loss":0.02}`

**Annual Generation:** 86,901 kWh

### Internal Physics Logs
```
Initialization: Lat=40.41, Lon=-3.7, Capacity=100.0kW
Geometry: Solar Position calculated for 8760 hours using NREL SPA algorithm.
Irradiance: Clear Sky GHI prepared. Yearly Max: 938.1 W/m2, Avg: 219.6 W/m2
Transposition: Hay-Davies Model applied. POA Global Avg: 115.5 W/m2. Optical Gain: -47.4%
Thermal: Faiman Model (U0=25.0, U1=6.84). Avg Cell Temp: 18.6 C
Losses: Step-by-step breakdown for Year 0
  - Soiling: 2.0%
  - Mismatch: 2.0%
  - LID: 1.5%
  - Cabling: 1.4000000000000001%
  - Ageing Factor: 1.0000 (Year 0)
  - Total Performance Ratio (PR) Impact: 0.9234
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg GHI (W/m2) | Avg POA (W/m2) | Avg Cell Temp (C) |
| --- | --- | --- | --- | --- |
| Jan | 885 | 106.5 | 12.8 | 6.5 |
| Feb | 1622 | 158.1 | 23.9 | 10.2 |
| Mar | 5361 | 221.8 | 81.8 | 16.9 |
| Apr | 10744 | 288.1 | 170.4 | 24.7 |
| May | 14371 | 319.6 | 234.5 | 30.5 |
| Jun | 15892 | 332.5 | 262.4 | 33.1 |
| Jul | 14980 | 323.5 | 245.6 | 31.6 |
| Aug | 11330 | 278.5 | 181.1 | 26.2 |
| Sep | 7094 | 233.8 | 109.5 | 19.2 |
| Oct | 2610 | 165.5 | 38.8 | 11.9 |
| Nov | 1126 | 117.6 | 16.3 | 7.3 |
| Dec | 857 | 93.9 | 12.3 | 5.5 |

---

## Scenario: End of Life (20 Years Old)
**Input Parameters:** `{"latitude":40.41,"longitude":-3.7,"capacity_kw":100,"tilt":35,"azimuth":180,"years_operation":20,"degradation_rate_annual":0.008}`

**Annual Generation:** 167,818 kWh

### Internal Physics Logs
```
Initialization: Lat=40.41, Lon=-3.7, Capacity=100.0kW
Geometry: Solar Position calculated for 8760 hours using NREL SPA algorithm.
Irradiance: Clear Sky GHI prepared. Yearly Max: 938.1 W/m2, Avg: 219.6 W/m2
Transposition: Hay-Davies Model applied. POA Global Avg: 268.2 W/m2. Optical Gain: 22.1%
Thermal: Faiman Model (U0=25.0, U1=6.84). Avg Cell Temp: 23.4 C
Losses: Step-by-step breakdown for Year 20
  - Soiling: 2.0%
  - Mismatch: 2.0%
  - LID: 1.5%
  - Cabling: 1.4000000000000001%
  - Ageing Factor: 0.8516 (Year 20)
  - Total Performance Ratio (PR) Impact: 0.7864
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg GHI (W/m2) | Avg POA (W/m2) | Avg Cell Temp (C) |
| --- | --- | --- | --- | --- |
| Jan | 11230 | 106.5 | 205.5 | 12.6 |
| Feb | 13643 | 158.1 | 255.3 | 17.5 |
| Mar | 15291 | 221.8 | 294.4 | 23.5 |
| Apr | 16191 | 288.1 | 318.3 | 29.3 |
| May | 15494 | 319.6 | 308.4 | 32.9 |
| Jun | 15217 | 332.5 | 303.9 | 34.4 |
| Jul | 15353 | 323.5 | 305.5 | 33.5 |
| Aug | 14923 | 278.5 | 293.0 | 29.8 |
| Sep | 14982 | 233.8 | 288.4 | 24.8 |
| Oct | 13115 | 165.5 | 246.2 | 18.4 |
| Nov | 11498 | 117.6 | 210.8 | 13.4 |
| Dec | 10529 | 93.9 | 191.1 | 11.1 |

---

## Scenario: High Soiling (Desert Storm)
**Input Parameters:** `{"latitude":40.41,"longitude":-3.7,"capacity_kw":100,"tilt":35,"azimuth":180,"years_operation":0,"soiling_loss":0.15}`

**Annual Generation:** 170,922 kWh

### Internal Physics Logs
```
Initialization: Lat=40.41, Lon=-3.7, Capacity=100.0kW
Geometry: Solar Position calculated for 8760 hours using NREL SPA algorithm.
Irradiance: Clear Sky GHI prepared. Yearly Max: 938.1 W/m2, Avg: 219.6 W/m2
Transposition: Hay-Davies Model applied. POA Global Avg: 268.2 W/m2. Optical Gain: 22.1%
Thermal: Faiman Model (U0=25.0, U1=6.84). Avg Cell Temp: 23.4 C
Losses: Step-by-step breakdown for Year 0
  - Soiling: 15.0%
  - Mismatch: 2.0%
  - LID: 1.5%
  - Cabling: 1.4000000000000001%
  - Ageing Factor: 1.0000 (Year 0)
  - Total Performance Ratio (PR) Impact: 0.8009
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg GHI (W/m2) | Avg POA (W/m2) | Avg Cell Temp (C) |
| --- | --- | --- | --- | --- |
| Jan | 11437 | 106.5 | 205.5 | 12.6 |
| Feb | 13895 | 158.1 | 255.3 | 17.5 |
| Mar | 15574 | 221.8 | 294.4 | 23.5 |
| Apr | 16491 | 288.1 | 318.3 | 29.3 |
| May | 15781 | 319.6 | 308.4 | 32.9 |
| Jun | 15499 | 332.5 | 303.9 | 34.4 |
| Jul | 15637 | 323.5 | 305.5 | 33.5 |
| Aug | 15199 | 278.5 | 293.0 | 29.8 |
| Sep | 15259 | 233.8 | 288.4 | 24.8 |
| Oct | 13358 | 165.5 | 246.2 | 18.4 |
| Nov | 11710 | 117.6 | 210.8 | 13.4 |
| Dec | 10724 | 93.9 | 191.1 | 11.1 |

---

