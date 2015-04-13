var config = require('../local');
var Github = require('github');
var github = new Github({
    version: "3.0.0",
    headers: {
        "user-agent": "University-of-Pennsylvania-Research", // GitHub is happy with a unique user agent
    }
});
var credentials = {
    type: "oauth",
    token: config.github.token,
};
github.authenticate(credentials);
module.exports = github;
