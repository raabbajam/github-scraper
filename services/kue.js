var Promise = require('bluebird');
var config = require('../local');
var queue = require('kue').createQueue({
  prefix: config.redis.prefix,
  redis: {
    port: config.redis.port,
    host: config.redis.host,
  }
});
var kue = {
  addScraperTask: addScraperTask,
  addFilterTask: addFilterTask,
};
function addTask(task, data) {
  return new Promise(function(resolve, reject) {
    var job = queue.create(task, data)
    .backoff(true)
    .attempts(5)
    .on('complete', function (result) {
      return;
    }).on('failed attempt', function (err, done) {
      return reject(err);
    }).on('failed', function (err) {
      return reject(err);
    })
    .save(function (err) {
      if(err) return reject(err);
      return resolve();
    });
  });
}
function addScraperTask(user) {
  return addTask('scraper', {
    user: user,
  });
}
function addFilterTask(user) {
  return addTask('filter', {
    user: user,
  });
}
module.exports = kue;
