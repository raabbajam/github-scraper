var Promise = require('bluebird');
var _ = require('lodash');
var debug = require('debug')('raabbajam:libs:filter-contribution');
var github = require('../services/github');
var eventType = ['PullRequestEvent', 'CreateEvent', 'PushEvent'];
var minContributor = 3;
var concurrency = 4;
function filterContribution(users) {
  users = _.isArray(users) ? users : [users];
  debug("Starting filter contribution for %d users:\n%s", users.length, users);
  var proms = Promise.map(users, function (user) {
    return getEventFor1Month(user)
      .then(filterEventContribute)
      .then(isGreaterThanTen)
      .then(isContributeToRepoWith3Contributor)
      .then(function () {
        debug('User %s is passed contribution filter', user);
        return user;
      });
  }, {concurrency: concurrency});
  return Promise.settle(proms, {concurrency: concurrency})
  .then(function (results) {
    var values = results
      .filter(function (res) {
        return res.isFulfilled();
      })
      .map(function (res) {
        return res.value();
      });
      debug('All passed contribution filter %j', values);
    return values;
  });
}
function getEventFor1Month(user) {
  // @TODO
  debug('Starting filter contribution for %s', user);
  return getEvent(user);
}
function getEvent(user) {
  return new Promise(function(resolve, reject) {
    github.events.getFromUser({
      user: user,
      per_page: 100,
    }, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}
function filterEventContribute(events) {
  return events.filter(function (event) {
    return eventType.indexOf(event.type) > -1;
  });
}
function isGreaterThanTen(events) {
  if (events.length < 10) {
    return Promise.reject(new Error('Overall contribution is less than 10.'));
    // return reject(new Error('Overall contribution is less than 10.'));
  } else {
    return Promise.resolve(events);
  }
}
function isContributeToRepoWith3Contributor(events) {
  var repos = events.map(function (event) {
    return event.repo.name;
  });
  repos = _.uniq(repos);
  // debug('repos', repos);
  return isOneOfRepoHas3Contributor(repos);
}
function isOneOfRepoHas3Contributor(repos) {
  return Promise.any(repos.map(isRepoWith3Contributor));
}
function isRepoWith3Contributor(repo) {
  // debug('checking repo %s', repo);
  return getContributors(repo)
    .then(function (users) {
      var len = users.length || 0;
      if (len < minContributor) {
        // debug('checking repo %s is fail, contributors: %d', repo, len);
        return Promise.reject(new Error(repo +' are less than ' + minContributor + '.'));
      } else {
        // debug('checking repo %s is succes, contributors: %d', repo, len);
        return Promise.resolve(true);
      }
    });
}
function getContributors(repoName) {
  var splitted = repoName.split('/');
  var user = splitted[0];
  var repo = splitted[1];
  return new Promise(function(resolve, reject) {
    github.repos.getContributors({
      user: user,
      repo: repo,
    }, function (err, users) {
      if (err) return reject(err);
      return resolve(users);
    });
  });
}
module.exports = filterContribution;
