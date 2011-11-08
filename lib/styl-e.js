/*
Stylus watcher, hacked away, some code/functions from the stylus bin file.
*/

var fs = require('fs'),
    basename = require('path').basename,
    dirname = require('path').dirname,
    _ = require('underscore'),
    watchLib = require('watch'),
    nodefs = require('node-fs'),
    Splitter = require('./fileSplitter');
    //hash = require('hashlib');
  
/*
   TODO
      - folder replace iz hax, need some better workaround ( base folder?)
      - Add repl
         -commands: compile_all, ls
      - Might be a bug when a folder with one file, e.g. /responsive/index.css (with only imports) doesnt create a watcher
         
*/

module.exports = function(stylus, setup, compile){
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
      compress: setup.compress,
      paths: [process.cwd()]
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
            debuglog("FILE COMPILED".red.bold, basename(file));
            // Watch imports, add file as importedInFiles import file watcher
            if (setup.watch) watchImports(file, options._imports);
            if (err) {
              if (setup.watchers) {
                console.error(err.stack || err.message);
              } else {
                throw err;
              }
            } else {
              // FileSplitter is a big hack - postprocessing CSS resultfile, and writing out different files depending on @ or $ notation
              var splitter = new Splitter(css, file);
              if (splitter.fileArray.length > 1) {
                 debuglog('SPLITTER FILES'.red, splitter.fileArray.length, splitter.fileArray);
                 splitter.fileArray.forEach(function(fileObj, i){
                    if (fileObj.filename !== file) {
                       var newFilename = file.replace('.styl', "_" + fileObj.filename + '.styl');
                       writeFile(newFilename, fileObj.filecontent);
                    } else {
                       writeFile(file, fileObj.filecontent, true)
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
  function writeFile(file, css, watchBoolean) {
    var currDir = dirname(file, '.styl'),
        cssFile = '/' + basename(file, '.styl') + '.css',
        iadDir  = FINN.iadTargetPath + currDir.match(/.*abstraction\/stylus(.*)/)[1],
        dir     = currDir.replace('abstraction/stylus', 'abstraction/stylus_target');
    
    var write = function(path){
       var finalWrite = function (){
          fs.writeFile(path, css, function(err){
            if (err) throw err;
            log('WRITTEN '.blue + basename(path).bold + ' TO TARGET PATHS:'.blue, path);
            // Watch file for changes
            if (watchBoolean) watch(file);
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
             var isSameContent = checkIfSameContent(css, data, file);
             if (!isSameContent) {
                finalWrite();
             } else {
                if (watchBoolean) watch(file);
             }
          }
       });
           };

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
    debuglog("trying to watch".red, basename(file),  'already watched?'.red.bold, (!!setup.watchers[file]+"").red);
    if (typeof importedInFiles !== "string" && typeof importedInFiles !== "undefined") {
       throw new Error("imported to isnt a string" + typeof importedInFiles + importedInFiles);
    }
    // not watching
    if (!setup.watchers) return;
    
    // Already watching, but add importedInFiles
    if (setup.watchers[file] && importedInFiles){
       addImportUsage(file, importedInFiles);
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
       var importedInFiles;
       if ((curr == "force"||curr.mtime > prev.mtime) && Date.now() > (fileObj.timestamp + 20)) {
         if (!basename(file).match(setup.exclude)) {
            fileObj.counter++;
            compileFile(file);            
            fileObj.timestamp = Date.now();
         }
         
         importedInFiles = fileObj.importedInFiles;
         if (importedInFiles.length > 0 ){
            // Check if file has recently been triggered
            importedInFiles.forEach(function(importedInFilesFile){
               if (setup.watchers[importedInFilesFile] && setup.watchers[importedInFilesFile].watchEvent && Date.now() > (setup.watchers[importedInFilesFile].timestamp + 20)) {
                  setup.watchers[importedInFilesFile].watchEvent("force");                  
               } else {
                  //Errorhandling?
                  if (setup.watchers[importedInFilesFile] && !setup.watchers[importedInFilesFile].watchEvent){
                     log("FAILED IN ".red, importedInFilesFile);
                     throw new Error("MISSING WATCH EVENT");                     
                  }
               }
            });
         }
       }
    }    
    debuglog('START WATCHING'.bold.white, basename(file), 'watched success?'.green.bold, (!!setup.watchers[file] + "").red, file.grey );
    fs.watchFile(file, { interval: 50 }, watchEvent);
  }

  
  function addImportUsage(file, importedInFile) {
     var fileObj = setup.watchers[file];
     // Make files in imports/triggers unique
     if (fileObj.importedInFiles && fileObj.importedInFiles.length > 0) {       
        fileObj.importedInFiles.push(importedInFile);
     } else {
        fileObj.importedInFiles = [importedInFile];
     }
     // Make unique, dont need to trigger filechanges more than once on same file.
     return (setup.watchers[file].importedInFiles = _.unique(fileObj.importedInFiles));
  }

  /**
   *  Add watcher for each import, or add file trigger
   */
  var rexToMatchLib = new RegExp("^"+GLOBAL.TOP_DIR_NAME);
  
  function watchImports(file, imports) {
    var processed = [];
    imports.forEach(function(imp){
      if (!imp.path) return;
      // Ignore lib files
      if (imp.path.match(rexToMatchLib) && setup.ignoreLibUpdates) {
         return;
      }
      // If import file isnt watched already
      if (!setup.watchers[imp.path]){
         watch(imp.path, file);
      } else {
         // if file already watched, add file to triggers
         addImportUsage(imp.path, file);
      }
      processed.push(imp);  
    });
   if (processed.length > 0) {
      debuglog("IMPORTS".blue, getProperty(processed, 'path', function(val){return basename(val);}).join(', ').bold, ' TRIGGERS RELOAD ON'.blue, basename(file) );
   }
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
           });
         });
         
         monitor.on("changed", function (f, curr, prev) {
            if (curr.mtime > prev.mtime && !basename(f).match(setup.exclude)) {
               debuglog("SOURCE: CHANGE".yellow, f, '\n\n');
            }
         });
         
         monitor.on("removed", function (f, stat) {
          var dir = dirname(f, '.styl');
          fs.realpath(dir, function(err, dir){
             var path = dir + "/" + basename(f);
             log("SOURCE: REMOVED FILE ", basename(f), path.grey);
             if (setup.watchers[path]) {                
                if (setup.watchers[path].importedInFiles && setup.watchers[path].importedInFiles.length) {
                   log("SOURCE: REMOVED FILE IS IN USE IN FILES:", setup.watchers[path].importedInFiles);
                }
                setup.watchers[path] = false;
                fs.unwatchFile(path);
             }
          });
         });
     });
  }
  
};

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

// Check if filecontent is changed    
function checkIfSameContent(src1, src2, f1) {
   return src1 == src2;
   /*var hash1 = hash.md5(src1);
   var hash2 = hash.md5(src2);
   return hash1 == hash2;*/
}

function makeFolder(folderpath, cb) {
   nodefs.mkdir(folderpath, '0777', true, function(err){
      if (err) {
         if (err.code == "EEXIST"){
            cb();
         } else {
            log("WARNING-TROUBLE CREATING PATH", dir);
            throw err;
         }
      } else {
         cb();
      }
   });
}

