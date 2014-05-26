module.exports = function(opalParam) {
  var Opal = opalParam || require('opal-npm-wrapper').Opal;

  //Use xmlhttprequest to emulate the browser XMLHttpRequest object.
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  //Define overrideMimeType, not define by default in wrapper
  XMLHttpRequest.prototype.overrideMimeType = function() {};

  return {
    Opal: Opal,
    Asciidoctor: function(loadExtensions) {
