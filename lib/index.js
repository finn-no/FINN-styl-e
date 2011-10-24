/*
  Compiler setup for minfinn, work in progress

  - Add a walker?
  - Spriting
*/

var stylus  = require('stylus')
  , nib     = require('nib')
  , fs      = require('fs')
  , finn    = require('../finn_stylus')
  , bp      = require('stylus-blueprint');
  
var config;
try {
    var configPath = './config.json';
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    log("FAILED!. Check that ../config.json is wellformed!\n");
    process.exit(1);
}

if (!config.src && !config.target) {
  log("MISSING src or target properties in config.json");
  process.exit(1);
}

GLOBAL.FINN                = GLOBAL.FINN||{};
GLOBAL.FINN.projectPath    = fs.realpathSync("./");
GLOBAL.FINN.srcPath        = fs.realpathSync(FINN.projectPath + "/" + config.src);
GLOBAL.FINN.targetPath     = fs.realpathSync(FINN.projectPath + "/" + config.target);
if (config.iadTarget) GLOBAL.FINN.iadTargetPath  = fs.realpathSync(config.iadTarget);

require('./stylus.js')(config, compile);

if (config.server && (config.server.active||typeof config.server.active == "undefined")) {
  require('./server.js')(config, compile);
}

function compile(str, options) {
  return stylus(str, options)
    .set('filename', options.filename||options)
    .set('compress', config.compress)
    .set('warn'    , false)//config.development)
    //.set('paths'   , [bp].concat(config.folders))
    .use(nib())
    .use(finn());
}

