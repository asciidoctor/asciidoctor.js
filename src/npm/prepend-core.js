module.exports = function() {
  var opalRuntime = require('opal-runtime');
  var Opal = this.Opal || opalRuntime.Opal;

  return {
    Opal: Opal,
    Asciidoctor: function(loadExtensions) {
