// scrape user sample
var debugFn = require('debug');
var debug;
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
  debug = debugFn('raabbajam:scrape:master');
  for (var i = 0; i < clusterWorkerSize; i++) {
    debug('Spawning %d / %d scraper worker', i , clusterWorkerSize);
    cluster.fork();
  }
  cluster.on('disconnect', function(worker) {
    debug('A worker has disconnected! EXIT!');
    process.exit(0);
  });
  init();
} else {
  debug = debugFn('raabbajam:scrape:worker');
  User.init()
  .then(function () {
    debug('user initialized');
    kue.processTask('scraper', concurrency, function (job, done) {
      var user = job.data.user;
      debug('Start scraping user %s', user);
      var id;
      return User.check(user)
        .then(function (_id) {
          id = _id;
          debug('Got id %s for this user %s', id, user);
          return scraper(user);
        })
        .then(function (json) {
          debug('Got json and id for this user %s, %s, %j', user, id, json);
          return User(id, json);
        })
        .then(function () {
          debug('user %s is scraped', user);
          return done(null, user);
        })
        .catch(function (err) {
          log(err);
          var msg = err.message || err;
          if (/skip me|No data rows|properties were invalid/.test(msg)) {
            debug('Skip this user %s, Cause: %s', user, msg);
            // debug('user is scraped, but not unique, removing duplicate..', user);
            return done(null, user);
          }
          debug('user %s is failed to scrape, will attempt again', user);
          return done(err);
        });
    });
  });
}
function init() {
  rateLimit();
}
function log(err) {
  var message = err.stack || err.message || err;
  debug('Error final', message);
  if (/Quota exceeded/i.test(message)) {
    debug('Ugh! Quota exceeded Error!');
    if (cluster.isMaster) process.exit(0);
    debug('Not in master! Disconnect!');
    cluster.worker.disconnect();
    process.exit(0);
  }
}
function addScraperTask(users) {
  users.forEach(function (user) {
    kue.addScraperTask(user);
    debug('Added %s to scraper task', user);
  });
}
