const log = require('bestikk-log');
const Builder = require('./builder.js');
const builder = new Builder();

const args = process.argv.slice(2);
const runner = args[0];

const runners = ['node', 'chrome', 'nashorn'];
if (!runners.includes(runner)) {
  log.error(`Runner must be one of: ${runners.join(', ')}. 'npm run benchmark [${runners.join('|')}]'`);
  process.exit(9);
}

builder.benchmark(runner);
