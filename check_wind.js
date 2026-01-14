const fs = require('fs');
const path = './backend/data/weather/weather_las_palmas_28.1235_-15.4363_2020-2024.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const winds = data.data.map(d => d.windspeed_mean).filter(w => w != null);
const avg = winds.reduce((a,b) => a+b, 0) / winds.length;
console.log(`Count: ${winds.length}`);
console.log(`Average Wind Speed (km/h): ${avg.toFixed(2)}`);
console.log(`Average Wind Speed (m/s): ${(avg/3.6).toFixed(2)}`);
