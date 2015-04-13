var expect = require('chai').expect;
var getUserData = require('../../libs/getUserData');
var filterer = require('../../libs/filterer');
var _ = require('highland');
var es = require('event-stream');
describe.skip('filterer library', function () {
  this.timeout(20000);
  it('should filter user based on specification', function (done) {
    _(['raabbajam'])
      .pipe(es.map(getUserData))
      .pipe(es.writeArray(function (err, data) {
        done();
      }));
  });
});
