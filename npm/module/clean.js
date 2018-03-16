'use strict';
const bfs = require('bestikk-fs');
const log = require('bestikk-log');

const removeBuildDirSync = () => {
  log.debug('remove build directory');
  bfs.removeSync('build');
  bfs.mkdirsSync('build/css');
};

module.exports.clean = (callback) => {
  if (process.env.SKIP_CLEAN) {
    log.info('SKIP_CLEAN environment variable is true, skipping "clean" task');
    typeof callback === 'function' && callback();
    return;
  }
  log.task('clean');
  removeBuildDirSync(); // remove build directory
  typeof callback === 'function' && callback();
};
