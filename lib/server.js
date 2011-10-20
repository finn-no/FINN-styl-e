var connect = require("connect");
var stylus  = require("stylus");

module.exports = function(config, compileFn){
  var server = connect(
    stylus.middleware({
        src     : config.src
      , dest    : config.target
      , force   : config.development
      , compile : compileFn
    }),
    connect.static(config.target)
  );
  log("Running server on "+ config.server.ip+ ":"+ config.server.port);  
  server.listen(config.server.port, config.server.ip);
}