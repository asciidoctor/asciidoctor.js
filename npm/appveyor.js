var Log = require('./log.js');
var Builder = require('./builder.js');
var builder = new Builder();
var log = new Log();

log.title('Appveyor');
builder.build();

if (process.env.APPVEYOR_SCHEDULED_BUILD) {
  log.debug('Smoke test on JDK 8');
  builder.execSync('bundle exec rake jdk8_ea');

  log.debug('Smoke test on JDK 9');
  builder.execSync('bundle exec rake jdk9_ea');
}
