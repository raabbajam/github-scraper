var config = require('../local');
console.log('config.redis.host', config.redis.host);
var client = require('redis').createClient(config.redis.port, config.redis.host, {});
module.exports = client;
