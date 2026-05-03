import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import childProcess from 'node:child_process'
import sinon from 'sinon'
import { pushRelease } from '../tasks/release.js'

let childProcessExecSyncStub

describe('Build', () => {
  beforeEach(() => {
    childProcessExecSyncStub = sinon.stub(childProcess, 'execSync').returns('')
  })

  afterEach(() => {
    childProcessExecSyncStub.restore()
  })

  describe('Push release', () => {
    test('find the remote name', () => {
      childProcessExecSyncStub
        .withArgs('git remote -v')
        .returns(
          'origin\tgit@github.com:ggrossetie/asciidoctor.js.git\t(fetch)\n' +
            'origin\tgit@github.com:ggrossetie/asciidoctor.js.git\t(push)\n' +
            'upstream\tgit@github.com:asciidoctor/asciidoctor.js.git\t(fetch)\n' +
            'upstream\tgit@github.com:asciidoctor/asciidoctor.js.git\t(push)'
        )

      const result = pushRelease()
      assert.equal(result, true, 'pushRelease should return true')

      const pushCalls = childProcessExecSyncStub.args.filter(([cmd]) =>
        cmd.startsWith('git push')
      )
      assert.equal(pushCalls[0][0], 'git push upstream main')
      assert.equal(pushCalls[1][0], 'git push upstream --tags')
    })

    test('return false if the original repository is absent', () => {
      childProcessExecSyncStub
        .withArgs('git remote -v')
        .returns(
          'origin\tgit@github.com:ldez/asciidoctor.js.git (fetch)\n' +
            'origin\tgit@github.com:ldez/asciidoctor.js.git (push)'
        )

      const result = pushRelease()
      assert.equal(result, false, 'pushRelease should return false')

      const pushCalls = childProcessExecSyncStub.args.filter(([cmd]) =>
        cmd.startsWith('git push')
      )
      assert.equal(pushCalls.length, 0, 'git push should not be called')
    })
  })
})
