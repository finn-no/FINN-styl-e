/*
  Compiler setup for minfinn, work in progress

  - Spriting
  - Add guessing / looking for a config.json file!
*/

var stylus  = require('stylus'),

    fs      = require('fs'),

    args    = require("argsparser").parse();  
    
var APPNAME = "styl-E".green.bold;
var config = {},
    jsonPath = args["--config"]||args.config||"./config.json",
    devDebug = args["--debug"]||args.debug;  
  
// Check config file
try {
    var configPath = jsonPath;
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.log("FAILED!. Check that ../config.json is wellformed!\n");
    process.exit(1);
}

GLOBAL.log = function() {
   if (config.debugInfo) {
      var args = Array.prototype.slice.apply(arguments);
      console.log.apply(console, [APPNAME + " ->".green].concat(args));
   }
};

GLOBAL.logDebug = function() {
   if (devDebug) {
      var args = Array.prototype.slice.apply(arguments);
      console.log.apply(console, [APPNAME + " ->".green].concat(args));
   }
};


if (!config.src && !config.target) {
  log("MISSING src or target properties in config.json");
  process.exit(1);
}

GLOBAL.styleConfig         = config||{};
styleConfig.projectPath    = fs.realpathSync("./"); // project base, folder where you run finnstyle/config.json is placed.

function resolvePath(path){
   return fs.realpathSync(styleConfig.projectPath + "/" + path)
}

function resolvePaths(paths){
   if (!Array.isArray(config.target)){
      return [resolvePath(paths)];
   }
   var result = [];
   paths.forEach(function(path){
      result.push(resolvePath(path));
   });
   return result;
}

styleConfig.srcPath        = resolvePath(config.src);
styleConfig.targetPaths    = resolvePaths(config.target);

//
log("STARTED".yellow.bold+ "!".red);

// Need to share the same compile fn
var compile = require('./compileFn')(stylus, config);

//Run compiles
require('./styl-e.js')(stylus, compile);

if (config.server && (config.server.active || typeof config.server.active == "undefined")) {
  require('./server.js')(styleConfig.targetPaths[0]);
}



