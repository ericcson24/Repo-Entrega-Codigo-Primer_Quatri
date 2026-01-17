# 🧪 PHYSICS VALIDATION REPORT: HYDRO
**Date:** 2026-01-17T12:40:17.391Z

This document contains detailed monthly breakdowns of the physics simulation logic.

## Scenario: Standard River Run-of-River
**Input Parameters:** `{"latitude":42,"longitude":-1,"capacity_kw":500,"flow_rate_design":4,"gross_head":15,"ecological_flow":0.5}`

**Annual Generation:** 2,559,156 kWh

### Internal Physics Logs
```
Hydro Init: Gross Head=15.0m, Design Flow=4.0m3/s
Hydrology: Simulated seasonal flow. Max Flow available: 5.04 m3/s. Ecological subtracted: 0.5 m3/s
Hydraulics: Calculated Net Head subtracting penstock friction losses (Darcy-Weisbach).
Turbine: Efficiency 90.0%, Generator 95.0%
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Avail Flow (m3/s) | Generation (kWh) |
| --- | --- | --- | --- |
| Jan | 302243 | 4.33 | 302243 |
| Feb | 302575 | 4.40 | 302575 |
| Mar | 293329 | 3.92 | 293329 |
| Apr | 252720 | 3.08 | 252720 |
| May | 195712 | 2.27 | 195712 |
| Jun | 139204 | 1.56 | 139204 |
| Jul | 93939 | 1.04 | 93939 |
| Aug | 99845 | 1.11 | 99845 |
| Sep | 135219 | 1.52 | 135219 |
| Oct | 196969 | 2.29 | 196969 |
| Nov | 255188 | 3.13 | 255188 |
| Dec | 292214 | 3.84 | 292214 |

---

## Scenario: Mountain Stream (High Head)
**Input Parameters:** `{"latitude":42,"longitude":-1,"capacity_kw":500,"flow_rate_design":0.8,"gross_head":80,"ecological_flow":0.1}`

**Annual Generation:** 3,804,855 kWh

### Internal Physics Logs
```
Hydro Init: Gross Head=80.0m, Design Flow=0.8m3/s
Hydrology: Simulated seasonal flow. Max Flow available: 2.29 m3/s. Ecological subtracted: 0.1 m3/s
Hydraulics: Calculated Net Head subtracting penstock friction losses (Darcy-Weisbach).
Turbine: Efficiency 90.0%, Generator 95.0%
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Avail Flow (m3/s) | Generation (kWh) |
| --- | --- | --- | --- |
| Jan | 365000 | 1.17 | 365000 |
| Feb | 365000 | 1.12 | 365000 |
| Mar | 364774 | 1.10 | 364774 |
| Apr | 343715 | 0.90 | 343715 |
| May | 313876 | 0.72 | 313876 |
| Jun | 274837 | 0.64 | 274837 |
| Jul | 219459 | 0.47 | 219459 |
| Aug | 258065 | 0.62 | 258065 |
| Sep | 261599 | 0.60 | 261599 |
| Oct | 327586 | 0.82 | 327586 |
| Nov | 345945 | 0.86 | 345945 |
| Dec | 365000 | 1.12 | 365000 |

---

## Scenario: Severe Drought / Eco Constraints
**Input Parameters:** `{"latitude":42,"longitude":-1,"capacity_kw":500,"flow_rate_design":4,"gross_head":15,"ecological_flow":3.5}`

**Annual Generation:** 446,707 kWh

### Internal Physics Logs
```
Hydro Init: Gross Head=15.0m, Design Flow=4.0m3/s
Hydrology: Simulated seasonal flow. Max Flow available: 2.79 m3/s. Ecological subtracted: 3.5 m3/s
Hydraulics: Calculated Net Head subtracting penstock friction losses (Darcy-Weisbach).
Turbine: Efficiency 90.0%, Generator 95.0%
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Avail Flow (m3/s) | Generation (kWh) |
| --- | --- | --- | --- |
| Jan | 114970 | 1.28 | 114970 |
| Feb | 123943 | 1.39 | 123943 |
| Mar | 75018 | 0.82 | 75018 |
| Apr | 28180 | 0.31 | 28180 |
| May | 3329 | 0.04 | 3329 |
| Jun | 0 | 0.00 | 0 |
| Jul | 0 | 0.00 | 0 |
| Aug | 0 | 0.00 | 0 |
| Sep | 0 | 0.00 | 0 |
| Oct | 408 | 0.00 | 408 |
| Nov | 18870 | 0.21 | 18870 |
| Dec | 81990 | 0.90 | 81990 |

---

## Scenario: Inefficient Penstock (Friction Loss)
**Input Parameters:** `{"latitude":42,"longitude":-1,"capacity_kw":500,"flow_rate_design":4,"gross_head":15,"penstock_length":500,"penstock_diameter":0.5}`

**Annual Generation:** 854 kWh

### Internal Physics Logs
```
Hydro Init: Gross Head=15.0m, Design Flow=4.0m3/s
Hydrology: Simulated seasonal flow. Max Flow available: 5.06 m3/s. Ecological subtracted: 0.5 m3/s
Hydraulics: Calculated Net Head subtracting penstock friction losses (Darcy-Weisbach).
Turbine: Efficiency 90.0%, Generator 95.0%
```

### Monthly Breakdown
| Month | Generation (kWh) | Avg Avail Flow (m3/s) | Generation (kWh) |
| --- | --- | --- | --- |
| Jan | 0 | 4.30 | 0 |
| Feb | 0 | 4.32 | 0 |
| Mar | 0 | 3.87 | 0 |
| Apr | 0 | 3.17 | 0 |
| May | 0 | 2.29 | 0 |
| Jun | 0 | 1.49 | 0 |
| Jul | 812 | 1.08 | 812 |
| Aug | 42 | 1.12 | 42 |
| Sep | 0 | 1.49 | 0 |
| Oct | 0 | 2.34 | 0 |
| Nov | 0 | 3.07 | 0 |
| Dec | 0 | 3.82 | 0 |

---

