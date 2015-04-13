var Promise = require('bluebird');
var _ = require('highland');
var debug = require('debug')('raabbajam:libs:sampler');
var github = require('../services/github');
var sampledPage = [];
var init = false;
var totalPage;
var per_page = 100;

function sampler() {
  return new Promise(function(resolve, reject) {
    var since = getRandom();
    var id = since + 1;
    var opts = {
      since: since,
    };
    github.user.getAll(opts, function (err, data) {
      if (err) return reject(err);
      sampledPage.push(id);
      debug('Taking sample user with id %s', id);
      return resolve(data.map(function (item) {
        return item.login;
      })[0]);
    });
  });
}
module.exports = sampler;

function getRandom() {
  var number;
  debug('sampledPage :%s', sampledPage);
  while(~(sampledPage.indexOf(number = (~~(Math.random() * 1000))))) { //get random number, check if already sampled, get another random number
    debug('Checking number :%d', number);
  }
  debug('Page %d is not sampled', number);
  debug('Return generate random number: %d', number);
  return number;
}
