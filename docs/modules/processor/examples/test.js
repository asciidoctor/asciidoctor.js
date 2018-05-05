const asciidoctor = require('asciidoctor.js')();

// tag::load-file[]
var doc = asciidoctor.loadFile('sample.adoc');
// end::load-file[]

// tag::document-title[]
console.log(doc.getDocumentTitle()); // The Documentation Chronicles: Based on True Events
// end::document-title[]

// tag::doctitle-partition[]
var doctitle = doc.getDocumentTitle({partition: true});
console.log(doctitle.getMain());     // The Documentation Chronicles
console.log(doctitle.getSubtitle()); // Based on True Events
console.log(doctitle.getCombined()); // The Documentation Chronicles: Based on True Events
console.log(doctitle.hasSubtitle()); // true
// end::doctitle-partition[]

// tag::author[]
console.log(doc.getAuthor()); // Kismet Chameleon
// end::author[]

// tag::author-attributes[]
console.log(doc.getAttribute('author'));         // Kismet Chameleon
console.log(doc.getAttribute('firstname'));      // Kismet
console.log(doc.getAttribute('lastname'));       // Chameleon
console.log(doc.getAttribute('middlename'));     // undefined
console.log(doc.getAttribute('authorinitials')); // KC
console.log(doc.getAttribute('email'));          // kismet@asciidoctor.org
// end::author-attributes[]

// tag::revision[]
console.log(doc.getRevisionDate());   // October 2, 2018
console.log(doc.getRevisionNumber()); // 1.0
console.log(doc.getRevisionRemark()); // First incarnation
// end::revision[]

// tag::revision-info[]
var revisionInfo = doc.getRevisionInfo();
console.log(revisionInfo.getDate());   // October 2, 2018
console.log(revisionInfo.getNumber()); // 1.0
console.log(revisionInfo.getRemark()); // First incarnation
// end::revision-info[]

// tag::has-revision-info[]
console.log(doc.hasRevisionInfo()); // true
// end::has-revision-info[]

// tag::revision-attributes[]
console.log(doc.getAttribute('revdate'));   // October 2, 2018
console.log(doc.getAttribute('revnumber')); // 1.0
console.log(doc.getAttribute('revremark')); // First incarnation
// end::revision-attributes[]
