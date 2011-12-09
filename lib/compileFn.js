var   nib     = require('nib'),
      finn    = require('../finn_stylus'),
      bp      = require('stylus-blueprint');

var StylusSprite = require('stylus-sprite');

var spriteCache;
function makeSprite(config){
  spriteCache = {};
  return function(name){
    if (name === 'ALL'){
      return spriteCache;
    }
    name = name||'sprite.png';
    if (spriteCache[name]){
      return spriteCache[name];
    }        
    return spriteCache[name] = new StylusSprite({
        image_root: config.srcPath + "/../stylus_images",
        output_file: config.srcPath + "/../stylus_sprite/" + name,
        pngcrush: "pngcrush"
    });
  }
}

module.exports = function(stylus){
  var sprite = makeSprite(styleConfig);
  return function compile(str, options, cb) {
     var res = stylus(str, options)
         /*.define('defineSprite', function(filename, options){
            
         })*/
         .define('sprite', function(filename, spriteName){
           var spriteFileName = (spriteName ? spriteName.string:'sprite.png');
           return sprite(spriteFileName).spritefunc(filename);
          })
         .set('filename', options.filename||options)
         .set('compress', styleConfig.compress)
         .set('warn'    , false)//styleConfig.development)
         .set('paths'   , [bp].concat(styleConfig.folders))
         .use(nib())
         .use(finn()).render(function(err, css){
           //TODO each sprite
           sprite('sprite.png').build(css, cb);
           //reset
           sprite = makeSprite(styleConfig);
         });
   }
}
