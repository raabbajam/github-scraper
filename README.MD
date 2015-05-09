#Github-scraper
How to use

After cloning it to local
```
git clone git@github.com:raabbajam/github-scraper
cd github-scraper
npm i
```
create a local.js file with your credentials
```
cp local.sample.js local.js
nano local.js
```


type npm run to see what commands you can use

```
npm run
```

Here is some command
```
  test
    DEBUG=raabbajam:* CONFIG=test mocha tests/*Spec.js tests/**/*Spec.js
  start
    DEBUG=raabbajam:* node index.js
  filter
    DEBUG=raabbajam:* node filter.js
  scraper
    DEBUG=raabbajam:* node scraper.js
  formatter
    DEBUG=raabbajam:* node formatter.js
  restarter
    DEBUG=raabbajam:* node restart.js
  pm2:sampler
    DEBUG=raabbajam:* pm2 start index.js
  pm2:filter
    DEBUG=raabbajam:* pm2 start filter.js
  pm2:scraper
    DEBUG=raabbajam:* pm2 start scraper.js
  log:filter
    DEBUG=raabbajam:* pm2 logs filter
  s:all
    pssh -l root -o /tmp/out -h ./servers.txt
  all:filter
    pssh -l root -o /tmp/out -h ./servers.txt 'pm2 reload filter'
```

## File structure

`index.js` run using command `npm start`. This script will take a random sample of github user and put it on data storage, for filter task.
`filter.js` run using command `npm run filter`. This script will take a filter task from redis and check if it suitable based on requirement. If suitable will be put in data storage for further scrape task.
`scraper.js` run using command `npm run scraper`. This script will take a filtered user and will start scrape everything about this user and it's repositories data. In the end it will put scraper data to data storage.
`formatter.js` run using command `npm run formatter`. This script will take all scraped data and will outputted a formatted csv and json.
`restart.js` run using command `npm run restarter`. This script will take remove all old data and restart the project from zero.

`services/` is a directory for custom package that can only used in this project
`libs/` is a directory for a unit package or method that can be reused on other project
