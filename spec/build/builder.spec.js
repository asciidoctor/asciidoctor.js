/* eslint-env node, es6 */
const child_process = require('child_process');
const execModule = require('../../npm/module/exec');
const sinon = require('sinon');

let childProcessExecSyncStub;

describe('Build', function () {

  beforeEach(function () {
    childProcessExecSyncStub = sinon.stub(child_process, 'execSync');
  });

  afterEach(function () {
    childProcessExecSyncStub.restore();
  });

  describe('Push release', function () {
    it('should be able to find the remote name', function () {
      childProcessExecSyncStub.withArgs('git remote -v')
        .returns('origin	git@github.com:Mogztter/asciidoctor.js.git (fetch)\n' +
                 'origin	git@github.com:Mogztter/asciidoctor.js.git (push)\n' +
                 'upstream	git@github.com:asciidoctor/asciidoctor.js.git (fetch)\n' +
                 'upstream	git@github.com:asciidoctor/asciidoctor.js.git (push)');
      const releaseModule = require('../../npm/module/release.js');
      const execSyncStub = sinon.stub(execModule, 'execSync');
      execSyncStub.returns('void');

      const result = releaseModule.pushRelease();
      expect(result).toBe(true);
      expect(execSyncStub.getCall(0).args[0]).toBe('git push upstream master');
      expect(execSyncStub.getCall(1).args[0]).toBe('git push upstream --tags');
      execSyncStub.restore();
    });

    it('should return false if the original repository is absent', function () {
      childProcessExecSyncStub.withArgs('git remote -v')
        .returns('origin	git@github.com:ldez/asciidoctor.js.git (fetch)\n' +
                 'origin	git@github.com:ldez/asciidoctor.js.git (push)');
      const releaseModule = require('../../npm/module/release.js');
      const execSyncStub = sinon.stub(execModule, 'execSync');
      execSyncStub.returns('void');

      const result = releaseModule.pushRelease();
      expect(result).toBe(false);
      expect(execSyncStub.called).toBe(false);
      execSyncStub.restore();
    });
  });
});
