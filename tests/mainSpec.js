var expect = require('chai').expect;
var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');
var read = fs.readFileSync;
var write = fs.writeFileSync;
var debug = require('debug')('raabbajam:tests:main');
var sampler = require('../libs/sampler');
var filterEmail = require('../libs/filterEmail');
var filterContribution = require('../libs/filterContribution');
var loadModule = require('./module-loader').loadModule;
var scraper = loadModule('../libs/scraper.js');
describe('Main process', function () {
  this.timeout(300000);
  it.skip('should get sampler', function (done) {
    sampler()
      .then(function (user) {
        debug(user);
        expect(user).to.exist;
        done();
      }, done);
  });
  it.skip('should filter user with no email', function (done) {
    Promise.resolve('raabbajam')
      .then(filterEmail)
      .then(function (user) {
        expect(user).to.eq('raabbajam');
        debug('spec',user);
        done();
      }, done);
  });
  it.skip('should filter user with repos collaboration less than 10', function (done) {
    Promise.resolve('raabbajam')
      .then(filterContribution)
      .then(function (user) {
        expect(user).to.eq('raabbajam');
        debug('spec',user);
        done();
      }, done);
  });
  describe('Scraper library', function () {
    it.skip('should get user data', function (done) {
      scraper.getData('raabbajam')
        .then(function (data) {
          expect(data.email).to.eq('raabbajam@gmail.com');
          done();
        })
        .catch(function (err) {
          debug(err.stack);
          done(err);
        });
    });
    it.skip('should parse repo web', function (done) {
      var html = read(path.join(__dirname, 'html', 'repo.html'));
      scraper.parseRepoWeb(html)
        .then(function (data) {
          debug(data);
          expect(data.name).to.eq('raabbajam/priceCacheCalendar');
          write(path.join(__dirname, 'json', 'repo.json'), data);
          done();
        });
    });
    it.skip('should scrape repo web', function (done) {
      scraper.scrapeRepoWebAndParse('raabbajam/priceCacheCalendar')
        .then(function (data) {
          expect(data.name).to.eq('raabbajam/priceCacheCalendar');
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
    it.skip('should get user repo data', function (done) {
      scraper.getUserRepoDataAndParse('raabbajam/priceCacheCalendar', 'raabbajam')
        .then(function (data) {
          debug(data);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
    it.skip('should get user repositories', function (done) {
      scraper.getRepositories('raabbajam')
        .then(scraper.getContributors)
        .then(scraper.getTopTen)
        .then(scraper.populateReposData)
        .then(function (data) {
          debug(data);
          expect(data.length).to.lte(10);
          done();
        })
        .catch(function (err) {
          debug(err.stack);
          done(err);
        });
    });
    it.skip('should get user web data', function (done) {
      scraper.getWeb('raabbajam')
        .then(function (data) {
          expect(data.web.starred).to.gt(0);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
    it.skip('should get repositories contributed count', function (done) {
      scraper.getRepositoriesCount('raabbajam')
        .then(function (data) {
          expect(data).to.gt(1);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
    it.skip('should get user month contribution', function (done) {
      scraper.getMonthContribution('raabbajam', '2014-01-01')
      .then(function (num) {
        expect(num).to.eq(0);
        return scraper.getMonthContribution('raabbajam', '2015-04-01');
      })
      .then(function (num) {
        expect(num).to.gt(0);
        done();
      })
      .catch(function (err) {
        done(err);
      });
    });
    it.skip('should get user overall contribution', function (done) {
      scraper.getOverallContribution({username: 'raabbajam', joinDate: '2014-08-21T01:36:17Z'})
        .then(function (user) {
          debug(user.overallContributions);
          expect(user.overallContributions).to.gt(0);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
    it.skip('should get repositories data', function (done) {
      var html = read(path.join(__dirname, 'html', 'contributionMonth.html'));
      var json = scraper.parseMonthly(html);
      debug(json);
      expect(json.repositories.length).to.gt(0);
      expect(json.contribution).to.gt(0);
      done();
    });
    it.skip('should get pull request data', function (done) {
      var html = read(path.join(__dirname, 'html', 'pull.html'));
      var repositories = scraper.parsePullRequestRepo(html);
      debug(repositories);
      expect(repositories.length).to.gt(0);
      done();
    });
    it.skip('should init request service', function (done) {
      scraper.getPullRequestRepo('raabbajam')
        .then(function (html) {
          var repositories = scraper.parsePullRequestRepo(html);
          debug(repositories);
          expect(repositories.length).to.gt(0);
          return scraper.getPullRequestRepo('agusnurwanto');
        })
        .then(function (html) {
          var repositories = scraper.parsePullRequestRepo(html);
          debug(repositories);
          expect(repositories.length).to.gt(0);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
    it('should get user and repo data', function (done) {
      scraper.scraper('raabbajam')
        .then(function (data) {
          debug(data);
          write(path.join(__dirname, 'json', 'all.json'), JSON.stringify(data, null, 2));
          expect(data.repositories).to.exist;
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });
});
