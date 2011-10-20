require('colors');

GLOBAL.log = function() {
  var args = Array.prototype.slice.apply(arguments);
  console.log.apply(console, ["FINNSTYLE ->".green].concat(args));
}

require('./lib/index');