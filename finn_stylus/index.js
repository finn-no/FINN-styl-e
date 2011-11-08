/*
  Default imports and path includes!
*/

module.exports = function () {   
  return function (style) {
    style.include(__dirname);
    style.import(__dirname + '/always_import.styl');    
  }
};
/*
var ReponsiveCollector = function ReponsiveCollector(){
   
}

ReponsiveCollector.prototype.__proto__ = nodes.Selector.prototype*/