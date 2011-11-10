/*
  Compiler setup for minfinn, work in progress

  - Spriting
  - Add guessing / looking for a config.json file!
  - Add support for absolute paths in target and src
  - Add repl
      -commands: compile_all, ls
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

//Run compiles
styleConfig.compress = styleConfig.compress || false;
styleConfig.files = styleConfig.files || [];
styleConfig.paths = styleConfig.paths || [];
styleConfig.exclude = styleConfig.exclude ? new RegExp(styleConfig.exclude) : /^\.|^_|^index|^node_modules/;

if (styleConfig.watch) {
    styleConfig.watchers = {};
}

if (!styleConfig.files.length && styleConfig.src) {
    styleConfig.files = fs.readdirSync(styleConfig.src).filter(function(file) {
        return ! file.match(styleConfig.exclude);
    });
    styleConfig.files.forEach(function(src, i) {
        styleConfig.files[i] = styleConfig.srcPath + "/" + src;
    });
}

var compiler = require('./compiler');

if (styleConfig.files.length) {
    styleConfig.files.forEach(compiler.compileFile);
}

if (config.server && (config.server.active || typeof config.server.active == "undefined")) {
  require('./server.js')(stylus);
}



