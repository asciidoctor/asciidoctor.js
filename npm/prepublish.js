'use strict';

const fs = require('fs');

const RefMacroRx = new RegExp('(image:)?(?:(https?:[^\\[]+)|{([a-z0-9_-]+)})\\[(|.*?[^\\\\])\\]', 'g');

const markdownify = (asciidoc) => {
  const attrs = asciidoc
    .split('\n\n')[0]
    .split('\n')
    .filter((line) => line.charAt(0) === ':')
    .reduce((accum, line) => {
      let [, name, value] = line.match(/^:([^:]+):(?: (.+)|)$/);
      if (value && ~value.indexOf('{')) value = value.replace(/\{([^}]+)\}/, (_, refname) => accum[refname]);
      accum[name] = value || '';
      return accum;
    }, { 'uri-rel-file-base': 'https://github.com/asciidoctor/asciidoctor.js/blob/master/' });
  let verbatim = false;
  return asciidoc
    .split('\n')
    .filter((line) => !(line.charAt(0) === ':' || line.charAt(0) === '[' || ~line.indexOf('::') || ~line.indexOf('>; ')))
    .map((line) => {
      if (line.charAt(0) === '=') {
        line = line.replace(/^=+(?= \w)/, (m) => '#'.repeat(m.length));
      } else if (line.charAt(0) === '.') {
        line = '**' + line.substr(1) + '**';
      } else if (line.charAt(0) === '`' && line.startsWith('```')) {
        verbatim = !verbatim;
      } else if (!verbatim && line.charAt(0) !== ' ') {
        line = line.replace(RefMacroRx, (_, img, uri, attrname, content) =>
          `${img ? '!' : ''}[${content.split(',')[0]}](${attrname ? attrs[attrname] : uri})`);
      }
      if (line.startsWith('IMPORTANT: ')) line = '**IMPORTANT:** ' + line.substr(11);
      return line;
    })
    .join('\n');
};

// Transform README.adoc into README.md and hide README.adoc
fs.readFile('README.adoc', 'utf8', (readErr, asciidoc) => {
  if (readErr) throw readErr;
  fs.rename('README.adoc', '.README.adoc', (renameErr) => {
    if (renameErr) throw renameErr;
  });
  fs.writeFile('README.md', markdownify(asciidoc), (writeErr) => {
    if (writeErr) throw writeErr;
  });
});
