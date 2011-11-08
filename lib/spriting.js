var Sprite = require('stylus-sprite');

var sprites = {};
function getOrCreate(outputFile){
   log("GET OR CREATE");
   return sprites[outputFile]||(sprites[outputFile] = new Sprite({output_file: outputFile}));
}

module.exports = function(stylus) {
   log("SPRITING LOADED");
   
   
   
   return function define(filename, option_val){
      log("DEFINE SPRITE\n\n\n");
      return getOrCreate(filename).spriteFunc(filename, option_val);
   }
}