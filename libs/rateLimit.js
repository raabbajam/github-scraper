var github = require('../services/github');
var debug = require('debug')('raabbajam:rate-limit');
var time = 30 * 1000;
function rateLimit() {
  github.misc.rateLimit({}, function (err, msg) {
    if (!err) {
      debug("\ncore: %j\nsearch: %j", msg.resources.core, msg.resources.search);
      if (msg.resources.core.remaining === 0) {
        debug('msg.resources.core.remaining is %d', msg.resources.core.remaining);
        process.exit(0);
      }
    }
    setTimeout(rateLimit, time);
  });
}
module.exports = rateLimit;
