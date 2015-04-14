var Promise = require('bluebird');
var _ = require('highland');
var moment = require('moment');
var debug = require('debug')('raabbajam:libs:sampler');
var github = require('../services/github');
var redis = require('../services/redis');
var per_page = 100;
var totalPage = 1000 / 100;
var inputFormat = "YYYY-MM-DD";
var outputFormat = "YYYY-MM-DD";
var date;
var page = 1;
var initialized = false;
function sampler() {
  return new Promise(function(resolve, reject) {
    /*var q = 'repos:>10 type:user created:>' + date.format(outputFormat);
    debug('q %s page %d', q, page);
    var opts = {
      q: q,
      sort: 'joined',
      order: 'asc',
      per_page: per_page,
      page: page,
    };
    github.search.users(opts, function (err, data) {
      if (err) return reject(err);
      var users = data.items.map(function (item) {
        var id = item.id;
        // debug('Taking sample user with id %s', id);
        return item.login;
      });
      if (page >= totalPage) {
        var last = data.items.pop();
        debug('Last page, get last user "%s" and update query search~!', last.login);
        getLastDate(last.login).then(function (lastDate) {
          date = lastDate;
          lastDate = date.format(outputFormat);
          page = 1;
          debug('Get update query %s', lastDate);
          redis.setLastUserDateSampled(lastDate)
            .then(function (value) {
              return resolve(users);
            });
        });
      } else {
        page++;
        return resolve(users);
      }
    });*/

    var since = getRandom();
    var opts = {
      since: since,
    };
    github.user.getAll(opts, function (err, users) {
      if (err) return reject(err);
      users = users.map(function (item) {
        return item.login;
      });
      return resolve(users);
    });
  });
}
sampler.init = init;
module.exports = sampler;

function init() {
  return new Promise(function(resolve, reject) {
    if (initialized) return resolve();
    initialized = true;
    debug('Initializing sampler.');
    redis.getLastUserDateSampled()
      .then(function (lastDate) {
        debug('Last date %s', lastDate);
        if (!lastDate) {
          date = moment('2011-01-01');
        } else {
          date = moment(lastDate, inputFormat).add(1, 'day');
        }
        debug('Starting search from %s', date.format(outputFormat));
        return resolve();
      });
  });
}
function getLastDate(user) {
  return new Promise(function(resolve, reject) {
    github.user.getFrom({
      user: user,
    }, function (err, user) {
      if (err) return reject(err);
      date = moment(user.created_at, inputFormat).add(1, 'day');
      return resolve(date);
    });
  });
}
function getRandom(argument) {
  return ~~(Math.random() * 11935272);
}
