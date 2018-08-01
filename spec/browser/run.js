/* eslint-env node, es6 */
const path = require('path');
const puppeteer = require('puppeteer');

// puppeteer options
const opts = {
  headless: true,
  timeout: 10000,
  args: [ '--allow-file-access-from-files', '--no-sandbox' ]
};

const log = async (msg) => {
  const args = [];
  for (let i = 0; i < msg.args().length; ++i) {
    args.push(await msg.args()[i].jsonValue());
  }
  const type = msg.type();
  let log;
  if (type === 'warning') {
    // eslint-disable-next-line no-console
    log = console.warn;
  } else {
    // eslint-disable-next-line no-console
    log = console[msg.type()];
  }
  log.apply(this, args);
  return args;
};

(async function () {
  try {
    const browser = await puppeteer.launch(opts);
    const page = await browser.newPage();
    page.exposeFunction('mochaOpts', () => ({reporter: 'spec'}));
    page.on('console', async (msg) => {
      const args = await log(msg);
      if (args[0] === '%d failures') {
        process.exit(parseInt(args[1]));
      } else if (args[0].startsWith('Unable to start the browser tests suite:')) {
        process.exit(1);
      }
    });
    await page.goto('file://' + path.join(__dirname, 'index.html'), {waitUntil: 'networkidle2'});
    browser.close();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unable to run tests using Puppeteer', err);
    process.exit(1);
  }
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Unable to launch Chrome with Puppeteer', err);
  process.exit(1);
});
