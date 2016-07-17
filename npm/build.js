var Builder = require('./builder.js');
var Arg = require('./arg.js');
var builder = new Builder();
var arg = new Arg();

arg.exportEnvironmentVariables();

builder.build();
