var Promise = require('bluebird');
var cheerio = require('cheerio');
var _ = require('lodash');
var moment = require('moment');
var inputFormat = 'YYYY-MM-DD';
var outputFormat = 'YYYY-MM-DD';
var debug = require('debug')('raabbajam:libs:scraper');
var config = require('../local');
var github = require('../services/github');
var google = require('../services/google');
var request = require('../services/request');
var googleBigQuery = google.bigquery('v2');
function scraper(user) {
  return getDataAndRepo(user)
    .then(formatJSON)
    .catch(function (err) {
      // TODO log error
      debug('Error Main', err.stack);
      return Promise.reject(err)
    });
}
function getDataAndRepo(user) {
  return Promise.props({
    data: getData(user),
    web: getWeb(user),
    repositories: getTopTenRepositories(user),
  });
}
function getWeb(user) {
  return Promise.props({
    web: scrapeUserWebAndParse(user),
    repositoriesContributed: getRepositoriesCount(user),
  }).then(function (user) {
    user.web.repositoriesContributed = user.repositoriesContributed;
    return user;
  });
}
//done
function getData(user) {
  return getUserData(user)
    .then(getOverallContribution);
}
function getUserData(user) {
  return new Promise(function(resolve, reject) {
    github.user.getFrom({
      user: user,
    }, function (err, data) {
      if (err) return reject(err);
      data = parseUserData(data);
      data.username = user;
      return resolve(data);
    });
  });
}
//done
function parseUserData(json) {
  return {
    name: json.name,
    email: json.email,
    joinDate: json.created_at,
    web: json.blog,
    id: json.id,
    country: json.location,
    followers: json.followers,
    following: json.following,
  };
}
function getOverallContribution(user) {
  var joinDate = moment(user.joinDate, inputFormat);
  var now = moment();
  var months = [];
  while(joinDate.isBefore(now, 'month')) {
    months.push(joinDate.format(outputFormat));
    joinDate.add(1, 'M');
  }
  months.push(joinDate.format(outputFormat));
  months = months.map(function (month) {
    return getMonthContribution(user.username, month);
  });
  return Promise.all(months)
    .then(function (contributes) {
      var overallContributions = contributes.reduce(function (all, monthly) {
        return all + monthly;
      }, 0);
      user.overallContributions = overallContributions;
      return user;
    });
}
function getMonthContribution(user, month) {
  var now = moment().format(outputFormat);
  var url = user + '?tab=contributions&from=' + month + '&to=' + now + '&_pjax=.js-contribution-activity';
  var headers = ajaxHeaders(user);
  return scrape(url, headers, true)
    .then(function (html) {
      var $ = cheerio.load(html);
      var contrib = $('.conversation-list-heading');
      if (!contrib.length) return 0;
      var iconEl = $('.octicon-git-commit', contrib);
      var isExist = !!iconEl.length;
      return isExist ? parseNumber(iconEl.next()) : 0;
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
function getRepositoriesCount(user) {
  return new Promise(function(resolve, reject) {
    var query = "SELECT COUNT(DISTINCT repository_url) AS count_repositories_contributed_to FROM [githubarchive:github.timeline] WHERE payload_pull_request_user_login ='" + user + "' or repository_owner = '" + user + "';";
    google.raInit()
      .then(function () {
        googleBigQuery.jobs.query({
            projectId: config.google.projectId,
            resource: {
              query: query,
            },
          }, function (err, data) {
            if (err) return reject(err);
            return resolve(data.rows[0].f[0].v);
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
  }).then(function (repo) {
    return _.merge({}, repo.data, repo.userData, repo.web);
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
//done
function getUserRepoDataAndParse(repoName, user) {
  var splitted = repoName.split('/');
  var owner = splitted[0];
  var repo = splitted[1];
  return new Promise(function(resolve, reject) {
    debug('repoName %s, user %s', repoName, user);
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
//done
function getCommitLastMonth(data) {
  var commits;
  try {
    commits = data.reduce(function (all, user) {
      return all + _.takeRight(user.weeks, 4).reduce(function (month, week) {
        return month + week.c;
      }, 0);
    }, 0);
  } catch (err) {
    commits = 0;
  }
  return commits;
}
//done
function getUserCommitLastMonth(data, user) {
  var commits;
  try {
    commits = _.takeRight(_.find(data, function (row) {
      return row.author.login === user;
    }).weeks, 4).reduce(function (month, week) {
      return month + week.c;
    }, 0);
  } catch (err) {
    commits = 0;
  }
  return commits;
}
//done
function getUserCommitOverall(data) {
  var commits;
  try {
    commits = data.reduce(function (all, user) {
      return all + user.weeks.reduce(function (month, week) {
        return month + week.c;
      }, 0);
    }, 0);
  } catch (err) {
    commits = 0;
  }
  return commits;
}
//done
function scrapeRepoWebAndParse(repo) {
  return scrape(repo)
    .then(parseRepoWeb)
    .then(function (json) {
      return checkContributors(json, repo);
    });
}
//done
function parseRepoWeb(html) {
  var $ = cheerio.load(html);
  var ul = $('ul.numbers-summary');
  return Promise.resolve({
    contributors: parseNumber($('li:nth-child(4)', ul)),
    commits: parseNumber($('li.commits', ul)),
    branches: parseNumber($('li:nth-child(2)', ul)),
    releases: parseNumber($('li:nth-child(3)', ul)),
  });
}
function checkContributors(json, repos) {
  if (json.contributors > 0) return Promise.resolve(json);
  var url = repos + '/contributors_size';
  return scrape(url)
    .then(function (html) {
      json.contributors = +html.replace(/\D/g, '');
      return json;
    });
}
//done
function scrapeUserWebAndParse(user) {
  user += '?tab=contributions&period=monthly';
  return scrape(user)
    .then(parseUserWeb);
}
//done
function parseUserWeb(html) {
  var $ = cheerio.load(html);
  var contrib = $('.contrib-column');
  var contrib2 = $('.conversation-list-heading');
  return Promise.resolve({
    contributionYear: getContrib(0),
    contributionMonth: getContrib2(0),
    pullRequestMonth: getContrib2(1),
    longestStreak: getContrib(1),
    currentStreak: getContrib(2),
    starred: parseNumber($('.vcard-stats a:nth-child(2) .vcard-stat-count')),
  });
  function getContrib(num) {
    return parseNumber($('.contrib-number', contrib.eq(num)));
  }
  function getContrib2(num) {
    var icon = num ? '.octicon-git-pull-request' : '.octicon-git-commit';
    var iconEl = $(num, contrib2);
    var isExist = !!iconEl.length;
    return isExist ? parseNumber(iconEl.next()) : 0;
  }
}
//done
function scrape(url, headers, gzip) {
  url = 'https://github.com/' + url;
  var options = {
    url: url,
  };
  if (headers) options.headers = headers;
  if (gzip) options.gzip = gzip;
  console.log(url);
  return request(options);
}
//done
function parseNumber(text) {
  return +text.text().trim().replace(/\D+/g, '');
}
//done
function ajaxHeaders(user) {
  return {
      "Accept": "text/html, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, sdch",
      "Accept-Language": "en-US,en;q=0.8,ko;q=0.6,id;q=0.4,ms;q=0.2,fr;q=0.2",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Host": "github.com",
      "Pragma": "no-cache",
      "Referer": "https//github.com/" + user + "?tab=contributions&period=monthly",
      "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36",
      "X-FirePHP-Version": "0.0.6",
      "X-PJAX": "true",
      "X-PJAX-Container": ".js-contribution-activity",
      "X-Requested-With": "XMLHttpRequest",
  };
}
function formatJSON(json) {
  var user = _.merge({}, json.data, json.web.web);
  user.repositories = json.repositories;
  return user;
}
module.exports = scraper;
