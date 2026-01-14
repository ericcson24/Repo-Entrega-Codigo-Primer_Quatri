const { db } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

class ComponentsController {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/catalog');
    this.collections = {
      solarPanels: { name: 'solar_panels', file: 'solar-panels.json' },
      inverters: { name: 'inverters', file: 'inverters.json' },
      turbines: { name: 'turbines', file: 'turbines.json' },
      towers: { name: 'towers', file: 'towers.json' },
      batteries: { name: 'batteries', file: 'batteries.json' }
    };
  }

  async _getData(type) {
    const config = this.collections[type];
    if (!config) return [];

    // Prioridad 1: Firestore si está activo
    if (db) {
        try {
          const snapshot = await db.collection(config.name).get();
          if (!snapshot.empty) {
            return snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          }
        } catch (error) {
          // Si falla DB, avisamos pero continuamos a sistema de archivos
          console.warn(`[System] Firestore unavailable for ${config.name}. Using local catalog.`);
        }
    }

    // Prioridad 2: Sistema de Archivos (Fuente oficial si no hay nube)
    return this._readLocalFile(config.file);
  }

  _readLocalFile(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return [];
    }
  }

  async getSolarPanels(req, res) {
    try {
      const panels = await this._getData('solarPanels');
      res.json({
        success: true,
        count: panels.length,
        data: panels,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: db ? 'Cloud Firestore' : 'Local Verification Catalog',
          currency: 'EUR'
        }
      });
    } catch (error) {
      console.error('Error fetching solar panels:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener catálogo de paneles solares'
      });
    }
  }

  async getSolarInverters(req, res) {
    try {
      const inverters = await this._getData('inverters');
      res.json({
        success: true,
        count: inverters.length,
        data: inverters,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: db ? 'Cloud Firestore' : 'Local Verification Catalog',
          currency: 'EUR'
        }
      });
    } catch (error) {
      console.error('Error fetching inverters:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener catálogo de inversores'
      });
    }
  }

  async getWindTurbines(req, res) {
    try {
      const turbines = await this._getData('turbines');
      res.json({
        success: true,
        count: turbines.length,
        data: turbines,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: db ? 'Cloud Firestore' : 'Local Verification Catalog',
          currency: 'EUR'
        }
      });
    } catch (error) {
      console.error('Error fetching wind turbines:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener catálogo de aerogeneradores'
      });
    }
  }

  async getWindTowers(req, res) {
    try {
      const towers = await this._getData('towers');
      res.json({
        success: true,
        count: towers.length,
        data: towers,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: db ? 'Cloud Firestore' : 'Local Verification Catalog',
          currency: 'EUR'
        }
      });
    } catch (error) {
      console.error('Error fetching wind towers:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener catálogo de torres'
      });
    }
  }

  async getBatteries(req, res) {
    try {
      const batteries = await this._getData('batteries');
      res.json({
        success: true,
        count: batteries.length,
        data: batteries,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: db ? 'Cloud Firestore' : 'Local Verification Catalog',
          currency: 'EUR'
        }
      });
    } catch (error) {
      console.error('Error fetching batteries:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener catálogo de baterías'
      });
    }
  }
}

// Bind methods to instance to avoid 'this' issues when passing as callbacks
const controller = new ComponentsController();
module.exports = {
  getSolarPanels: controller.getSolarPanels.bind(controller),
  getSolarInverters: controller.getSolarInverters.bind(controller),
  getWindTurbines: controller.getWindTurbines.bind(controller),
  getWindTowers: controller.getWindTowers.bind(controller),
  getBatteries: controller.getBatteries.bind(controller)
};
