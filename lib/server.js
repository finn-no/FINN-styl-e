var connect = require("connect");

module.exports = function(path){
  connect(connect.static(path)).listen(styleConfig.server.port, styleConfig.server.ip);
  log("Running server on "+ styleConfig.server.ip+ ":"+ styleConfig.server.port +". Serving path" + path);  
};