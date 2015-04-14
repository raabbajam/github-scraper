var Promise = require('bluebird');
var debug = require('debug')('raabbajam:service:kue');
var config = require('../local');
var Kue = require('kue');
var queue = Kue.createQueue({
  prefix: config.redis.prefix,
  redis: {
    port: config.redis.port,
    host: config.redis.host,
  }
});
var kue = {
  addScraperTask: addScraperTask,
  addFilterTask: addFilterTask,
  processTask: processTask,
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
    .removeOnComplete( true )
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
function processTask(task, concurrency, callback) {
  return queue.process(task, concurrency, callback);
}
module.exports = kue;

process.once( 'SIGTERM', function ( sig ) {
  queue.shutdown( 5000, function(err) {
    debug( 'Kue is shut down. ', err||'' );
    process.exit( 0 );
  });
});
queue.on( 'error', function( err ) {
  debug( 'Oops... ', err );
});
process.once( 'uncaughtException', function(err){
  var message = err.stack || err.message || err;
  debug( 'uncaughtException\nKue is shut down. ', message );
  queue.shutdown( 1000, function(err2){
    var message2 = err.stack || err.message || err;
    debug( 'Kue is shut down. ', message2);
    process.exit( 0 );
  });
});
queue.active( function( err, ids ) {
  ids.forEach( function( id ) {
    Kue.Job.get( id, function( err, job ) {
      // Your application should check if job is a stuck one
      job.inactive();
    });
  });
});
