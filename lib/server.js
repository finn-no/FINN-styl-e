var connect = require("connect");

module.exports = function(stylus, compileFn){
  var server = connect(
    stylus.middleware({
        src     : styleConfig.srcPath
      , dest    : styleConfig.targetPaths[0]
      , force   : styleConfig.development
      , compile : compileFn
    }),
    connect.static(styleConfig.target);
  );
  log("Running server on "+ styleConfig.server.ip+ ":"+ styleConfig.server.port);  
  server.listen(styleConfig.server.port, styleConfig.server.ip);
}