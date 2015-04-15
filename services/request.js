var debug = require('debug')('raabbajam:service:request');
var request = require('request').defaults({pool: {maxSockets: Infinity}});
var Promise = require('bluebird');
Promise.promisifyAll(request);
function get(options) {
  return request.getAsync(options)
    .then(function (res) {
      debug(options.url);
      return res[1];
    });
}
module.exports = get;
