/* global it, describe */
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const semVer = require('./semver.cjs')

describe('Semantic Versioning', () => {
  it('should ignore .dev suffix (eq)', () => {
    expect(semVer('1.2.3').eq('1.2.3')).to.be.true()
    expect(semVer('1.2.3.dev').eq('1.2.3')).to.be.true()
  })

  it('should compare two versions (lt)', () => {
    expect(semVer('0.2.3').lt('1.2.3')).to.be.true()
    expect(semVer('1.1.3').lt('1.2.3')).to.be.true()
    expect(semVer('1.2.2').lt('1.2.3')).to.be.true()
    expect(semVer('1.2.9').lt('1.2.11')).to.be.true()
    expect(semVer('1.2.3').lt('1.2.3')).to.be.false()
    expect(semVer('2.2.3').lt('1.2.3')).to.be.false()
    expect(semVer('1.3.3').lt('1.2.3')).to.be.false()
    expect(semVer('1.2.4').lt('1.2.3')).to.be.false()
    expect(semVer('1.2.11').lt('1.2.9')).to.be.false()
  })

  it('should compare two versions (gt)', () => {
    expect(semVer('0.2.3').gt('1.2.3')).to.be.false()
    expect(semVer('1.1.3').gt('1.2.3')).to.be.false()
    expect(semVer('1.2.2').gt('1.2.3')).to.be.false()
    expect(semVer('1.2.9').gt('1.2.11')).to.be.false()
    expect(semVer('1.2.3').gt('1.2.3')).to.be.false()
    expect(semVer('2.2.3').gt('1.2.3')).to.be.true()
    expect(semVer('1.3.3').gt('1.2.3')).to.be.true()
    expect(semVer('1.2.4').gt('1.2.3')).to.be.true()
    expect(semVer('1.2.11').gt('1.2.9')).to.be.true()
  })

  it('should compare two versions (gte)', () => {
    expect(semVer('0.2.3').gte('1.2.3')).to.be.false()
    expect(semVer('1.1.3').gte('1.2.3')).to.be.false()
    expect(semVer('1.2.2').gte('1.2.3')).to.be.false()
    expect(semVer('1.2.9').gte('1.2.11')).to.be.false()
    expect(semVer('1.2.3').gte('1.2.3')).to.be.true()
    expect(semVer('2.2.3').gte('1.2.3')).to.be.true()
    expect(semVer('1.3.3').gte('1.2.3')).to.be.true()
    expect(semVer('1.2.4').gte('1.2.3')).to.be.true()
    expect(semVer('1.2.11').gte('1.2.9')).to.be.true()
  })

  it('should compare two versions (lte)', () => {
    expect(semVer('0.2.3').lte('1.2.3')).to.be.true()
    expect(semVer('1.1.3').lte('1.2.3')).to.be.true()
    expect(semVer('1.2.2').lte('1.2.3')).to.be.true()
    expect(semVer('1.2.9').lte('1.2.11')).to.be.true()
    expect(semVer('1.2.3').lte('1.2.3')).to.be.true()
    expect(semVer('2.2.3').lte('1.2.3')).to.be.false()
    expect(semVer('1.3.3').lte('1.2.3')).to.be.false()
    expect(semVer('1.2.4').lte('1.2.3')).to.be.false()
    expect(semVer('1.2.11').lte('1.2.9')).to.be.false()
  })
})
