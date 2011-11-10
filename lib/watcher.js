var fs            = require('fs'),
    watchLib      = require('watch'),
    basename      = require('path').basename,
    _             = require('underscore'),
    dirname       = require('path').dirname,
    compiler      = require('./compiler.js');
    
function getProperty(array, propname, fn) {
    var res = [];
    array.forEach(function(obj, i) {
        if (fn) {
            res.push(fn(array[i][propname]));
        } else {
            res.push(array[i][propname]);
        }
    });
    return res;
}

   
   
 /**
* Watch the given `file` and invoke `fn` when modified.
*
**/
function watch(file, importedInFiles) {
     logDebug("trying to watch".red, basename(file), 'already watched?'.red.bold, ( !! styleConfig.watchers[file] + "").red);
     if (typeof importedInFiles !== "string" && typeof importedInFiles !== "undefined") {
         throw new Error("imported to isnt a string" + typeof importedInFiles + importedInFiles);
     }
     // not watching
     if (!styleConfig.watchers) return;

     // Already watching, but add importedInFiles
     if (styleConfig.watchers[file] && importedInFiles) {
         addImportUsage(file, importedInFiles);
         return;
     }
     // already watched
     if (styleConfig.watchers[file]) return;

     // watch the file itself
     var fileObj = styleConfig.watchers[file] = {
         importedInFiles: importedInFiles ? [importedInFiles] : [],
         timestamp: Date.now(),
         watchEvent: watchEvent,
         counter: 0
     };

     function watchEvent(curr, prev) {
         var importedInFiles;
         if ((curr == "force" || curr.mtime > prev.mtime) && Date.now() > (fileObj.timestamp + 20)) {
             if (!basename(file).match(styleConfig.exclude)) {
                 fileObj.counter++;
                 console.log(compiler);
                 compiler.compileFile(file);
                 fileObj.timestamp = Date.now();
             }

             importedInFiles = fileObj.importedInFiles;
             if (importedInFiles.length > 0) {
                 // Check if file has recently been triggered
                 importedInFiles.forEach(function(importedInFilesFile) {
                     if (styleConfig.watchers[importedInFilesFile] && styleConfig.watchers[importedInFilesFile].watchEvent && Date.now() > (styleConfig.watchers[importedInFilesFile].timestamp + 20)) {
                         styleConfig.watchers[importedInFilesFile].watchEvent("force");
                     } else {
                         //Errorhandling?
                         if (styleConfig.watchers[importedInFilesFile] && !styleConfig.watchers[importedInFilesFile].watchEvent) {
                             log("FAILED IN ".red, importedInFilesFile);
                             throw new Error("MISSING WATCH EVENT");
                         }
                     }
                 });
             }
         }
     }
     logDebug('START WATCHING'.bold.white, basename(file), 'watched success?'.green.bold, ( !! styleConfig.watchers[file] + "").red, file.grey);
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
 var rexToMatchLib = new RegExp("^" + GLOBAL.TOP_DIR_NAME);
 function watchImports(file, imports) {
     var processed = [];
     imports.forEach(function(imp) {
         if (!imp.path) return;
         // Ignore lib files
         if (imp.path.match(rexToMatchLib) && styleConfig.ignoreLibUpdates) {
             return;
         }
         // If import file isnt watched already
         if (!styleConfig.watchers[imp.path]) {
             watch(imp.path, file);
         } else {
             // if file already watched, add file to triggers
             addImportUsage(imp.path, file);
         }
         processed.push(imp);
     });
     if (processed.length > 0) {
         logDebug("IMPORTS".blue, getProperty(processed, 'path', function(val) {
             return basename(val);
         }).join(', ').bold, ' TRIGGERS RELOAD ON'.blue, basename(file));
     }
 }


// Debug info:
// Doubling up watchers! :P
if (styleConfig.watch) {
    watchLib.createMonitor(styleConfig.src,  function(monitor) {
        monitor.on("created", function(f, stat) {
            log("SOURCE: CREATED".yellow, f);
            fs.realpath(f, function(err, path) {
                watch(path);
            });
        });

        monitor.on("changed", function(f, curr, prev) {
            if (curr.mtime > prev.mtime && !basename(f).match(styleConfig.exclude)) {
                logDebug("SOURCE: CHANGE".yellow, f, '\n\n');
            }
        });

        monitor.on("removed", function(f, stat) {
            var dir = dirname(f, '.styl');
            fs.realpath(dir,
            function(err, dir) {
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

module.exports =  {
  watch: watch,
  watchImports: watchImports      
};