var Promise = require('bluebird');
var _ = require('lodash');
var debug = require('debug')('raabbajam:libs:filter-contribution');
var github = require('../services/github');
var eventType = ['PullRequestEvent', 'CreateEvent', 'PushEvent'];
var minContributor = 3;
function filterContribution(user) {
  return getEventFor1Month(user)
    .then(filterEventContribute)
    .then(isGreaterThanTen)
    .then(isContributeToRepoWith3Contributor)
    .then(function () {
      return user;
    });
}
function getEventFor1Month(user) {
  // @TODO
  return getEvent(user);
}
function getEvent(user) {
  debug('getEvent');
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
    throw (new Error('Overall contribution is less than 10.'));
    // return reject(new Error('Overall contribution is less than 10.'));
  } else {
    return events;
  }
}
function isContributeToRepoWith3Contributor(events) {
  var repos = events.map(function (event) {
    return event.repo.name;
  });
  repos = _.uniq(repos);
  debug('repos', repos);
  return isOneOfRepoHas3Contributor(repos);
}
function isOneOfRepoHas3Contributor(repos) {
  return Promise.any(repos.map(isRepoWith3Contributor))
    .catch(function (err) {
      debug('Has no repo with %d contributors.', minContributor);
      throw(err);
    });
  // return new Promise(function(resolve, reject) {
  //   isRepoWith3Contributor(repos.shift())
  //     .then(function () {
  //       return resolve(true);
  //     }, function (err) {
  //       return isRepoWith3Contributor(repos.shift());
  //     });
  // });
}
function isRepoWith3Contributor(repo) {
  debug('checking repo %s', repo);
  return getContributors(repo)
    .then(function (users) {
      if (users.length < minContributor) {
        debug('checking repo %s is fail, contributors: %d', repo, users.length);
        throw (new Error(repo +' are less than ' + minContributor + '.'));
      } else {
        debug('checking repo %s is succes, contributors: %d', repo, users.length);
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
