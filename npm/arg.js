module.exports = Arg;

function Arg() {
}

function isEnvironmentVariable(arg) {
  var envSuffix = 'env.';
  // startWith 'env.'
  if (arg.lastIndexOf(envSuffix, 0) === 0) {
    var equalSignIndex = arg.indexOf('=');
    var name = arg.substring(envSuffix.length, equalSignIndex);
    var value = arg.substring(equalSignIndex + 1, arg.length);
    // Export to environment variable
    process.env[name] = value;
    // Filter out this argument from process.argv
    return false;
  }
  return true;
}

// Export environement variables from command line arguments.
// Argument starting with 'env.' will be removed from process.argv and added to process.env
Arg.prototype.exportEnvironmentVariables = function() {
  var args = process.argv.slice(2);
  var argsFiltered = args.filter(isEnvironmentVariable);
  process.argv = process.argv.slice(0, 2).concat(argsFiltered);
}
