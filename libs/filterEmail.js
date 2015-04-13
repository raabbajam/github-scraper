var Promise = require('bluebird');
var debug = require('debug')('raabbajam:libs:filter-email');
var github = require('../services/github');
function filterEmail(user) {
  return getData(user)
    .then(isEmailPublic);
}
function getData(user) {
  return new Promise(function(resolve, reject) {
    debug('getdata',user);
    github.user.getFrom({
      user: user,
    }, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}
function isEmailPublic(data) {
  return new Promise(function(resolve, reject) {
    if (!data.email) {
      return reject(new Error('User email not found!' ));
    }
    return resolve(user);
  });
}
module.exports = filterEmail;
