var User = require('./models/user');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var jsoncsv = require('json-csv')
var path = require('path');

var concurrent = 100;
function format() {
  User.all()
    .then(function (users) {
      return Promise.map(users, User.get, {concurrent: concurrent});
    })
    .then(toCSV)
    .then(write);
    .then(function () {
      debug('Finished. Bye~');
    })
    .catch(function (err) {
      debug(err);
      process.exit(0);
    });
}

function toCSV(aoJSON) {
  return new Promise(function(resolve, reject) {
    jsoncsv.csvBuffered({
      data : aoJSON,
      fields: getFields(),
      callback
    });
    function callback(err, csv) {
      if(err) return reject(err);
      return resolve(csv);
    }
  });
}
function write(csv) {
  var filename = path.join(__dirname, 'output.csv');
  return fs.writeFileAsync(filename, csv);
}
function getFields() {
  return [
    { name : 'email', label : 'Email' },
  ];
}
