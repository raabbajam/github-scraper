// get user sample
var sampler = require('./libs/sampler');
var filterer = require('./libs/filterer');
var scraper = require('./libs/scraper');

function init() {
  sampler()
  .then(function (users) {
    return filterer(users)
  })
  .then(function (users) {
    return scraper(users)
  })
  .catch(function (err) {
    debug('err', err.stack);
    process.exit(1);
  });
}
