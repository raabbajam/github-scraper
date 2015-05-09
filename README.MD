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

npm run
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
