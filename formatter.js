var User = require('./models/user');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('fs'));
var jsoncsv = require('json-csv');
var path = require('path');
var debug = require('debug')('raabbajam:formatter');
var concurrent = 100;
function format() {
  debug('format');
  return User.init()
    .then(User.all)
    .then(function (users) {
      return Promise.map(users, User.get, {concurrent: concurrent});
    })
    .then(flattenRepositories)
    .then(toCSV)
    .then(write);
}

function flattenRepositories(users) {
  return users.reduce(function (all, user) {
    var userData = user;
    var repoData = user.repositories;
    if (!repoData) {
      debug('!repoData', user);
      return all;
    }
    delete userData.repositories;
    repoData = repoData.map(function (repo) {
      repo.repoName = repo.name;
      delete repo.name;
      return _.merge({}, userData, repo);
    });
    return all.concat(repoData);
  }, []);
}
function toCSV(aoJSON) {
  debug('aoJSON', aoJSON[0]);
  return new Promise(function(resolve, reject) {
    var options = {
      fields: getFields(),
    };
    jsoncsv.csvBuffered(aoJSON, options, callback);
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
    { name : 'name', label : 'Developer name' },
    { name : 'email', label : 'Developer email address' },
    { name : 'joinDate', label : 'Join Date' },
    { name : 'web', label : 'Web page' },
    { name : 'id', label : 'developer id' },
    { name : 'country', label : 'Country' },
    { name : 'contributionYear', label : 'Contributions this year' },
    { name : 'overallContributions', label : 'Contributions over all' },
    { name : 'contributionMonth', label : 'Contributions last month' },
    { name : 'pullRequestMonth', label : 'Pull requests last month' },
    { name : 'longestStreak', label : 'Longest streak' },
    { name : 'currentStreak', label : 'Current streak' },
    { name : 'repositoriesContributed', label : 'Number of repositories contributed to' },
    { name : 'followers', label : 'Followers' },
    { name : 'following', label : 'Stars' },
    { name : 'starred', label : 'Following' },
    { name : 'repoName', label : 'Name of repository' },
    { name : 'description', label : 'Description' },
    { name : 'startDate', label : 'Start date' },
    { name : 'contributors', label : 'Number of contributors to repository' },
    { name : 'commits', label : 'Number of commits  to repository' },
    { name : 'commitLastMonth', label : 'Number of commits in last month  to repository' },
    { name : 'branches', label : 'Number of branches  to repository' },
    { name : 'releases', label : 'Number of releases  to repository' },
    { name : 'userCommitLastMonth', label : 'Number of contributions from the developer in the last month' },
    { name : 'userCommitOverall', label : 'Number of contributions from the developer overall' },
  ];
}
format()
  .then(function () {
    debug('Finished. Bye~');
    process.exit(0);
  })
  .catch(function (err) {
    debug(err);
    process.exit(0);
  });
