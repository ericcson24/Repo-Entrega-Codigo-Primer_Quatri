const express = require('express');
const router = express.Router();
const CatalogController = require('../controllers/catalogController');

// Route: GET /api/catalog/:technology
router.get('/catalog/:technology', CatalogController.getCatalog);

module.exports = router;
