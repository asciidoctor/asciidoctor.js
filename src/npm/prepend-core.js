module.exports = function(opalParam, xmlHttpRequestParam) {
  var Opal = opalParam || require('opal-npm-wrapper').Opal;

  if (xmlHttpRequestParam !== false) {
    var XMLHttpRequest = xmlHttpRequestParam || require('xmlhttprequest').XMLHttpRequest;
    // Define overrideMimeType, not define by default in wrapper
    XMLHttpRequest.prototype.overrideMimeType = function() {};
  }

  return {
    Opal: Opal,
    Asciidoctor: function(loadExtensions) {
