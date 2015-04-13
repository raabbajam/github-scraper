var config = require('../local');
var google = require('googleapis');
var Promise = require('bluebird');
var oauth2Client = new google.auth.OAuth2(config.google.clientId, config.google.clientSecret, 'http://localhost');
var jwtClient = new google.auth.JWT(
  config.google.jwt.client_email,
  config.google.jwt.key_file,
  null,
  ['https://www.googleapis.com/auth/bigquery']
);
function init() {
  return new Promise(function(resolve, reject) {
    jwtClient.authorize(function (err, result) {
      if (err) return reject(err);
      console.log('result', result);
      oauth2Client.setCredentials({
        access_token: result.access_token
      });
      google.options({auth:  oauth2Client});
      return resolve();
    });
  });
}
// google.options({auth: config.google.api});
google.raInit = init;
module.exports = google;
