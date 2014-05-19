module.exports = function(opalParam) {
  var Opal = opalParam || require('opal-npm-wrapper').Opal;

  return {
    Opal: Opal,
    Asciidoctor: function(loadExtensions) {
