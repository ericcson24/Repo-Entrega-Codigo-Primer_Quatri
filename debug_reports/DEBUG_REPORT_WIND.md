# 🧪 PHYSICS VALIDATION REPORT: WIND
**Date:** 2026-01-17T12:40:17.164Z

This document contains detailed monthly breakdowns of the physics simulation logic.

## Scenario: Standard Onshore (80m Hub)
**Input Parameters:** `{"latitude":43,"longitude":-8,"capacity_kw":2000,"hub_height":80,"rotor_diameter":90,"hellman_exponent":0.143,"weibull_scale":7}`

**Annual Generation:** 6,705,378 kWh

### Internal Physics Logs
```
Wind Init: Hub Height=80.0m, Rotor D=90.0m
Resource: Generated Weibull distribution (k=2.0, A=7.0) for 10m height.
Extrapolation: Applied Hellman Exponent 0.143. Avg Speed 10m: 6.22 m/s -> Hub: 8.37 m/s
Power Curve: Applied idealized Cubic Power curve (Cp constant optimized for Rated Speed).
Losses: Wake=5.0%, Availability=3.0%, Ageing=0.00%
```

### Monthly Breakdown
| Month | Generation (kWh) | Speed 10m (m/s) | Speed Hub (m/s) | Gross Gen (kWh) | Losses |
| --- | --- | --- | --- | --- | --- |
| Jan | 535469 | 6.09 | 8.20 | 581084 | 7.8% |
| Feb | 546527 | 6.11 | 8.22 | 593084 | 7.8% |
| Mar | 569595 | 6.25 | 8.42 | 618117 | 7.8% |
| Apr | 568864 | 6.30 | 8.49 | 617324 | 7.9% |
| May | 577351 | 6.37 | 8.58 | 626534 | 7.9% |
| Jun | 555547 | 6.22 | 8.37 | 602872 | 7.8% |
| Jul | 573007 | 6.32 | 8.50 | 621820 | 7.9% |
| Aug | 562227 | 6.26 | 8.42 | 610122 | 7.9% |
| Sep | 559995 | 6.18 | 8.32 | 607699 | 7.8% |
| Oct | 547494 | 6.14 | 8.27 | 594133 | 7.8% |
| Nov | 549994 | 6.16 | 8.29 | 596846 | 7.8% |
| Dec | 559309 | 6.22 | 8.38 | 606955 | 7.9% |

---

## Scenario: Offshore Giant (150m Hub)
**Input Parameters:** `{"latitude":43,"longitude":-8,"capacity_kw":5000,"hub_height":150,"rotor_diameter":140,"hellman_exponent":0.1,"weibull_scale":9.5}`

**Annual Generation:** 23,241,541 kWh

### Internal Physics Logs
```
Wind Init: Hub Height=150.0m, Rotor D=140.0m
Resource: Generated Weibull distribution (k=2.0, A=9.5) for 10m height.
Extrapolation: Applied Hellman Exponent 0.1. Avg Speed 10m: 8.43 m/s -> Hub: 11.05 m/s
Power Curve: Applied idealized Cubic Power curve (Cp constant optimized for Rated Speed).
Losses: Wake=5.0%, Availability=3.0%, Ageing=0.00%
```

### Monthly Breakdown
| Month | Generation (kWh) | Speed 10m (m/s) | Speed Hub (m/s) | Gross Gen (kWh) | Losses |
| --- | --- | --- | --- | --- | --- |
| Jan | 1922771 | 8.45 | 11.08 | 2086567 | 7.9% |
| Feb | 1981505 | 8.61 | 11.29 | 2150304 | 7.9% |
| Mar | 1941044 | 8.31 | 10.89 | 2106396 | 7.8% |
| Apr | 1933239 | 8.46 | 11.09 | 2097927 | 7.9% |
| May | 1904869 | 8.37 | 10.97 | 2067140 | 7.9% |
| Jun | 1930572 | 8.37 | 10.97 | 2095032 | 7.8% |
| Jul | 1856670 | 8.08 | 10.59 | 2014834 | 7.8% |
| Aug | 2022133 | 8.56 | 11.23 | 2194393 | 7.9% |
| Sep | 1943295 | 8.72 | 11.43 | 2108839 | 7.9% |
| Oct | 1952369 | 8.51 | 11.16 | 2118685 | 7.8% |
| Nov | 1947658 | 8.29 | 10.86 | 2113574 | 7.9% |
| Dec | 1905415 | 8.39 | 11.00 | 2067732 | 7.9% |

