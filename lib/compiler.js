var nib = require('nib'),
    finn = require('../finn_stylus'),
    bp = require('stylus-blueprint'),
    stylus = require('stylus'),
    fs = require('fs'),
    sprite = require('./spriting'),
    basename = require('path').basename,
    dirname = require('path').dirname,
    watch = require('./watcher'),
    ResponsiveSplitter = require('./responsive'),
    writeFile = require('./writeFile');

function compile(str, options) {
   return stylus(str, options).define('sprite', sprite.define).set('filename', options.filename || options).set('compress', styleConfig.compress).set('warn', false) //styleConfig.development)
   .set('paths', [bp].concat(styleConfig.folders)).use(nib()).use(finn());
}

// Compilation options
var options = {
   compress: styleConfig.compress,
   paths: [process.cwd()]
};

function compileFile(file) {
   // ensure file exists
   fs.lstat(file, function(err, stat) {
      if (err) throw err;
      // file
      if (stat.isFile()) {
         fs.readFile(file, 'utf8', function(err, str) {
            if (err) throw err;
            options.filename = file;
            options._imports = [];
            compile(str, options).render(function(err, css) {
               logDebug("FILE COMPILED".red.bold, basename(file));
               // Watch imports, add file as importedInFiles import file watcher
               if (styleConfig.watch) watch.watchImports(file, options._imports);
               if (err) {
                  if (styleConfig.watchers) {
                     console.error(err.stack || err.message);
                  } else {
                     throw err;
                  }
               } else {

                  // File-responsiveSplitter is a big hack - postprocessing CSS resultfile, and writing out different files depending on @ or $ notation
                  var responsiveSplitter = new ResponsiveSplitter(css, file);
                  if (responsiveSplitter.fileArray.length > 1) {

                     //logDebug('responsiveSplitter FILES'.red, responsiveSplitter.fileArray.length, responsiveSplitter.fileArray);
                     responsiveSplitter.fileArray.forEach(function(fileObj, i) {
                        if (fileObj.filename !== file) {
                           var newFilename = file.replace('.styl', "_" + fileObj.filename + '.styl');
                           writeFile(newFilename, fileObj.filecontent);
                        } else {
                           writeFile(file, fileObj.filecontent, true);
                        }

                     });
                  } else {
                     writeFile(file, css, true);
                  }

               }
            });
         });


         // directory
      } else if (stat.isDirectory()) {
         fs.readdir(file, function(err, files) {
            if (err) throw err;
            files.filter(function(path) {
               return !basename(path).match(styleConfig.exclude);
            }).map(function(path) {
               return file + '/' + path;
            }).forEach(compileFile);
         });
      }
   });
}

module.exports['compileFile'] = compileFile;
module.exports['compile'] = compile;
