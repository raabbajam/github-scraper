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
  listen: listen,
};
function addTask(task, data) {
  return new Promise(function(resolve, reject) {
    var job = queue.create(task, data)
    .backoff(true)
    .attempts(5)
    .removeOnComplete( true )
    .save(function (err) {
      if(err) return reject(err);
      return resolve();
    });
    job.on('complete', function (result) {
      debug('COMPLETE!!');
      return;
    }).on('failed attempt', function (err, times) {
      debug('FAILED ATTEMPT!!! %d times, will try again', times, err);
      return reject(err);
    }).on('failed', function (err) {
      debug('FAILED!!! max attempts reached, will not try again', times, err);
      return reject(err);
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
function listen(port) {
  Kue.app.listen(port);
}
module.exports = kue;

process.once( 'SIGTERM', function ( sig ) {
  queue.shutdown( 5000, function(err) {
    debug( 'Kue is shut down. ', err||'' );
    process.exit( 0 );
  });
});
process.once( 'uncaughtException', function(err){
  var message = err.stack || err.message || err;
  debug( 'uncaughtException\nKue is shut down. ', message );
  queue.shutdown(function(err2){
    var message2 = err.stack || err.message || err;
    debug( 'Kue is shut down. ', message2);
    process.exit( 0 );
  });
});
process.on('message', function(msg) {
  if (msg == 'shutdown') {
    console.log('Closing all connections...');
    queue.shutdown(function(err2){
      var message2 = err.stack || err.message || err;
      debug( 'Kue is shut down. ', message2);
      process.exit( 0 );
    });
  }
});
queue.on( 'error', function( err ) {
  debug( 'Oops... ', err );
}).on('job complete', function(id, result){
  // debug('JOB COMPLETE!! id %s, %s', id, result);
}).on('job failed attempt', function (err, times) {
  debug('FAILED ATTEMPT!!! %d times, will try again', times, err);
}).on('job failed', function (err) {
  debug('FAILED!!! max attempts reached, will not try again', err);
});
queue.active( function( err, ids ) {
  ids.forEach( function( id ) {
    Kue.Job.get( id, function( err, job ) {
      if (job) job.inactive();
    });
  });
});
