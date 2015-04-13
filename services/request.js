var request = require('request');
var Promise = require('bluebird');
Promise.promisifyAll(request);
function get(options) {
  return request.getAsync(options)
    .then(function (res) {
      return res[1];
    });
}
module.exports = get;
