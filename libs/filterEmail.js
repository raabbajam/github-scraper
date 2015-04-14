var Promise = require('bluebird');
var debug = require('debug')('raabbajam:libs:filter-email');
var _ = require('lodash');
var github = require('../services/github');
function filterEmail(users) {
  return getAllData(users)
    .then(isEmailPublic);
}
function getAllData(users) {
  users = _.isArray(users) ? users : [users];
  return Promise.map(users, getData);
}
function getData(user) {
  return new Promise(function(resolve, reject) {
    // debug('getdata',user);
    github.user.getFrom({
      user: user,
    }, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}
function isEmailPublic(data) {
  // debug('Before filter: %d users', data.length);
  data = _.isArray(data) ? data : [data];
  data = data.filter(function (user) {
    return !!user.email;
  });
  // debug('After email filter: %d users', data.length);
  if (!data.length) {
    // debug('No email found. Stop filter. Move on!');
    return Promise.reject("No email found. Stop filter. Move on!");
  }
  data = data.map(function (user) {
    return user.login;
  });
  return Promise.resolve(data);
}
module.exports = filterEmail;
