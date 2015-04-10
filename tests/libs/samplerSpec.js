var expect = require('chai').expect;
var sampler = require('../../libs/sampler');

describe('sampler library', function () {
  this.timeout(20000);
  it('should get random users from github api', function (done) {
    sampler()
      .then(function (users) {
        expect(users.length).to.be.above(0);
        return sampler();
      })
      .then(function (users) {
        expect(users.length).to.be.above(0);
        done();
      })
      .catch(function (err) {
        console.log(err.stack);
        done(err);
      });
  });
});
