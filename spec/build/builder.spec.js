const {
  describe,
  it,
  beforeEach,
  afterEach
} = require('node:test')
const assert = require('node:assert')
const childProcess = require('child_process')
const execModule = require('../../tasks/module/exec')
const sinon = require('sinon')

let childProcessExecSyncStub

describe('Build', function () {
  beforeEach(function () {
    childProcessExecSyncStub = sinon.stub(childProcess, 'execSync')
  })

  afterEach(function () {
    childProcessExecSyncStub.restore()
  })

  describe('Push release', function () {
    it('should be able to find the remote name', function () {
      childProcessExecSyncStub.withArgs('git remote -v')
        .returns('origin\tgit@github.com:Mogztter/asciidoctor.js.git\t(fetch)\n' +
          'origin\tgit@github.com:Mogztter/asciidoctor.js.git\t(push)\n' +
          'upstream\tgit@github.com:asciidoctor/asciidoctor.js.git\t(fetch)\n' +
          'upstream\tgit@github.com:asciidoctor/asciidoctor.js.git\t(push)')
      const releaseModule = require('../../tasks/module/release.js')
      const execSyncStub = sinon.stub(execModule, 'execSync')
      execSyncStub.returns('void')

      const result = releaseModule.pushRelease()
      assert.equal(result, true, 'pushRelease should return true')
      assert.equal(execSyncStub.getCall(0).args[0], 'git push upstream main')
      assert.equal(execSyncStub.getCall(1).args[0], 'git push upstream --tags')
      execSyncStub.restore()
    })

    it('should return false if the original repository is absent', function () {
      childProcessExecSyncStub.withArgs('git remote -v')
        .returns('origin\tgit@github.com:ldez/asciidoctor.js.git (fetch)\n' +
          'origin\tgit@github.com:ldez/asciidoctor.js.git (push)')
      const releaseModule = require('../../tasks/module/release.js')
      const execSyncStub = sinon.stub(execModule, 'execSync')
      execSyncStub.returns('void')

      const result = releaseModule.pushRelease()
      assert.equal(result, false, 'pushRelease should return false')
      assert.equal(execSyncStub.called, false, 'execSync should not be called')
      execSyncStub.restore()
    })
  })
})
