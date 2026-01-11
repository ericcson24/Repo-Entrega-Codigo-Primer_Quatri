const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // Cache por 10 minutos

module.exports = cache;
