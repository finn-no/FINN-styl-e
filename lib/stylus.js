
/**
 * Module dependencies.
 */

var fs = require('fs')
  , stylus = require('stylus')
  , basename = require('path').basename
  , dirname = require('path').dirname
  , _ = require('underscore')
  //, join = require('path').join
  , watchLib = require('watch')
  //, diveSync = require('diveSync')
  , nodefs = require('node-fs')
  , hash = require('hashlib');

var inspect = require('eyes').inspector();
  /*
   TODO
      - folder replace is hax, need some better workaround ( base folder?)
         - Read pom.xml?
      - Add repl
         -commands: compile_all, ls
         
*/

module.exports = function(setup, compile){
  setup.compare     = setup.compare||false;
  setup.compress    = setup.compress||false;
  setup.convertCSS  = setup.convertCSS||false;
  setup.files       = setup.files||[];
  setup.paths       = setup.paths||[];
  setup.exclude     = new RegExp(setup.exclude)||/^\.|^_/;

  if (setup.watch) {
    setup.watchers = {};
  }

  if (setup.watchers && !setup.files.length) {
     setup.files   = fs.readdirSync(setup.src).filter(function(file){
          return !file.match(setup.exclude);
     });
     inspect(setup.files);
     setup.files.forEach(function(src, i){
       setup.files[i] = FINN.srcPath + "/" + src;
     });
  }
  
  // Compilation options
  var options = {
      compress: setup.compress
    , paths: [process.cwd()]
  };
  
  // Iterate files and folders
  function compileFiles(files) {
     console.log("COMPILE FILES", files.length);
    files.forEach(compileFile);
  }
  
  function getProperty(array, propname, fn) {
     var res = [];
     array.forEach(function(obj, i){
        if (fn) {
           res.push(fn(array[i][propname]));           
        } else {
          res.push(array[i][propname]);
        }

     });
     return res;
  } 

  function compileFile(file) {
    //log("Trying to compile (compile fn)".blue, basename(file));
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
            log("FILE COMPILED".red.bold, basename(file),' ERR?:'.red, err);
            // Watch imports, add file as importedTo import file watcher
            watchImports(file, options._imports);

            if (err) {
              if (setup.watchers) {
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
            //TODO, check current filename instead of the whole path
            log("DIRECTORY PATH in compilefile fn", basename(path));
            return !path.match(setup.exclude);
          }).map(function(path){
            return file + '/' + path;
          }).forEach(compileFile);
        });
      }
    });
  }
  
  // Check if filecontent is changed, return true if its not.    
  function checkWithMd5(src1, src2, f1) {
     var hash1 = hash.md5(src1);
     var hash2 = hash.md5(src2);
     return hash1 == hash2;
  }

  /*
   Write file to defined locations in config.json
  */
  function writeFile(file, css) {
    log("WRITE FILE?".yellow, basename(file));
    var currDir = dirname(file, '.styl'),
        cssFile = '/' + basename(file, '.styl') + '.css',
        iadDir = setup.iadTarget + currDir.match(/.*abstraction\/stylus(.*)/)[1],
        dir = currDir.replace('abstraction/stylus', 'abstraction/stylus_target');
    
    
    var write = function(path, check){
       function finalWrite (){
          fs.writeFile(path, css, function(err){
            if (err) throw err;
            log('WRITTEN FILE!'.blue, path);
            // Watch file for changes
            watch(file);

          });
       }
       fs.readFile(path, 'utf8', function(err, data){
          if (err){
             // non existant file
             if (err.code == "ENOENT") {
                finalWrite();
             } else {
                console.log("ERROR READFILE (MIGHT BE NEW FILE)".red, basename(path).bold, err);                
             }
          } else {
             var isSameContent = checkWithMd5(css, data, file);
             if (!isSameContent) {
                finalWrite();
             } else {
                log(basename(file), "NOT WRITTEN; SAME CONTENT!");
                watch(file);
             }
          }
       });
    }


    
    if (setup.iadTarget && iadDir) {
       nodefs.mkdir(iadDir, 0777, true, function(err){
          if (err) {
             console.log("WARNING-TROUBLE CREATING PATH", dir, err);
             if (err.code == "EEXIST"){
                write(iadDir + cssFile, true);
             } else {
                throw err;
             }
          } else {
             write(iadDir + cssFile, true);
          }
       });
    }    
    
    // Output to svn target folder                  
    if (setup.target && dir) {
       nodefs.mkdir(dir, 0777, true, function(err){
          if (err) {
             console.log("WARNING-TROUBLE CREATING PATH", dir, err);
             if (err.code == "EEXIST"){
                write(dir + cssFile);
             } else {   
                throw err;
             }
          } else {
             write(dir + cssFile);
          }
       });
    }    
  }

  /**
   * Watch the given `file` and invoke `fn` when modified.
   *
   **/
  function watch(file, importedTo) {
    //log("trying to watch".red, basename(file),  'already watched?'.red.bold, (!!setup.watchers[file]+"").red);
    if (typeof importedTo !== "string" && typeof importedTo !== "undefined") {
       throw new Error("imported to isnt a string" + typeof importedTo + importedTo);
    }
    // not watching
    if (!setup.watchers) return;
    
    // Already watching, but add importedTo
    if (setup.watchers[file] && importedTo){
       addImportUsage(file, importedTo)
       return;
    }
    // already watched
    if (setup.watchers[file]) return;
    
    // watch the file itself
    var fileObj = setup.watchers[file] = {
       importedTo : importedTo ? [importedTo] : [],
       timestamp  : Date.now(),
       watchEvent : watchEvent,
       counter    : 0
    };
    
    function watchEvent(curr, prev){
       fileObj.counter++;
       log((curr == "force" ? "F O R C E D ".bold : "NORMAL ".bold.red), "WATCH EVENT COUNTER".red, basename(file), fileObj.counter);
       // Check if forced, or filechange, and if it is older than 20ms
       // log("TIMING", Date.now() > (fileObj.timestamp + 20));
       if ((curr == "force"||curr.mtime > prev.mtime) && Date.now() > (fileObj.timestamp + 20)) {
         if (!basename(file).match(setup.exclude)) {
            log("COMPILE SHOULD BE CALLED NEXT".red, basename(file));
            compileFile(file);            
            fileObj.timestamp = Date.now()
         }
         var importedTo = fileObj.importedTo;
         if (importedTo.length > 0 ){
            // Check if file has recently been triggered
            importedTo.forEach(function(importedToFile){
               if (setup.watchers[importedToFile] && setup.watchers[importedToFile].watchEvent) {
                  setup.watchers[importedToFile].watchEvent("force");                  
               } else {
                  if (setup.watchers[importedToFile]){
                     throw new Error("MISSING WATCH EVENT" + importedToFile);                     
                  }
               }
            });
         }
       }
    }    
    log('START WATCHING'.bold.white, basename(file), 'watched success?'.green.bold, (!!setup.watchers[file] + "").red, file.grey );
    fs.watchFile(file, { interval: 50 }, watchEvent);
  }

  
  function addImportUsage(file, importedInFile) {
     fileObj = setup.watchers[file];
     // Make files in imports/triggers unique
     if (fileObj.importedTo && fileObj.importedTo.length > 0) {
        fileObj.importedTo.push(importedInFile);
     } else {
        fileObj.importedTo = [importedInFile];
     }
     // Make unique, dont need to trigger filechanges more than once on same file.
     return setup.watchers[file].importedTo = _.unique(fileObj.importedTo);
  }

  /**
   *  Add watcher for each import, or add file trigger
   */
  var rexToMatchLib = new RegExp("^"+GLOBAL.TOP_DIR_NAME);
  function watchImports(file, imports) {
    var processed = [];
    imports.forEach(function(import){
      if (!import.path) return;
      // Ignore lib files
      if (import.path.match(rexToMatchLib) && setup.ignoreLibUpdates) {
         return;
      }
      // If import file isnt watched already
      if (!setup.watchers[import.path]){
         watch(import.path, file)
      } else {
         // if file already watched, add file to triggers
         addImportUsage(import.path, file);
      }
      processed.push(import);  
    });
    
    if (processed.length > 0) log("IMPORTS".blue, getProperty(processed, 'path', function(val){return basename(val)}).join(', ').bold, ' TRIGGERS RELOAD ON'.blue, basename(file) );     
  }
  
  if (setup.files.length){
    console.log("FILES LENGTH", setup.files.length)
    compileFiles(setup.files);
  }
  
  
  watchLib.createMonitor(setup.src, function (monitor) {
      monitor.on("created", function (f, stat) {
        log("SOURCE: CREATED".yellow, f);
        fs.realpath(f, function(err, path){
           watch(path);
        })
      });
      monitor.on("changed", function (f, curr, prev) {
         if (curr.mtime > prev.mtime) {
            log("SOURCE: CHANGE".yellow, f, '\n\n');
            //inspect(setup.watchers);
         }
      });
      monitor.on("removed", function (f, stat) {
       log("SOURCE: REMOVED".yellow, f);
       fs.realpath(f, function(err, path){
          if (setup.watchers[path]) {
             setup.watchers[path] = false;
             fs.unwatchFile(path)
          }
       })
      });
  });

  watchLib.createMonitor(setup.target, function (monitor) {
      monitor.on("created", function (f, stat) {
        log("TARGET: Handle new file".red, f)
      });
      monitor.on("changed", function (f, curr, prev) {
        if (curr.mtime > prev.mtime) {
           log("TARGET: CHANGE".red, f)   
        }        
      });
  });
  
  watchLib.createMonitor(setup.iadTarget, function (monitor) {
      monitor.on("created", function (f, stat) {
        log("IAD_TARGET: Handle new file".red, f)
      });
      monitor.on("changed", function (f, curr, prev) {
        if (curr.mtime > prev.mtime) {
           log("IAD_TARGET: CHANGE".red, f)   
        }        
      });
  });
  
}





