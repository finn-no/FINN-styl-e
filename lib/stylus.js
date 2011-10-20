
/**
 * Module dependencies.
 */

var fs = require('fs')
  , stylus = require('stylus')
  , basename = require('path').basename
  , dirname = require('path').dirname
  , join = require('path').join
  , watchLib = require('watch')
  , diveSync = require('diveSync')
  , nodefs = require('node-fs');
  
  


module.exports = function(finnSetup, compile){

  finnSetup.compare     = finnSetup.compare||false;
  finnSetup.compress    = finnSetup.compress||false;
  finnSetup.convertCSS  = finnSetup.convertCSS||false;
  finnSetup.files       = finnSetup.files||[];
  finnSetup.paths       = finnSetup.paths||[];

  if (finnSetup.watch) {
    finnSetup.watchers = {};
  }

  if (finnSetup.watchers && !finnSetup.files.length) {
     finnSetup.folders = []
     finnSetup.files   = fs.readdirSync(finnSetup.src).filter(function(file){
          return !file.match(new RegExp(finnSetup.exclude));
     })
     finnSetup.files.forEach(function(src, i){
       finnSetup.files[i] = FINN.srcPath + "/" + src;
     })
     log("FILES", finnSetup.files);
  }
  
  // Compilation options
  var options = {
      filename: 'stdin'
    , compress: finnSetup.compress
    , paths: [process.cwd()].concat(finnSetup.paths)
  };

  function compileCSSFile(file, fileOut) {
    fs.lstat(file, function(err, stat){
      if (err) throw err;
      if (stat.isFile()) {
        fs.readFile(file, 'utf8', function(err, str){
          if (err) throw err;
          var styl = stylus.convertCSS(str); 
          fs.writeFile(fileOut, styl, function(err){  
           if (err) throw err; 
          });
        });
      } 
    });
  }

  function compileFiles(files) {
    files.forEach(compileFile);
  }

  function compileFile(file) {
    // ensure file exists
    fs.lstat(file, function(err, stat){
      if (err) throw err;
      // file
      if (stat.isFile()) {
        fs.readFile(file, 'utf8', function(err, str){
          if (err) throw err;
          options.filename = file;
          options._imports = [];
          //stylus(str, options)
          compile(str, options).render(function(err, css){
            watchImports(file, options._imports);
            if (err) {
              if (finnSetup.watchers) {
                console.error(err.stack || err.message);
              } else {
                throw err;
              }
            } else {
              writeFile(file, css);
            }
          });
        });
      // directory
      } else if (stat.isDirectory()) {
        fs.readdir(file, function(err, files){
          if (err) throw err;
          files.filter(function(path){
            return !path.match(new RegExp(finnSetup.exclude));
          }).map(function(path){
            return file + '/' + path;
          }).forEach(compileFile);
        });
      }
    });
  }

  function writeFile(file, css) {

    var writeFileWhenReady = function(path){
       fs.writeFile(path, css, function(err){
         if (err) throw err;
         log('compiled'.blue, path);
         // --watch support
         watch(file, compileFile);
       });
    }
    var currDir = dirname(file, '.styl');
    /*
      Output("package") new file to iad target folder
      
      /Users/sverosak/Finntech/svn/iad/trunk/minfinn/src/main/webapp/styles/abstraction/target/minfinn/responsive/pages/600/index.css
      /Users/sverosak/Finntech/svn/iad/trunk/minfinn/target/minfinn-2011.14-SNAPSHOT/styles/abstraction/target
    */
    //var iadDir = finnSetup.iadTarget + currDir.replace(/.*abstraction\/src(.*)/, '$1');
    
    /*
      Output to svn target folder
    */
    var dir = currDir.replace('abstraction/src', 'abstraction/target');
    var path = dir + '/' + basename(file, '.styl') + '.css'
    nodefs.mkdir(dir, 0777, true, function(err){
       if (err) {
          console.log("ERROR CREATING PATH", dir, err);
          if (err.code == "EEXIST"){
             writeFileWhenReady(path);
          } else {
             throw err;
          }
       } else {
          writeFileWhenReady(path);
       }
    });
    
  }

  /**
   * Watch the given `file` and invoke `fn` when modified.
   */

  function watch(file, fn) {
    //console.log("WATCH FN", file);
    // not watching
    if (!finnSetup.watchers) return;

    // already watched
    if (finnSetup.watchers[file]) return;

    // watch the file itself
    finnSetup.watchers[file] = true;
    
    log('watching'.grey, file);
    fs.watchFile(file, { interval: 50 }, function(curr, prev){
      if (curr.mtime > prev.mtime) fn(file);
    });
  }

  /**
   * Watch `imports`, re-compiling `file` when they change.
   */

  function watchImports(file, imports) {
    imports.forEach(function(import){
      if (!import.path) return;
      watch(import.path, function(){
        compileFile(file);
      });
    });
  }
  
  log("WATCHERS", finnSetup.watchers)
  
  if (finnSetup.files.length){
    compileFiles(finnSetup.files);
  }
  
  
  watchLib.createMonitor(finnSetup.src, function (monitor) {
      //monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
      monitor.on("created", function (f, stat) {
        log("SOURCE: CREATED".yellow, f)
      });
      monitor.on("changed", function (f, curr, prev) {
         if (curr.mtime > prev.mtime) {
            log("SOURCE: CHANGE".yellow, f)
         }
      });
      monitor.on("removed", function (f, stat) {
       log("SOURCE: REMOVED".yellow, f)
      });
  });

  watchLib.createMonitor(finnSetup.target, function (monitor) {
      //monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
      monitor.on("created", function (f, stat) {
        log("TARGET: Handle new file".red, f)
      });
      monitor.on("changed", function (f, curr, prev) {
        if (curr.mtime > prev.mtime) {
           log("TARGET: CHANGE".red, f)   
        }        
      });
      monitor.on("removed", function (f, stat) {
       log("TARGET: Handle removed files".red, f)
      });
  });
  
  watchLib.createMonitor(finnSetup.copyTarget, function (monitor) {
      //monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
      monitor.on("created", function (f, stat) {
        log("B_TARGET: Handle new file".red, f)
      });
      monitor.on("changed", function (f, curr, prev) {
        if (curr.mtime > prev.mtime) {
           log("B_TARGET: CHANGE".red, f)   
        }        
      });
      monitor.on("removed", function (f, stat) {
       log("B_TARGET: Handle removed files".red, f)
      });
  });
  
}





