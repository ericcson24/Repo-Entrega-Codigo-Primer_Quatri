const { db } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

const COLLECTIONS = {
  'solar-panels.json': 'solar_panels',
  'batteries.json': 'batteries',
  'inverters.json': 'inverters',
  'towers.json': 'towers',
  'turbines.json': 'turbines'
};

async function seedDatabase() {
  const dataDir = path.join(__dirname, '../data/catalog');
  
  try {
    const files = fs.readdirSync(dataDir);
    
    for (const file of files) {
      if (COLLECTIONS[file]) {
        console.log(`Processing ${file}...`);
        const collectionName = COLLECTIONS[file];
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const batch = db.batch();
        let count = 0;
        
        for (const item of data) {
          // Use ID if available, otherwise auto-id
          const ref = item.id ? db.collection(collectionName).doc(item.id) : db.collection(collectionName).doc();
          batch.set(ref, item);
          count++;
        }
        
        await batch.commit();
        console.log(`Uploaded ${count} items to ${collectionName}`);
      }
    }
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
