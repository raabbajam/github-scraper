var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('lodash');
var debug = require('debug')('raabbajam:libs:scraper');
var config = require('../local');
var github = require('../services/github');
var google = require('../services/google');
var request = require('../services/request');
var googleBigQuery = google.bigquery('v2');
function scraper(user) {
  return getDataAndRepo(user);
}
function getDataAndRepo(user) {
  return Promise.props({
    data: scrapeUserWebAndParse(user),
    repositories: getTopTenRepositories(user),
  });
}
//done
function getData(user) {
  return new Promise(function(resolve, reject) {
    github.user.getFrom({
      user: user,
    }, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}
//done
function getTopTenRepositories(user) {
  return getRepositories(user)
    .then(getContributors)
    .then(getTopTen)
    .then(populateReposData);
}
//done
function getRepositories(user) {
  return new Promise(function(resolve, reject) {
    var query = "SELECT repository_url \nFROM [githubarchive:github.timeline]\nWHERE payload_pull_request_user_login ='" + user + "' or repository_owner ='" + user + "'\nGROUP BY repository_url;";
    google.raInit()
      .then(function () {
        googleBigQuery.jobs.query({
            projectId: config.google.projectId,
            resource: {
              query: query,
            },
          }, function (err, data) {
            if (err) return reject(err);
            data = data.rows.map(function (row) {
              return row.f[0].v.replace('https://github.com/', '');
            });
            return resolve(data);
          });
      });
  });
}
//done
function getContributors(repos) {
  repos = _.isArray(repos) ? repos : [repos];
  repos = repos.map(function (repoName) {
    var splitted = repoName.split('/');
    var user = splitted[0];
    var repo = splitted[1];
    return new Promise(function(resolve, reject) {
      github.repos.getContributors({
        user: user,
        repo: repo,
      }, function (err, users) {
        if (err) return reject(err);
        return resolve({
          repository: repoName,
          contributors: users.length,
          user: user,
        });
      });
    });
  });
  return Promise.all(repos);
}
//done
function getTopTen(repos) {
  // debug(repos);
  return _.sortBy(repos, function (repo) {
    return +repo.contributors || 0;
  }).reverse().slice(0, 10);
}
//done
function populateReposData(repos) {
  return Promise.map(repos, populateRepoData);
}
//done
function populateRepoData(repo) {
  var repoName = repo.repository;
  var user = repo.user;
  return Promise.props({
    data: getRepoDataAndParse(repoName),
    userData: getUserRepoDataAndParse(repoName, user),
    web: scrapeRepoWebAndParse(repoName),
  });
}
//done
function getRepoDataAndParse(repoName) {
  return getRepoData(repoName)
    .then(parseRepoJSON);
}
//done
function getRepoData(repoName) {
  var splitted = repoName.split('/');
  var user = splitted[0];
  var repo = splitted[1];
  return new Promise(function(resolve, reject) {
    github.repos.get({
      user: user,
      repo: repo,
    }, function (err, users) {
      if (err) return reject(err);
      return resolve(users);
    });
  });
}
//done
function parseRepoJSON(json) {
  return {
    name: json.full_name,
    description: json.description,
    startDate: json.created_at,
  };
}
function getUserRepoDataAndParse(repoName, user) {
  var splitted = repoName.split('/');
  var owner = splitted[0];
  var repo = splitted[1];
  return new Promise(function(resolve, reject) {
    github.repos.getStatsContributors({
      user: owner,
      repo: repo,
    }, function (err, data) {
      if (err) return reject(err);
      var output = {
        commitLastMonth: getCommitLastMonth(data),
        userCommitLastMonth: getUserCommitLastMonth(data, user),
        userCommitOverall: getUserCommitOverall(data),
      };
      return resolve(output);
    });
  });
}
function getCommitLastMonth(data) {
  return data.reduce(function (all, user) {
    return all + _.takeRight(user.weeks, 4).reduce(function (month, week) {
      return month + week.c;
    }, 0);
  }, 0);
}
function getUserCommitLastMonth(data, user) {
  return _.takeRight(_.find(data, function (row) {
    return row.author.login === user;
  }).weeks, 4).reduce(function (month, week) {
    return month + week.c;
  }, 0);
}
function getUserCommitOverall(data) {
  return data.reduce(function (all, user) {
    return all + user.weeks.reduce(function (month, week) {
      return month + week.c;
    }, 0);
  }, 0);
}
//done
function scrapeRepoWebAndParse(repo) {
  return scrape(repo)
    .then(parseRepoWeb);
}
//done
function parseRepoWeb(html) {
  var $ = cheerio.load(html);
  var ul = $('ul.numbers-summary');
  return Promise.resolve({
    // name: $('title').text().trim().replace(' · GitHub', ''),
    // description: $('.repository-description').text().trim().replace(/\s+/g, ' '),
    contributors: +$('li:nth-child(4)', ul).text().trim().replace(/\D+/g, ''),
    commits: +$('li.commits', ul).text().trim().replace(/\D+/g, ''),
    branches: +$('li:nth-child(2)', ul).text().trim().replace(/\D+/g, ''),
    releases: +$('li:nth-child(3)', ul).text().trim().replace(/\D+/g, ''),
  });
}
function scrapeUserWebAndParse(user) {
  return scrape(user)
    .then(parseUserWeb);
}
function scrape(url) {
  url = 'https://github.com/' + url;
  var options = {
    url: url,
  };
  return request(options);
}
function parseUser(html) {
  return {};
}
module.exports = scraper;
