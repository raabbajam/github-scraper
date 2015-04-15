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
      var proms = users.map(function (user) {
        return  User.get(user);
      });
      return Promise.settle(proms, {concurrent: concurrent})
        .then(function (values) {
          return values.filter(function (res) {
            return res.isFulfilled();
          })
          .map(function (res) {
            return res.value();
          });
        })
    })
    .then(function (users) {
      return _.pluck(users, 'username');
    })
    .then(addScraperTask)
    .then(function (users) {
      debug('Restarted!');
      return User.destroyAll();
      // process.exit();
    })
    .then(function () {
      debug('All deleted');
      process.exit();
    })
    .catch(function (err) {
      debug(err);
      process.exit();
    });
}
restart();

function addScraperTask(users) {
  users.forEach(function (user) {
    if(!user) return;
    kue.addScraperTask(user)
      .then(function (value) {
        debug('Added %s to scraper task', user);
      });
  });
}
