require('colors'); // adds methods to the global String object

GLOBAL.log = function() {
  var args = Array.prototype.slice.apply(arguments);
  console.log.apply(console, ["FINNSTYLE ->".green].concat(args));
}
console.log("\n================= STARTING ===================".yellow.bold);
GLOBAL.TOP_DIR_NAME = __dirname;
require('./lib/index');


