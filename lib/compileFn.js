var   nib     = require('nib'),
      finn    = require('../finn_stylus'),
      bp      = require('stylus-blueprint');

module.exports = function(stylus, config){
   return function compile(str, options) {
     return stylus(str, options)
         .set('filename', options.filename||options)
         .set('compress', styleConfig.compress)
         .set('warn'    , false)//styleConfig.development)
         .set('paths'   , [bp].concat(styleConfig.folders))
         .use(nib())
         .use(finn());
   }
}
