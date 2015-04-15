var config = require('../local');
var client = require('redis').createClient(config.redis.port, config.redis.host, {});
module.exports = client;
