const ospath = require('path')

module.exports.configure = (mockServer) => {
  const baseDirRelativeFile = (file) => {
    return {
      webPath: `/${file.path}`,
      path: ospath.join(__dirname, '..', '..', file.path),
      mimetype: file.mimetype
    }
  }
  const rootRelativeFile = (file) => {
    const webPath = file.path
      .replace(/\.\./g, '')
      .replace(/\/\//g, '/')
    return {
      webPath: webPath.startsWith('/') ? webPath : `/${webPath}`,
      path: ospath.join(__dirname, file.path),
      mimetype: file.mimetype
    }
  }
  const files = [
    {
      webPath: '/index.html',
      path: ospath.join(__dirname, 'index.html'),
      mimetype: 'text/html'
    }
  ]
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/images/litoria-chloris.jpg',
    mimetype: 'image/jpg'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/images/cat.png',
    mimetype: 'image/png'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/images/cc-zero.svg',
    mimetype: 'image/svg+xml'
  }))
  files.push(baseDirRelativeFile({
    path: 'build/css/asciidoctor.css',
    mimetype: 'text/plain'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/test.adoc',
    mimetype: 'text/plain'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/include-tag.adoc',
    mimetype: 'text/plain'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/include-lines.adoc',
    mimetype: 'text/plain'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/include.adoc',
    mimetype: 'text/plain'
  }))
  files.push(baseDirRelativeFile({
    path: 'spec/fixtures/sales.csv',
    mimetype: 'text/plain'
  }))
  files.push(rootRelativeFile({
    path: '../../node_modules/mocha/mocha.js',
    mimetype: 'application/javascript'
  }))
  files.push(rootRelativeFile({
    path: '../../node_modules/mocha/mocha.css',
    mimetype: 'text/plain'
  }))
  files.push(rootRelativeFile({
    path: '../../node_modules/chai/chai.js',
    mimetype: 'application/javascript'
  }))
  files.push(rootRelativeFile({
    path: '../../node_modules/dirty-chai/lib/dirty-chai.js',
    mimetype: 'application/javascript'
  }))
  files.push(rootRelativeFile({
    path: '../share/asciidoctor-spec.cjs',
    mimetype: 'application/javascript'
  }))
  files.push(rootRelativeFile({
    path: '../share/asciidoctor-include-file-spec.cjs',
    mimetype: 'application/javascript'
  }))
  files.push(rootRelativeFile({
    path: '../share/asciidoctor-include-https-spec.cjs',
    mimetype: 'application/javascript'
  }))
  files.push(rootRelativeFile({
    path: '../share/semver.cjs',
    mimetype: 'application/javascript'
  }))
  files.push({
    path: ospath.join(__dirname, 'asciidoctor-spec.js'),
    webPath: '/asciidoctor-spec.js',
    mimetype: 'application/javascript'
  })
  files.push(rootRelativeFile({
    path: '../../build/asciidoctor-browser.js',
    mimetype: 'application/javascript'
  }))
  mockServer.registerFiles(files)
}
