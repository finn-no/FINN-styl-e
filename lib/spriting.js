var Sprite = require('stylus-sprite');

var sprites = {};
function getOrCreate(outputFile){
   log("GET OR CREATE");
   return sprites[outputFile]||(sprites[outputFile] = new Sprite({output_file: outputFile}));
}

var sprite = new Sprite({
    image_root: "./images",
    output_file:"sprite.png"
});

function define(filename, option_val){
   log("DEFINE SPRITE\n\n\n");
   //return getOrCreate(filename).spriteFunc(filename, option_val);
   return sprite.spritefunc(filename, option_val);
}

module.exports = {
   define: define,
   sprite: sprite
}
