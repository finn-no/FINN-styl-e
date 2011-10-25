/*
Stylus watcher, hacked away, some code/functions from the stylus bin file.
*/

var fs = require('fs')
  , stylus = require('stylus')
  , basename = require('path').basename
  , dirname = require('path').dirname
  , _ = require('underscore')
  , watchLib = require('watch')
  , nodefs = require('node-fs')
  , hash = require('hashlib');
  

var inspect = require('eyes').inspector();

  /*
   TODO
      - folder replace is hax, need some better workaround ( base folder?)
      - Add repl
         -commands: compile_all, ls
      - Might be a bug when a folder with one file, e.g. /responsive/index.css (with only imports) doesnt create a watcher
         
*/

module.exports = function(setup, compile){
  setup.compress    = setup.compress||false;
  setup.files       = setup.files||[];
  setup.paths       = setup.paths||[];
  setup.exclude     = setup.exclude ? new RegExp(setup.exclude) : /^\.|^_/;

  if (setup.watch) { setup.watchers = {}; }

  if (!setup.files.length && setup.src) {
     setup.files   = fs.readdirSync(setup.src).filter(function(file){
          return !file.match(setup.exclude);
     });
     setup.files.forEach(function(src, i){
       setup.files[i] = FINN.srcPath + "/" + src;
     });
  }
  
  // Compilation options
  var options = {
      compress: setup.compress
    , paths: [process.cwd()]
  };
  
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
          compile(str, options).render(function(err, css){
            log("FILE COMPILED".red.bold, basename(file));
            // Watch imports, add file as importedInFiles import file watcher
            if (setup.watch) watchImports(file, options._imports);
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
            return !basename(path).match(setup.exclude);
          }).map(function(path){
            return file + '/' + path;
          }).forEach(compileFile);
        });
      }
    });
  }
  

  

  /*
   Write file to defined locations in config.json
  */
  function writeFile(file, css) {
    var currDir = dirname(file, '.styl'),
        cssFile = '/' + basename(file, '.styl') + '.css',
        iadDir  = FINN.iadTargetPath + currDir.match(/.*abstraction\/stylus(.*)/)[1],
        dir     = currDir.replace('abstraction/stylus', 'abstraction/stylus_target');
    
    
    var write = function(path){
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
                watch(file);
             }
          }
       });
    }

    if (FINN.iadTargetPath && setup.iadTarget && iadDir) {
       makeFolder(iadDir, function(){ write(iadDir + cssFile, true); });
    }
    if (setup.target && dir) {
       makeFolder(dir, function(){ write(dir + cssFile); });
    }    
  }

  /**
   * Watch the given `file` and invoke `fn` when modified.
   *
   **/
  function watch(file, importedInFiles) {
    //log("trying to watch".red, basename(file),  'already watched?'.red.bold, (!!setup.watchers[file]+"").red);
    if (typeof importedInFiles !== "string" && typeof importedInFiles !== "undefined") {
       throw new Error("imported to isnt a string" + typeof importedInFiles + importedInFiles);
    }
    // not watching
    if (!setup.watchers) return;
    
    // Already watching, but add importedInFiles
    if (setup.watchers[file] && importedInFiles){
       addImportUsage(file, importedInFiles)
       return;
    }
    // already watched
    if (setup.watchers[file]) return;
    
    // watch the file itself
    var fileObj = setup.watchers[file] = {
       importedInFiles : importedInFiles ? [importedInFiles] : [],
       timestamp  : Date.now(),
       watchEvent : watchEvent,
       counter    : 0
    };
    
    function watchEvent(curr, prev){
       log((curr == "force" ? "FORCED ".bold : "NORMAL ".bold.red), "CHANGED/OPEN EVENT ".red, basename(file), fileObj.counter);
       // Check if forced, or filechange, and if it is older than 20ms
       // log("TIMING", Date.now() > (fileObj.timestamp + 20));
       if ((curr == "force"||curr.mtime > prev.mtime) && Date.now() > (fileObj.timestamp + 20)) {
         if (!basename(file).match(setup.exclude)) {
            fileObj.counter++;
            compileFile(file);            
            fileObj.timestamp = Date.now()
         }
         var importedInFiles = fileObj.importedInFiles;
         if (importedInFiles.length > 0 ){
            // Check if file has recently been triggered
            importedInFiles.forEach(function(importedInFilesFile){
               if (setup.watchers[importedInFilesFile] && setup.watchers[importedInFilesFile].watchEvent 
                  && Date.now() > (setup.watchers[importedInFilesFile].timestamp + 20)) {
                  setup.watchers[importedInFilesFile].watchEvent("force");                  
               } else {
                  if (setup.watchers[importedInFilesFile]){
                     log(importedInFilesFile);
                     throw new Error("MISSING WATCH EVENT");                     
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
     var fileObj = setup.watchers[file];
     // Make files in imports/triggers unique
     //log("file", file, "importedInFile", importedInFile);
     if (fileObj.importedInFiles && fileObj.importedInFiles.length > 0) {       
        fileObj.importedInFiles.push(importedInFile);
     } else {
        fileObj.importedInFiles = [importedInFile];
     }
     // Make unique, dont need to trigger filechanges more than once on same file.
     return setup.watchers[file].importedInFiles = _.unique(fileObj.importedInFiles);
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
   //inspect(imports);
   //if (processed.length > 0) inspect(processed);
   //else inspect(imports)
   if (processed.length > 0) log("IMPORTS".blue, getProperty(processed, 'path', function(val){return basename(val)}).join(', ').bold, ' TRIGGERS RELOAD ON'.blue, basename(file) );     
  }
  
  if (setup.files.length){
     setup.files.forEach(compileFile);
  }
  
  // Debug info:
  // Doubling up watchers! :P  
  if (setup.watch){
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
            }
         });
         monitor.on("removed", function (f, stat) {
          var dir = dirname(f, '.styl');
          fs.realpath(dir, function(err, dir){
             var path = dir + "/" + basename(f)
             log("SOURCE: REMOVED FILE ", basename(f), path.grey);
             if (setup.watchers[path]) {                
                if (setup.watchers[path].importedInFiles && setup.watchers[path].importedInFiles.length) {
                   log("SOURCE: REMOVED FILE IS IN USE IN FILES:", setup.watchers[path].importedInFiles);
                }
                setup.watchers[path] = false;
                fs.unwatchFile(path);
             }
          })
         });
     });

     /*watchLib.createMonitor(setup.target, function (monitor) {
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
     });*/
  }

  
  setTimeout(function(){
     //inspect(setup.watchers);
  }, 2000);
  
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

// Check if filecontent is changed, return true if its not.    
function checkWithMd5(src1, src2, f1) {
   var hash1 = hash.md5(src1);
   var hash2 = hash.md5(src2);
   return hash1 == hash2;
}

function makeFolder(folderpath, cb) {
   nodefs.mkdir(folderpath, 0777, true, function(err){
      if (err) {
         if (err.code == "EEXIST"){
            cb();
         } else {
            console.log("WARNING-TROUBLE CREATING PATH", dir);                
            throw err;
         }
      } else {
         cb();
      }
   });
}


