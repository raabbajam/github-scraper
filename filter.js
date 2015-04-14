// get user sample
var debug = require('debug')('raabbajam:filter');
var Promise = require('bluebird');
var sampler = require('./libs/sampler');
var rateLimit = require('./libs/rateLimit');
var filterEmail = require('./libs/filterEmail');
var filterContribution = require('./libs/filterContribution');
var redis = require('./services/redis');
var kue = require('./services/kue');
var concurrency = 1;
var cluster = require('cluster');
var clusterWorkerSize = require('os').cpus().length;
if (cluster.isMaster) {
  for (var i = 0; i < clusterWorkerSize; i++) {
    debug('Spawning %d / %d filter worker', i , clusterWorkerSize);
    cluster.fork();
  }
} else {
  init();
  kue.processTask('filter', concurrency, function (job, done) {
    var user = job.data.user;
    return filterEmail(user)
      .then(filterContribution)
      .then(addScraperTask)
      .then(function () {
        debug('user %s is passed filter', user);
        done();
      })
      .catch(function (err) {
        log(err);
        debug('user %s is not passed filter', user);
        done();
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
