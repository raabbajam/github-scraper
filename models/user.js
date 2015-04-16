var nohm = require('nohm').Nohm;
var debug = require('debug')('raabbajam:models:user');
var Promise = require('bluebird');
var redisClient = require('./redisClient');
var initialized = false;
var UserModel = nohm.model('User', {
  properties: {
    name: {
      type: 'string',
      index: true,
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
function User(id, data) {
  return new Promise(function(resolve, reject) {
    var user = nohm.factory('User', id, function (err) {
      if (err) return reject(err);
      user.p('data', data);
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
        debug('Saved user! :-)');
        return resolve();
      });
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
function get(id, keep) {
  debug('getting %s',id);
  return new Promise(function(resolve, reject) {
    var user = nohm.factory('User', id, function (err) {
      if (err) return reject(err);
      if (!keep && !user.p('data')) {
        return User.destroy(id).then(function () {return resolve(0);});
      }
      return resolve(user.p('data'));
    });
  });
}
function check(name) {
  return new Promise(function(resolve, reject) {
    var user = nohm.factory('User');
    user.p({
      name: name,
    });
    user.save(function (err) {
      if (err) {
        if (err === 'invalid') {
          debug('properties were invalid: %j, tryng to check possible empty..', user.errors);
          UserModel.find({name: name}, function (err, ids) {
            if (err) return reject(err);
            debug(ids);
            var id = ids[0] ? ids[0] : ids;
            get(id, true)
              .then(function (data) {
                if (!data) {
                  debug('no data: "%s", return this id..', data);
                  return resolve(id);
                }
                debug('have data %j, reject as duplicate', data);
                err = new Error('properties were invalid');
                err.errors = user.errors;
                return reject(err);
              });
          });
        } else {
          debug(err); // database or unknown error
          return reject(err);
        }
      } else {
        debug('User not exist, created! :-)');
        // debug(user);
        return resolve(user.id);
      }
    });
  });
}
function init() {
  debug('User init..');
  return new Promise(function(resolve, reject) {
    if (initialized) return resolve();
    initialized = true;
    redisClient.on('ready', function () {
      nohm.setClient(redisClient);
      return resolve();
    });
  });
}
function destroyAll() {
  debug('run destroy all!');
  return User.all()
    .map(User.destroy);
}
function destroy(id) {
  debug('tryng to delete user %s', id);
  return new Promise(function(resolve, reject) {
    var user = nohm.factory('User');
    user.id = id;
    user.remove(function (err) {
      if (err) return reject(err);
      debug('delete user %s', id);
      return resolve();
    });
  });
}
User.all = all;
User.get = get;
User.check = check;
User.destroy = destroy;
User.destroyAll = destroyAll;
User.init = init;
module.exports = User;
