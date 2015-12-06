var child_process = require('child_process');
var fs = require('fs')
var Log = require('./log.js');
var log = new Log();
var Build = require('./build.js');
var build = new Build();

var stdout;

var args = process.argv.slice(2);
var releaseVersion = args[0];

if (typeof releaseVersion === 'undefined') {
  log.error("Release version is undefined, please specify a version 'npm run release 1.0.0'");
  process.exit(9);
}

log.title('Release version: ' + releaseVersion);

if (process.env.DRY_RUN) {
  log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable');
}

build.replaceFileSync('package.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');
build.replaceFileSync('bower.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');

if (process.env.DRY_RUN) {
  log.debug('dist');
} else {
  build.dist();
}

build.execSync('git add -A .');
build.execSync('git commit -m "Prepare version ' + releaseVersion + '"');
build.execSync('git tag v' + releaseVersion);
build.execSync('npm publish');

console.log('');
log.info('To complete the release, you need to:');
log.info("[ ] push changes upstream: 'git push origin master && git push origin " + releaseVersion + "'");
log.info("[ ] publish a release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/new");
log.info('[ ] create an issue here: https://github.com/webjars/asciidoctor.js to update Webjars');
