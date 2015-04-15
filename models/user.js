var nohm = require('nohm').Nohm;
var debug = require('debug')('raabbajam:models:user');
var Promise = require('bluebird');
var redisClient = require('./redisClient');
var initialized = false;
var UserModel = nohm.model('User', {
  properties: {
    name: {
      type: 'string',
      unique: true,
      validations: [
        'notEmpty'
      ]
    },
    data: {
      type: 'json',
    },
  }
});
function User(name, data) {
  return new Promise(function(resolve, reject) {
    var user = nohm.factory('User');
    user.p({
      name: name,
      data: data,
    });
    user.save(function (err) {
      if (err) {
        if (err === 'invalid') {
          debug('properties were invalid: ', user.errors);
          err = new Error('properties were invalid');
          err.errors = user.errors;
        } else {
          debug(err); // database or unknown error
        }
        return reject(err);
      }
      debug('saved user! :-)');
      return resolve();
    });
  });
}
function all() {
  return new Promise(function(resolve, reject) {
    UserModel.find(function (err, ids) {
      if(err) return reject(err);
      return resolve(ids);
    });
  });
}
function get(id) {
  return new Promise(function(resolve, reject) {
    var user = nohm.factory('User', id, function (err) {
      if (err) return reject(err);
      return resolve(user.p('data'));
    });
  });
}
function init() {
  return new Promise(function(resolve, reject) {
    if (initialized) return resolve();
    initialized = true;
    redisClient.on('ready', function () {
      nohm.setClient(redisClient);
      return resolve();
    });
  });
}
User.all = all;
User.get = get;
User.init = init;
module.exports = User;
