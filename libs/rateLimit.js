var github = require('../services/github');
var debug = require('debug')('raabbajam:rate-limit');
var time = 30000;
function rateLimit() {
  github.misc.rateLimit({}, function (err, msg) {
    if (!err) {
      debug("\ncore: %j\nsearch: %j", msg.resources.core, msg.resources.search);      
    }
    setTimeout(rateLimit, time);
  });
}
module.exports = rateLimit;
