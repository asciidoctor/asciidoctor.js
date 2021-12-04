/* global it, describe, beforeEach, afterEach */
const chai = require('chai')
const expect = chai.expect
const childProcess = require('child_process')
const execModule = require('../../tasks/module/exec')
const sinon = require('sinon')
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

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
      expect(result).to.be.true()
      expect(execSyncStub.getCall(0).args[0]).to.equal('git push upstream main')
      expect(execSyncStub.getCall(1).args[0]).to.equal('git push upstream --tags')
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
      expect(result).to.be.false()
      expect(execSyncStub.called).to.be.false()
      execSyncStub.restore()
    })
  })
})
