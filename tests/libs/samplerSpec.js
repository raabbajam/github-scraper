var expect = require('chai').expect;
var sampler = require('../../libs/sampler');

describe.skip('sampler library', function () {
  this.timeout(20000);
  it.skip('should get random user from github api', function (done) {
    sampler()
      .then(function (user) {
        console.log(user);
        expect(user).to.be.exist;
        return sampler();
      })
      .then(function (user) {
        console.log(user);
        expect(user).to.be.exist;
        done();
      })
      .catch(function (err) {
        console.log(err.stack);
        done(err);
      });
  });
});
