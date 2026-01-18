/**
 * COMPREHENSIVE PHYSICS VALIDATION & REPORT GENERATION
 * 
 * Generates detailed Markdown reports for TFG validation.
 * Uses 'axios' to hit the FastAPI backend.
 * 
 * Usage: node scripts/test-physics-comprehensive.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://127.0.0.1:8000';
const OUTPUT_DIR = path.join(__dirname, '../debug_reports');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// --- Definición de Escenarios ---

const SCENARIOS = {
    solar: [
        {
            name: "Condiciones Óptimas (Madrid, Sur, Nuevo)",
            params: { "latitude": 40.41, "longitude": -3.7, "capacity_kw": 100, "tilt": 35, "azimuth": 180, "years_operation": 0, "soiling_loss": 0.02 }
        },
        {
            name: "Mala Orientación (Norte)",
            params: { "latitude": 40.41, "longitude": -3.7, "capacity_kw": 100, "tilt": 35, "azimuth": 0, "years_operation": 0, "soiling_loss": 0.02 }
        },
        {
            name: "Fin de Vida Útil (20 Años)",
            params: { "latitude": 40.41, "longitude": -3.7, "capacity_kw": 100, "tilt": 35, "azimuth": 180, "years_operation": 20, "degradation_rate_annual": 0.008 }
        },
        {
            name: "Alta Suciedad (Tormenta del Desierto)",
            params: { "latitude": 40.41, "longitude": -3.7, "capacity_kw": 100, "tilt": 35, "azimuth": 180, "years_operation": 0, "soiling_loss": 0.15 }
        }
    ],
    wind: [
        {
            name: "Terrestre Estándar (Buje 80m)",
            params: { "latitude": 43, "longitude": -8, "capacity_kw": 2000, "hub_height": 80, "rotor_diameter": 90, "hellman_exponent": 0.143, "weibull_scale": 7 }
        },
        {
            name: "Marino Gigante (Buje 150m)",
            params: { "latitude": 43, "longitude": -8, "capacity_kw": 5000, "hub_height": 150, "rotor_diameter": 140, "hellman_exponent": 0.1, "weibull_scale": 9.5 }
        },
        {
            name: "Sitio con Poco Viento",
            params: { "latitude": 43, "longitude": -8, "capacity_kw": 2000, "hub_height": 80, "rotor_diameter": 90, "hellman_exponent": 0.143, "weibull_scale": 4.5 }
        },
        {
            name: "Pérdidas por Estela (Parque Eólico)",
            params: { "latitude": 43, "longitude": -8, "capacity_kw": 2000, "hub_height": 80, "rotor_diameter": 90, "losses_wake": 0.15 }
        }
    ],
    hydro: [
        {
            name: "Fluyente Estándar",
            params: { "latitude": 42, "longitude": -1, "capacity_kw": 500, "flow_rate_design": 4, "gross_head": 15, "ecological_flow": 0.5 }
        },
        {
            name: "Arroyo de Montaña (Gran Salto)",
            params: { "latitude": 42, "longitude": -1, "capacity_kw": 500, "flow_rate_design": 0.8, "gross_head": 80, "ecological_flow": 0.1 }
        },
        {
            name: "Sequía Severa / Restricción Ecológica",
            params: { "latitude": 42, "longitude": -1, "capacity_kw": 500, "flow_rate_design": 4, "gross_head": 15, "ecological_flow": 3.5 }
        },
        {
            name: "Tubería Ineficiente (Pérdida por Fricción)",
            params: { "latitude": 42, "longitude": -1, "capacity_kw": 500, "flow_rate_design": 4, "gross_head": 15, "penstock_length": 500, "penstock_diameter": 0.5 }
        }
    ],
    biomass: [
        {
            name: "Pellets Secos (Estándar)",
            params: { "latitude": 39, "longitude": -3, "capacity_kw": 1000, "feedstock_type": "pellets", "moisture_content": 8, "calorific_value_dry": 19 }
        },
        {
            name: "Astillas Húmedas (Baja Eficiencia)",
            params: { "latitude": 39, "longitude": -3, "capacity_kw": 1000, "feedstock_type": "chips", "moisture_content": 45, "calorific_value_dry": 19 }
        },
        {
            name: "Mantenimiento Pesado",
            params: { "latitude": 39, "longitude": -3, "capacity_kw": 1000, "feedstock_type": "pellets", "moisture_content": 10, "availability_factor": 0.7 }
        },
        {
            name: "Planta Alta Tecnología (Ciclo ORC)",
            params: { "latitude": 39, "longitude": -3, "capacity_kw": 1000, "feedstock_type": "pellets", "moisture_content": 10, "plant_efficiency": 0.35 }
        }
    ]
};

// --- Helpers ---

const getMonthlyStats = (hourlyData, chunk = 730) => {
    const months = [];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    // Safety check
    if (!hourlyData || hourlyData.length === 0) return monthNames.map(m => ({ name: m, sum: 0, avg: 0, max: 0 }));

    for (let i = 0; i < 12; i++) {
        const start = i * chunk;
        const end = (i + 1) * chunk;
        const slice = hourlyData.slice(start, end);
        
        const sum = slice.reduce((a, b) => a + b, 0);
        const avg = sum / (slice.length || 1);
        const max = slice.length ? Math.max(...slice) : 0;
        
        months.push({ name: monthNames[i], sum, avg, max });
    }
    return months;
};

const formatTable = (headers, rows) => {
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
    return `${headerRow}\n${separatorRow}\n${dataRows}`;
};

// --- Generadores de Informes ---

async function generateReport(tech, scenarios) {
    let reportContent = `# REPORTE DE VALIDACION FISICA: ${tech.toUpperCase()}\n`;
    reportContent += `**Fecha:** ${new Date().toISOString()}\n\n`;
    reportContent += `Este documento contiene desgloses mensuales detallados de la lógica de simulación física.\n\n`;

    console.log(`\nGenerando reporte para ${tech}...`);

    for (const scenario of scenarios) {
        console.log(`   Ejecutando: ${scenario.name}`);
        try {
            const res = await axios.post(`${API_URL}/predict/${tech}`, { ...scenario.params, debug: true });
            const data = res.data;
            const debug = data.debug_info || {};
            const details = debug.data && debug.data.hourly_details ? debug.data.hourly_details : {};

            reportContent += `## Escenario: ${scenario.name}\n`;
            reportContent += `**Parámetros de Entrada:** \`${JSON.stringify(scenario.params)}\`\n\n`;
            reportContent += `**Generación Anual:** ${Math.round(data.annual_generation_kwh).toLocaleString()} kWh\n\n`;
            
            reportContent += `### Logs de Física Interna\n`;
            reportContent += "```\n" + (debug.logs || []).join('\n') + "\n```\n\n";

            reportContent += `### Desglose Mensual\n`;
            
            // Construir Tabla según Tecnología
            let headers = ["Mes", "Generación (kWh)"];
            let tableData = [];
            
            // Obtener Estadísticas de Generación
            const genStats = getMonthlyStats(data.hourly_generation_kwh);
            
            if (tech === 'solar') {
                headers.push("GHI Promedio (W/m2)", "POA Promedio (W/m2)", "Temp Celda Promedio (C)");
                const ghiStats = getMonthlyStats(details.ghi || []);
                const poaStats = getMonthlyStats(details.poa_global || []);
                const tempStats = getMonthlyStats(details.cell_temperature || []);
                
                tableData = genStats.map((m, i) => [
                    m.name,
                    Math.round(m.sum),
                    (ghiStats[i]?.avg || 0).toFixed(1),
                    (poaStats[i]?.avg || 0).toFixed(1),
                    (tempStats[i]?.avg || 0).toFixed(1)
                ]);
            } 
            else if (tech === 'wind') {
                headers.push("Vel 10m (m/s)", "Vel Buje (m/s)", "Gen Bruta (kWh)", "Pérdidas");
                const windRefStats = getMonthlyStats(details.wind_speed_10m || []);
                const windHubStats = getMonthlyStats(details.wind_speed_hub || []);
                const grossStats = getMonthlyStats(details.gross_power_kw || []);
                
                tableData = genStats.map((m, i) => {
                    const gross = Math.round(grossStats[i]?.sum || 0);
                    const net = Math.round(m.sum);
                    const lossPct = gross > 0 ? (1 - net/gross) * 100 : 0;
                    
                    return [
                        m.name,
                        net,
                        (windRefStats[i]?.avg || 0).toFixed(2),
                        (windHubStats[i]?.avg || 0).toFixed(2),
                        gross,
                        lossPct.toFixed(1) + '%'
                    ];
                });
            }
            else if (tech === 'hydro') {
                headers.push("Caudal Disp Prom (m3/s)", "Generación (kWh)"); // Gen is duplicated for clarity
                const flowStats = getMonthlyStats(details.flow_available_m3s || []);
                
                tableData = genStats.map((m, i) => [
                    m.name,
                    Math.round(m.sum),
                    (flowStats[i]?.avg || 0).toFixed(2),
                    Math.round(m.sum)
                ]);
            }
            else if (tech === 'biomass') {
                headers.push("Tasa Combustible Prom (kg/h)", "Est Combustible Consumido (Toneladas)");
                const fuelStats = getMonthlyStats(details.fuel_rate_kgh || []);
                
                tableData = genStats.map((m, i) => [
                    m.name,
                    Math.round(m.sum),
                    (fuelStats[i]?.avg || 0).toFixed(1),
                    (fuelStats[i]?.sum / 1000 || 0).toFixed(1)
                ]);
            }

            reportContent += formatTable(headers, tableData);
            reportContent += "\n\n---\n\n";

        } catch (e) {
            console.error(`Error en ${scenario.name}:`, e.message);
            reportContent += `**ERROR:** ${e.message}\n\n`;
        }
    }

    const filename = `DEBUG_REPORT_${tech.toUpperCase()}.md`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), reportContent);
    console.log(`Guardado: ${filename}`);
}

async function runAll() {
    await generateReport('solar', SCENARIOS.solar);
    await generateReport('wind', SCENARIOS.wind);
    await generateReport('hydro', SCENARIOS.hydro);
    await generateReport('biomass', SCENARIOS.biomass);
    console.log("\nTodos los reportes generados en la carpeta /debug_reports.");
}

runAll();