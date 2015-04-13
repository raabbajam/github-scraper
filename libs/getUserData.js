var _ = require('highland');
var Promise = require('bluebird');
var github = require('../services/github');
function getUserData(user, callback) {
  /*return _(function (push, next) {
    github.user.getFrom(user, function (err, data) {
      push(err, data);
    });
  });*/
  console.log('user', user);
  github.user.getFrom({user: user}, function (err, data) {
    callback(err, data);
  });
}
module.exports = getUserData;
