# Workaround for https://github.com/electron/electron/issues/2033
$stdout.write_proc = `function(s){console.log(s)}`
$stderr.write_proc = `function(s){console.error(s)}`
