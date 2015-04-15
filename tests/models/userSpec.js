var User = require('../../models/user');
var expect = require('chai').expect;

describe.skip('user model', function () {
  this.timeout(10000);
  it.skip('should insert new user', function (done) {
    User('raabbajam', {user: 'raabbajam'})
      .then(function () {
        console.log('done1');
        done();
      })
      .catch(function (err) {
        if (err.message == 'properties were invalid') {
          console.log('removing duplicate..');
          return done();
        }
        done(err);
      });
  });
  it.skip('should error on duplicate user', function (done) {
    User('raabbajam', {user: 'raabbajam'})
      .then(function () {
        return User('raabbajam', {user: 'raabbajam'});
      })
      .then(function (value) {
        var err = new Error('it should error');
        done(err);
      })
      .catch(function (err) {
        if (err.message == 'properties were invalid') {
          console.log('removing duplicate..');
          return done();
        }
        console.log('done2');
        done();
      });
  });
  it.skip('should get all users id', function (done) {
    User.all()
      .then(function (ids) {
        expect(ids.length).to.gt(0);
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });
  it.skip('should get all users data', function (done) {
    User.all()
      .then(function (ids) {
        return User.get(ids[0]);
      })
      .then(function (data) {
        expect(data.user).to.eq('raabbajam');
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });
});
