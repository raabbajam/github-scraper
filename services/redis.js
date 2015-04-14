var config = require('../local');
var Promise = require('bluebird');
var debug = require('debug')('raabbajam:service:redis');
var client = Promise.promisifyAll(require('redis').createClient(config.redis.port, config.redis.host, {}));
var prefix = config.redis.prefix + ':';
var keys;
function initKey() {
  // debug('running initKey');
  debug('Initializing redis.');
  keys = {
    succeedCount: prefix + 'succeed-count',
    sampledCount: prefix + 'sampled-count',
    lastUserDateSampled: prefix + 'last-sampled',
  };
}
var redis = {
  initKey: initKey,
  setPrefix: setPrefix,
  getSucceedCount: getSucceedCount,
  getSampledCount: getSampledCount,
  incrSucceedCount: incrSucceedCount,
  incrSampledCount: incrSampledCount,
  getLastUserDateSampled: getLastUserDateSampled,
  setLastUserDateSampled: setLastUserDateSampled,
};
function setPrefix(_prefix) {
  // debug('running setPrefix');
  prefix = _prefix + ':';
  initKey();
}
function getSucceedCount() {
  // debug('running getSucceedCount');
  return client.getAsync(keys.succeedCount);
}
function getSampledCount() {
  // debug('running getSampledCount');
  return client.getAsync(keys.sampledCount);
}
function incrSucceedCount() {
  // debug('running incrSucceedCount');
  return client.incrAsync(keys.succeedCount);
}
function incrSampledCount() {
  // debug('running incrSampledCount');
  return client.incrAsync(keys.sampledCount);
}
function getLastUserDateSampled() {
  // debug('running getLastUserDateSampled');
  return client.getAsync(keys.lastUserDateSampled);
}
function setLastUserDateSampled(lastDate) {
  // debug('running setLastUserDateSampled');
  return client.setAsync(keys.lastUserDateSampled, lastDate);
}
module.exports = redis;
