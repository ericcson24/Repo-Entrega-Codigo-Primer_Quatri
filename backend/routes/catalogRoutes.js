const express = require('express');
const router = express.Router();
const CatalogController = require('../controllers/catalogController');

// Ruta: GET /api/catalog/:technology
router.get('/catalog/:technology', CatalogController.getCatalog);

module.exports = router;
