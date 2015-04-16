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
var concurrency = 10;
function scraper(user) {
  return request.init()
    .then(function (value) {
      return getDataAndRepo(user);
    })
    .then(formatJSON)
    .catch(function (err) {
      // TODO log error
      debug('Error Main', err.stack);
      return Promise.reject(err);
    });
}
function getDataAndRepo(user) {
  return Promise.props({
    data: getData(user),
    web: getWeb(user),
  })
  .then(function (val) {
    debug('getDataAndRepo finished');
    return val;
  });
}
function getWeb(user) {
  return Promise.props({
    web: scrapeUserWebAndParse(user),
  });
}
//done
function getData(user) {
  return getUserData(user)
    .then(getOverallData)
    .then(addPullRequestRepo)
    .then(addIssueRepo)
    .then(getTopTenRepositories);
}
function getUserData(user) {
  return new Promise(function(resolve, reject) {
    github.user.getFrom({
      user: user,
    }, function (err, data) {
      debug('github.user.getFrom');
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
function getOverallData(user) {
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
  return Promise.settle(months, {concurrency: concurrency})
    .then(function (values) {
      return values.filter(function (res) {
        return res.isFulfilled();
      })
      .map(function (res) {
        return res.value();
      });
    })
    .then(function (contributes) {
      var overallContributions = contributes.reduce(function (all, monthly) {
        return all + monthly.contribution;
      }, 0);
      var allRepositories = _.unique(contributes.reduce(function (all, monthly) {
        return all.concat(monthly.repositories);
      }, []));
      user.overallContributions = overallContributions;
      user.repositories = allRepositories;
      user.repositoriesContributed = allRepositories.length;
      return user;
    });
}
function getMonthContribution(user, month) {
  var now = moment().format(outputFormat);
  var url = user + '?tab=contributions&from=' + month + '&to=' + now + '&_pjax=.js-contribution-activity';
  var headers = ajaxHeaders(user);
  return scrape(url, headers, true)
    .then(parseMonthly);
}
function parseMonthly(html) {
  var $ = cheerio.load(html);
  return {
    contribution: getContribution(),
    repositories: getRepositories(),
  };
  function getContribution() {
    var contrib = $('.conversation-list-heading');
    if (!contrib.length) return 0;
    var iconEl = $('.octicon-git-commit', contrib);
    var isExist = !!iconEl.length;
    return isExist ? parseNumber(iconEl.next()) : 0;
  }
  function getRepositories() {
    return _.map($('ul.simple-conversation-list a, ol.simple-conversation-list .cmeta a'), function (a) {
      return $(a).text().match(/[\w\-]+\/[\w\-]+/)[0];
    });
  }
}
function addPullRequestRepo(user) {
  return getPullRequestRepo(user.username)
    .then(parsePullRequestRepo)
    .then(function (repos) {
      debug('pull request repo %s', repos);
      user.repositories = _.unique(user.repositories.concat(repos));
      return user;
    });
}
function getPullRequestRepo(user) {
  return scrape('pulls?utf8=%E2%9C%93&q=is%3Apr+author%3A' + user, null, null, true);
}
function parsePullRequestRepo(html) {
  var $ = cheerio.load(html);
  return _.map($('a.issue-title-link.issue-nwo-link'), function (a) {
    return $(a).text().trim();
  });
}
function addIssueRepo(user) {
  return getIssueRepo(user.username)
    .then(parseIssueRepo)
    .then(function (repos) {
      debug('issue repo %s', repos);
      user.repositories = _.unique(user.repositories.concat(repos));
      return user;
    });
}
function getIssueRepo(user) {
  return scrape('issues?utf8=%E2%9C%93&q=is%3Apr+author%3A' + user, null, null, true);
}
function parseIssueRepo(html) {
  var $ = cheerio.load(html);
  return _.map($('a.issue-title-link.issue-nwo-link'), function (a) {
    return $(a).text().trim();
  });
}
//done
function getTopTenRepositories(user) {
  return getContributors(user.repositories)
    .then(getTopTen)
    .then(function (repos) {
      return populateReposData(repos, user);
    })
    .then(function (repos) {
      user.repositories = repos;
      debug('getTopTenRepositories finished');
      return user;
    });
}
//done
function getRepositories(user) {
  return new Promise(function(resolve, reject) {
    /*var query = "SELECT repository_url \nFROM [githubarchive:github.timeline]\nWHERE payload_pull_request_user_login ='" + user + "' or repository_owner ='" + user + "'\nGROUP BY repository_url;";
    google.raInit()
      .then(function () {
        googleBigQuery.jobs.query({
            projectId: config.google.projectId,
            resource: {
              query: query,
            },
          }, function (err, data) {
            if (err) return reject(err);
            if (!data.rows) {
              return reject(new Error('No data rows: ' + query));
            }
            data = data.rows.map(function (row) {
              return row.f[0].v.replace('https://github.com/', '');
            });
            return resolve(data);
          });
      });*/

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
        debug('github.repos.getContributors %s', repoName);
        if (err) return reject(err);
        return resolve({
          repository: repoName,
          contributors: users.length,
          user: user,
        });
      });
    });
  });
  return Promise.settle(repos, {concurrency: concurrency})
    .then(function (values) {
      return values.filter(function (res) {
        return res.isFulfilled();
      })
      .map(function (res) {
        return res.value();
      });
    });
}
//done
function getTopTen(repos) {
  // debug(repos);
  return _.sortBy(repos, function (repo) {
    return +repo.contributors || 0;
  }).reverse().slice(0, 10);
}
//done
function populateReposData(repos, user) {
  debug('populateReposData %d', repos.length);
  repos = repos.map(function (repo) {
    return populateRepoData(repo, user);
  });
  return Promise.settle(repos, {concurrency: concurrency})
    .then(function (values) {
      debug('POPULATEREPOSDATA FINISH');
      return values.filter(function (res) {
        return res.isFulfilled();
      })
      .map(function (res) {
        return res.value();
      });
    })
    .catch(function (err) {
      throw(err);
    });
}
//done
function populateRepoData(repo, user) {
  var repoName = repo.repository;
  return Promise.props({
    data: getRepoDataAndParse(repoName),
    userData: getUserRepoDataAndParse(repoName, user.username),
    web: scrapeRepoWebAndParse(repoName),
  }).then(function (repo) {
    debug('merge after populateRepoData');
    return _.merge({}, repo.data, repo.userData, repo.web);
  });
}
//done
function getRepoDataAndParse(repoName) {
  return getRepoData(repoName)
    .then(parseRepoJSON)
    .then(function (value) {
      debug('finish getRepoDataAndParse!!!!');
      return value;
    });
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
      debug('github.repos.get');
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
      debug('github.repos.getStatsContributors');
      if (err) return reject(err);
      var output = {
        commitLastMonth: getCommitLastMonth(data),
        userCommitLastMonth: getUserCommitLastMonth(data, user),
        userCommitOverall: getUserCommitOverall(data),
      };
      debug('finish getUserRepoDataAndParse');
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
      debug('finish scrapeRepoWebAndParse');
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
  return new Promise(function(resolve, reject) {
    debug('checkContributors %s', repos);
    if (json.contributors > 0) return resolve(json);
    debug('json.contributors is %d < 0', json.contributors);
    var url = repos + '/contributors_size';
    scrape(url)
      .then(function (html) {
        json.contributors = +html.replace(/\D/g, '');
        return resolve(json);
      })
      .catch(function (err) {
        return reject(err);
      });
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
    var iconEl = $(icon, contrib2);
    var isExist = !!iconEl.length;
    return isExist ? parseNumber(iconEl.next()) : 0;
  }
}
//done
function scrape(url, headers, gzip, jar) {
  url = 'https://github.com/' + url;
  var options = {
    url: url,
  };
  if (headers) options.headers = headers;
  if (gzip) options.gzip = gzip;
  if (jar) options.jar = jar;
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
  debug('formatJSON');
  var user = _.merge({}, json.data, json.web.web);
  // user.repositories = json.repositories;
  return user;
}
module.exports = scraper;
