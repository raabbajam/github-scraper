// get user sample
var debug = require('debug')('raabbajam:main');
var Promise = require('bluebird');
var sampler = require('./libs/sampler');
var rateLimit = require('./libs/rateLimit');
var filterEmail = require('./libs/filterEmail');
var filterContribution = require('./libs/filterContribution');
var redis = require('./services/redis');
var kue = require('./services/kue');
var succeed;
var sampled;
var target = 400000;
function init() {
  // query count number user succeed save in variable
  redis.initKey();
  rateLimit();
  return redis.getSampledCount()
    .then(function (num) {
      debug('Last sampled count and target %d / %d', num, target);
      sampled = num;
      return;
    })
    .then(sampler.init)
    .then(checkSampled)
    .then(next);
}
function checkSampled() {
  if (sampled >= target) {
    debug('It looks like you have finished this. Good Bye!');
    process.exit();
  }
  return Promise.resolve();
}
function checkSucceed() {
  if (succeed >= target) {
    debug('It looks like you have finished this. Good Bye!');
    process.exit();
  }
  return Promise.resolve();
}
function next() {
  checkSampled()
    .then(sampler)
    .then(addFilterTask)
    // .then(filterEmail)
    // .then(filterContribution)
    // .then(addScraperTask)
    .then(next)
    .catch(log);
}
function log(err) {
  var message = err.stack || err.message || err;
  debug('Error final', message);
  return next();
}
function addScraperTask(users) {
  users.forEach(function (user) {
    kue.addScraperTask(user);
    redis.incrSucceedCount();
    succeed++;
    debug('Added %s to scraper task, now %d / %d', user, succeed, target);
  });
}

function addFilterTask(users) {
  users.forEach(function (user) {
    kue.addFilterTask(user);
    redis.incrSampledCount();
    sampled++;
  });
  debug('Added %s to filter task, now %d / %d', users, sampled, target);
}
init();
