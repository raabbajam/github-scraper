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
  this.timeout(100000);
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
          expect(data.login).to.eq('raabbajam');
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
    it('should get user repo data', function (done) {
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
  });
});
