/*
Stylus watcher, hacked away, some code/functions from the stylus bin file.
*/

var fs = require('fs'),
    basename = require('path').basename,
    dirname = require('path').dirname,
    _ = require('underscore'),
    watchLib = require('watch'),
    nodefs = require('node-fs'),
    ResponsiveSplitter = require('./responsive');
    //hash = require('hashlib');
  
/*
   TODO
      - Add support for absolute paths in target and src
      - Add repl
         -commands: compile_all, ls
      - Might be a bug when a folder with one file, e.g. /responsive/index.css (with only imports) doesnt create a watcher
         
*/

module.exports = function(stylus, compile){
  styleConfig.compress    = styleConfig.compress||false;
  styleConfig.files       = styleConfig.files||[];
  styleConfig.paths       = styleConfig.paths||[];
  styleConfig.exclude     = styleConfig.exclude ? new RegExp(styleConfig.exclude) : /^\.|^_|^index|^node_modules/;

  if (styleConfig.watch) { styleConfig.watchers = {}; }

  if (!styleConfig.files.length && styleConfig.src) {
     styleConfig.files   = fs.readdirSync(styleConfig.src).filter(function(file){
          return !file.match(styleConfig.exclude);
     });
     styleConfig.files.forEach(function(src, i){
       styleConfig.files[i] = styleConfig.srcPath + "/" + src;
     });
  }
  
  // Compilation options
  var options = {
      compress: styleConfig.compress,
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
            logDebug("FILE COMPILED".red.bold, basename(file));
            // Watch imports, add file as importedInFiles import file watcher
            if (styleConfig.watch) watchImports(file, options._imports);
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
                 
                 responsiveSplitter.fileArray.forEach(function(fileObj, i){
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
            return !basename(path).match(styleConfig.exclude);
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
        outputFilename = '/' + basename(file, '.styl') + '.css';
    
    var write = function(path){
       var finalWrite = function (){
          fs.writeFile(path, css, function(err){
            if (err) throw err;
            log('WRITTEN '.blue + basename(path).bold + ' TO TARGET PATHS:'.blue, "..." + path.replace(outputFilename, '').substring(path.length - 120, path.length).grey);
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
                console.log("ERROR READFILE".red, basename(path).bold, err);                
             }
          } else {
             if (!checkIfSameContent(css, data, file)) {
                finalWrite();
             } else {
                if (watchBoolean) watch(file);
             }
          }
       });
    };
    /*
     Iterate and copy result file to each target.
    */
    var lastFolders = currDir.replace(styleConfig.srcPath, '');
    styleConfig.targetPaths.forEach(function(targetDir){
       var folder = targetDir + lastFolders;
       makeFolder(folder, function(){
          write(folder + outputFilename);
       });
    });
  }

  /**
   * Watch the given `file` and invoke `fn` when modified.
   *
   **/
  function watch(file, importedInFiles) {
    logDebug("trying to watch".red, basename(file),  'already watched?'.red.bold, (!!styleConfig.watchers[file]+"").red);
    if (typeof importedInFiles !== "string" && typeof importedInFiles !== "undefined") {
       throw new Error("imported to isnt a string" + typeof importedInFiles + importedInFiles);
    }
    // not watching
    if (!styleConfig.watchers) return;
    if (!file) {
       console.log("MISSING FILE", file);
    }
    
    // Already watching, but add importedInFiles
    if (styleConfig.watchers[file] && importedInFiles){
       addImportUsage(file, importedInFiles);
       return;
    }
    // already watched
    if (styleConfig.watchers[file]) return;
    
    // watch the file itself
    var fileObj = styleConfig.watchers[file] = {
       importedInFiles : importedInFiles ? [importedInFiles] : [],
       timestamp  : Date.now(),
       watchEvent : watchEvent,
       counter    : 0
    };
    
    function watchEvent(curr, prev){
       var importedInFiles;
       if ((curr == "force"||curr.mtime > prev.mtime) && Date.now() > (fileObj.timestamp + 20)) {
         if (!basename(file).match(styleConfig.exclude)) {
            fileObj.counter++;
            compileFile(file);            
            fileObj.timestamp = Date.now();
         }
         
         importedInFiles = fileObj.importedInFiles;
         if (importedInFiles.length > 0 ){
            // Check if file has recently been triggered
            importedInFiles.forEach(function(importedInFilesFile){
               if (styleConfig.watchers[importedInFilesFile] && styleConfig.watchers[importedInFilesFile].watchEvent && Date.now() > (styleConfig.watchers[importedInFilesFile].timestamp + 20)) {
                  styleConfig.watchers[importedInFilesFile].watchEvent("force");                  
               } else {
                  //Errorhandling?
                  if (styleConfig.watchers[importedInFilesFile] && !styleConfig.watchers[importedInFilesFile].watchEvent){
                     log("FAILED IN ".red, importedInFilesFile);
                     throw new Error("MISSING WATCH EVENT");                     
                  }
               }
            });
         }
       }
    }    
    logDebug('START WATCHING'.bold.white, basename(file), 'watched success?' + ''.green.bold, (!!styleConfig.watchers[file] + "").red, file + ''.grey );
    fs.watchFile(file, { interval: 50 }, watchEvent);
  }

  
  function addImportUsage(file, importedInFile) {
     var fileObj = styleConfig.watchers[file];
     // Make files in imports/triggers unique
     if (fileObj.importedInFiles && fileObj.importedInFiles.length > 0) {       
        fileObj.importedInFiles.push(importedInFile);
     } else {
        fileObj.importedInFiles = [importedInFile];
     }
     // Make unique, dont need to trigger filechanges more than once on same file.
     return (styleConfig.watchers[file].importedInFiles = _.unique(fileObj.importedInFiles));
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
      if (imp.path.match(rexToMatchLib) && styleConfig.ignoreLibUpdates) {
         return;
      }
      // If import file isnt watched already
      if (!styleConfig.watchers[imp.path]){
         watch(imp.path, file);
      } else {
         // if file already watched, add file to triggers
         addImportUsage(imp.path, file);
      }
      processed.push(imp);  
    });
   if (processed.length > 0) {
      logDebug("IMPORTS".blue, getProperty(processed, 'path', function(val){return basename(val);}).join(', ').bold, ' TRIGGERS RELOAD ON'.blue, basename(file) );
   }
  }
  
  if (styleConfig.files.length){
     styleConfig.files.forEach(compileFile);
  }
  
  // Debug info:
  // Doubling up watchers! :P  
  if (styleConfig.watch){
     watchLib.createMonitor(styleConfig.src, function (monitor) {
         monitor.on("created", function (f, stat) {
           log("SOURCE: CREATED".yellow, f);
           fs.realpath(f, function(err, path){
              watch(path);
           });
         });
         
         monitor.on("changed", function (f, curr, prev) {
            if (curr.mtime > prev.mtime && !basename(f).match(styleConfig.exclude)) {
               logDebug("SOURCE: CHANGE".yellow, f, '\n\n');
            }
         });
         
         monitor.on("removed", function (f, stat) {
          var dir = dirname(f, '.styl');
          fs.realpath(dir, function(err, dir){
             var path = dir + "/" + basename(f);
             log("SOURCE: REMOVED FILE ", basename(f), path.grey);
             if (styleConfig.watchers[path]) {                
                if (styleConfig.watchers[path].importedInFiles && styleConfig.watchers[path].importedInFiles.length) {
                   log("SOURCE: REMOVED FILE IS IN USE IN FILES:", styleConfig.watchers[path].importedInFiles);
                }
                styleConfig.watchers[path] = false;
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