---

## Scenario: Poor Wind Site (Low Speed)
**Input Parameters:** `{"latitude":43,"longitude":-8,"capacity_kw":2000,"hub_height":80,"rotor_diameter":90,"hellman_exponent":0.143,"weibull_scale":4.5}`

**Annual Generation:** 2,623,442 kWh

### Internal Physics Logs
```
Wind Init: Hub Height=80.0m, Rotor D=90.0m
Resource: Generated Weibull distribution (k=2.0, A=4.5) for 10m height.
Extrapolation: Applied Hellman Exponent 0.143. Avg Speed 10m: 3.99 m/s -> Hub: 5.38 m/s
Power Curve: Applied idealized Cubic Power curve (Cp constant optimized for Rated Speed).
Losses: Wake=5.0%, Availability=3.0%, Ageing=0.00%
```

### Monthly Breakdown
| Month | Generation (kWh) | Speed 10m (m/s) | Speed Hub (m/s) | Gross Gen (kWh) | Losses |
| --- | --- | --- | --- | --- | --- |
| Jan | 208495 | 3.94 | 5.30 | 226257 | 7.9% |
| Feb | 226411 | 4.10 | 5.52 | 245698 | 7.8% |
| Mar | 221178 | 3.98 | 5.36 | 240019 | 7.8% |
| Apr | 212723 | 3.95 | 5.31 | 230844 | 7.8% |
| May | 216596 | 3.96 | 5.34 | 235047 | 7.8% |
| Jun | 217205 | 3.99 | 5.37 | 235708 | 7.8% |
| Jul | 233804 | 4.08 | 5.50 | 253721 | 7.8% |
| Aug | 219687 | 3.99 | 5.37 | 238401 | 7.8% |
| Sep | 219155 | 4.03 | 5.43 | 237824 | 7.8% |
| Oct | 224880 | 4.00 | 5.39 | 244037 | 7.9% |
| Nov | 221088 | 3.98 | 5.36 | 239922 | 7.9% |
| Dec | 202221 | 3.92 | 5.28 | 219447 | 7.8% |

---

## Scenario: High Wake Losses (Wind Farm)
**Input Parameters:** `{"latitude":43,"longitude":-8,"capacity_kw":2000,"hub_height":80,"rotor_diameter":90,"losses_wake":0.15}`

**Annual Generation:** 5,929,935 kWh

### Internal Physics Logs
```
Wind Init: Hub Height=80.0m, Rotor D=90.0m
Resource: Generated Weibull distribution (k=2.0, A=7.0) for 10m height.
Extrapolation: Applied Hellman Exponent 0.143. Avg Speed 10m: 6.18 m/s -> Hub: 8.32 m/s
Power Curve: Applied idealized Cubic Power curve (Cp constant optimized for Rated Speed).
Losses: Wake=15.0%, Availability=3.0%, Ageing=0.00%
```

### Monthly Breakdown
| Month | Generation (kWh) | Speed 10m (m/s) | Speed Hub (m/s) | Gross Gen (kWh) | Losses |
| --- | --- | --- | --- | --- | --- |
| Jan | 475123 | 6.11 | 8.22 | 576256 | 17.6% |
| Feb | 505172 | 6.28 | 8.46 | 612701 | 17.5% |
| Mar | 490228 | 6.24 | 8.40 | 594576 | 17.5% |
| Apr | 497464 | 6.14 | 8.27 | 603352 | 17.5% |
| May | 514486 | 6.38 | 8.59 | 623998 | 17.6% |
| Jun | 513655 | 6.22 | 8.37 | 622989 | 17.5% |
| Jul | 476712 | 6.05 | 8.14 | 578183 | 17.5% |
| Aug | 483451 | 6.06 | 8.15 | 586357 | 17.6% |
| Sep | 493406 | 6.20 | 8.34 | 598431 | 17.6% |
| Oct | 489039 | 6.12 | 8.24 | 593134 | 17.5% |
| Nov | 506370 | 6.24 | 8.41 | 614154 | 17.5% |
| Dec | 484830 | 6.13 | 8.25 | 588029 | 17.5% |

---

