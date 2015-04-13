var _ = require('highland');
var es = require('event-stream');
var github = require('../services/github');
var debug = require('debug')('raabbajam:libs:filterer');

function filterer(user) {
  return !!user.email;
}
module.exports = filterer;
