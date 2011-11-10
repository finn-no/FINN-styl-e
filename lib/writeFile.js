var   fs          = require('fs'),
      basename    = require('path').basename,
      dirname     = require('path').dirname,
      nodefs      = require('node-fs'),
      watch       = require('./watcher');

function makeFolder(folderpath, cb) {
    nodefs.mkdir(folderpath, '0777', true,
    function(err) {
        if (err) {
            if (err.code == "EEXIST") {
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

/*
  Write file to defined locations in config.json
*/
function writeFile(file, css, watchEnabled) {
    var currDir = dirname(file, '.styl'),
    outputFilename = '/' + basename(file, '.styl') + '.css';

    var write = function(path) {
        var finalWrite = function() {
            fs.writeFile(path, css, function(err) {
                if (err) throw err;
                log('WRITTEN '.blue + basename(path).bold + ' TO TARGET PATHS:'.blue, "..." + path.replace(outputFilename, '').substring(path.length - 120, path.length).grey);
                // Watch file for changes
                if (watchEnabled) watch.watch(file);
            });
        };

        fs.readFile(path, 'utf8',function(err, data) {
            if (err) {
                // non existant file
                if (err.code == "ENOENT") {
                    finalWrite();
                } else {
                    console.log("ERROR READFILE".red, basename(path).bold, err);
                }
            } else {
                if (css !== data) {
                    finalWrite();
                } else {
                    if (watchEnabled) watch.watch(file);
                }
            }
        });
    };
    
    /*
        Iterate and copy result file to each target.
    */
    var lastFolders = currDir.replace(styleConfig.srcPath, '');
    styleConfig.targetPaths.forEach(function(targetDir) {
        var folder = targetDir + lastFolders;
        makeFolder(folder, function() {
            write(folder + outputFilename);
        });
    });
}

module.exports = writeFile;