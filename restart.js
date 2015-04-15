var User = require('./models/user');
var Promise = require('bluebird');
var _ = require('lodash');
var debug = require('debug')('raabbajam:restart');
var concurrent = 100;
var kue = require('./services/kue');

function restart() {
  debug('restart');
  return User.init()
    .then(User.all)
    .then(function (users) {
      debug('users.length', users.length);
      return Promise.map(users, User.get, {concurrent: concurrent});
    })
    .then(function (users) {
      return _.pluck(users, 'username');
    })
    .then(addScraperTask)
    .then(function (users) {
      debug(users);
      // process.exit();
    })
    .catch(function (err) {
      debug(err);
      // process.exit();
    });
}
restart();

function addScraperTask(users) {
  users.forEach(function (user) {
    kue.addScraperTask(user)
      .then(function (value) {
        debug('Added %s to scraper task', user);
      });
  });
}
