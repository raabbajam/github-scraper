var Promise = require('bluebird');
var debug = require('debug')('raabbajam:libs:sampler');
var config = require('../local');
var Github = require('github');
var github = new Github({
    version: "3.0.0",
    headers: {
        "user-agent": "University-of-Pennsylvania-Research", // GitHub is happy with a unique user agent
    }
});
var credentials = {
    type: "oauth",
    token: config.github.token,
};
github.authenticate(credentials);
var sampledPage = [];
var init = false;
var totalPage;
var per_page = 100;
function sampler() {
  return new Promise(function(resolve, reject) {
    var opts = {
      q: 'repos:>15',
      per_page: per_page,
      page: 0//getRandomPage(),
    };
    github.search.users(opts, function (err, data) {
      if (err) return reject(err);
      sampledPage.push(opts.page);
      debug('Taking sample users from page %s', opts.page || 0);
      return resolve(data.items.map(function (item) {
        return item.login;
      }));
    });
  });
}
module.exports = sampler;

function getRandomPage() {
  var page;
  debug('sampledPage :%s', sampledPage);
  while(~(sampledPage.indexOf(page = (~~(Math.random() * 1000))))) { //get random page, check if already sampled, get another random page
    debug('Checking page :%d', page);
  }
  debug('Page %d is not sampled', page);
  debug('Return generate random page: %d', page);
  return page;
}
