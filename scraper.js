// scrape user sample
var debug = require('debug')('raabbajam:scrape');
var Promise = require('bluebird');
var scraper = require('./libs/scraper');
var rateLimit = require('./libs/rateLimit');
var kue = require('./services/kue');
var User = require('./models/user');
var concurrency = 1;
var cluster = require('cluster');
// var clusterWorkerSize = require('os').cpus().length;
var clusterWorkerSize = 1;
if (cluster.isMaster) {
  for (var i = 0; i < clusterWorkerSize; i++) {
    debug('Spawning %d / %d scraper worker', i , clusterWorkerSize);
    cluster.fork();
  }
  init();
} else {
  kue.processTask('scraper', concurrency, function (job, done) {
    var user = job.data.user;
    return scraper(user)
      .then(User.init)
      .then(function (json) {
        return User(user, json);
      })
      .then(function () {
        debug('user %s is scraped', user);
        done();
      })
      .catch(function (err) {
        log(err);
        if (err.message == 'properties were invalid') {
          debug('user is scraped, but not unique, removing duplicate..', user);
          return done();
        }
        debug('user %s is failed to scrape, will attempt again', user);
        return done(err);
      });
  });
}
function init() {
  rateLimit();
}
function log(err) {
  var message = err.stack || err.message || err;
  debug('Error final', message);
}
function addScraperTask(users) {
  users.forEach(function (user) {
    kue.addScraperTask(user);
    debug('Added %s to scraper task', user);
  });
}
