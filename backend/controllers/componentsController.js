const fs = require('fs');
const path = require('path');

class ComponentsController {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/catalog');
  }

  _readData(filename) {
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
      const panels = this._readData('solar-panels.json');
      res.json({
        success: true,
        count: panels.length,
        data: panels,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: 'file-database',
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
      const inverters = this._readData('inverters.json');
      res.json({
        success: true,
        count: inverters.length,
        data: inverters,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: 'file-database',
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
      const turbines = this._readData('turbines.json');
      res.json({
        success: true,
        count: turbines.length,
        data: turbines,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: 'file-database',
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
      const towers = this._readData('towers.json');
      res.json({
        success: true,
        count: towers.length,
        data: towers,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: 'file-database',
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
      const batteries = this._readData('batteries.json');
      res.json({
        success: true,
        count: batteries.length,
        data: batteries,
        metadata: {
          lastUpdate: new Date().toISOString(),
          source: 'file-database',
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
