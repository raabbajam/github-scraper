var kue = require('./services/kue');
console.log('listening to 1339');
kue.listen('1339');
