var redis = require('../../services/redis');
var expect = require('chai').expect;
redis.setPrefix('test');
describe('Redis service', function () {
  this.timeout(30000);
  it('should get succeed count', function (done) {
    redis.incrSucceedCount()
      .then(function (num) {
        console.log(num);
        expect(num).to.gte(0);
        return redis.getSucceedCount();
      })
      .then(function (num) {
        console.log(num);
        expect(num).to.gte(0);
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });
  it('should add and get sampled array', function (done) {
    var id = ~~(Math.random() * 100);
    redis.insertSampledArray(id)
      .then(function (num) {
        console.log(num);
        expect(num).to.eq(1);
        return redis.getSampledArray();
      })
      .then(function (arr) {
        console.log(arr);
        expect(arr.length).to.gte(0);
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });

});
