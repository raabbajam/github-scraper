// get user sample
var _ = require('highland');
var sampler = require('./libs/sampler');
// var getUserData = require('./libs/getUserData');
// var filterer = require('./libs/filterer');
var filterEmail = require('./libs/filterEmail');
// var scraper = require('./libs/scraper');

function init() {
  sampler()
    // .then(getData)
    .then(filterEmail)
    .then(filterContribution)
    .then(function (user) {
      console.log(user);
      // addTask(user);
    })
    .catch(function (err) {
      debug('err', err.stack);
      process.exit(1);
    });
}
