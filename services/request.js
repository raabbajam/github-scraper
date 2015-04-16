var config = require('../local');
var debug = require('debug')('raabbajam:service:request');
var request = require('request')
  .defaults({
    pool: {maxSockets: Infinity},
  });
var Promise = require('bluebird');
var cheerio = require('cheerio');
var faker = require('faker');
var initialized = false;
var j = request.jar();
var cookie;
var ua;
Promise.promisifyAll(request);
function get(options) {
  // debug(options);
  return init()
    .then(function () {
      if (options.jar) {
        // options.jar = j;
        delete options.jar;
        options.gzip = true;
        options.headers = options.headers || getHeaderLogin();
        options.headers['User-Agent'] = ua;
        debug('Request using cookie!');
      }
      return request.getAsync(options);
    })
    .then(function (res) {
      // delete res[0].body;
      if (res[0].statusCode !== 200) {
        throw new Error('Status code ' + res[0].statusCode);
      }
      debug(options.url);
      return res[1];
    });
}
function init() {
  return new Promise(function(resolve, reject) {
    if (initialized) return resolve();
    debug('logging in to github');
    initialized = true;
    var url = 'https://github.com/login';
    var urlPost = 'https://github.com/session';
    var formData = getFormData();
    var headers = getHeader();
    headers["User-Agent"] = ua = faker.internet.userAgent();
    var loginOptions = {
      url: url,
      headers: {
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding":"gzip, deflate, sdch",
        "Accept-Language":"en-US,en;q=0.8,ko;q=0.6,id;q=0.4,ms;q=0.2,fr;q=0.2",
        "Connection":"keep-alive",
        "Host":"github.com",
        "User-Agent": ua,
      },
      jar: j,
      gzip: true,
      followRedirect: true,
    };
    request(loginOptions, function (err, res, body) {
      if (err) return reject(err);
      var $ = cheerio.load(body);
      formData.authenticity_token = $('input[name=authenticity_token]').val();
      var options = {
        method: 'POST',
        url: urlPost,
        form: formData,
        headers: headers,
        jar: j,
        followRedirect: true,
      };
      request(options, function (err, res, body) {
        if (err) return reject(err);
        cookie = j.getCookieString('https://github.com');
        debug('Got cookie %s!', cookie);
        return resolve();
      });
    });
  });
}
function getFormData() {
  return {
    "utf8":"✓",
    "login": config.github.username,
    "password":config.github.password
  };
}
function getHeader() {
  return {
    "Host": "github.com",
    "Connection": "keep-alive",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Origin": "https://github.com",
    "X-FirePHP-Version": "0.0.6",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://github.com/",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.8,ko;q=0.6,id;q=0.4,ms;q=0.2,fr;q=0.2",
  };
}
function getHeaderLogin() {
  return {
    "Content-Type": "application/json",
    // "Cookie": "_octo=GH1.1.540309407.1410317803; logged_in=yes; dotcom_user=raabbajam; user_session=m5vKPIqFhptnlhaVfH_uCbArvc_Ol_RsRQj1BodNe87YnLN4VS95VTrQ0ek_Yh4-I9PuBfwTEMNgd3op; _gh_sess=eyJsYXN0X3dyaXRlIjoxNDI5MTc0NjExMjk5LCJzZXNzaW9uX2lkIjoiMDVkNzFhMzlhMDQ0Y2NlNGU4YWU0YjllZGRkMGQyMWEiLCJjb250ZXh0IjoiLyJ9--6b4e1380b4dc382267ea5a831c6a699a54c4f9dd; tz=Asia%2FJakarta; _ga=GA1.2.1598046918.1410317799; _gat=1",
    "Cookie": cookie,
    // "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, sdch",
    "Accept-Language": "en-US,en;q=0.8,ko;q=0.6,id;q=0.4,ms;q=0.2,fr;q=0.2",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Host": "github.com",
    "Pragma": "no-cache",
    "X-FirePHP-Version": "0.0.6",
  };
}
get.init = init;
module.exports = get;
