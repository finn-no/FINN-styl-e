var cssom = require('cssom');
var cssparser = cssom.parse;

var ResponsiveSplitter = module.exports = function ResponsiveSplitter(str, filename) {
   this.str = str;
   this.filename = filename||'current';
   this.parse().compact().toFileArray();
   return this;
};

/*
 Split the file into a tree
*/
ResponsiveSplitter.prototype.parse = function parse(){
   this.tree = cssparser(this.str);
   return this;
};

/*
   Compact tree
   Move same @filename selectors
*/
ResponsiveSplitter.prototype.compact = function compact(){
   var self = this;
   this.result = {};
   this.result[this.filename] = [];
   this.tree.cssRules.forEach(function(rule, i){
      self.addToResult(rule);
   })
   return this;
}

/*

*/
var rexTest = /\$(\w+)|\@(\d+)/g;
var rexReplace = /((\s)?(\$\w+|@\d+))/gm;
ResponsiveSplitter.prototype.addToResult = function addToResult(rule){
   var matches = rule.selectorText.match(rexTest);
   var rules = [];
   if (matches) {
      logDebug("MATCHES".red, matches.length, (matches).join(", ") + "".yellow);      

      var filename = matches[matches.length - 1].substring(1);
      // remove @ $ notation
      rule.selectorText = rule.selectorText.replace(rexReplace, '');

      if (this.result[filename]) {
         this.result[filename].push(rule);
      } else {
         this.result[filename] = [rule];
      }
   } else {
      this.result[this.filename].push(rule);
   }
};


// output css properties
function propToString(props){
   var res = "";
   for(var i = 0; i < props.length; i++) {
      var propKey = props[i];
      res += "  " + propKey + ":" + props[propKey] + ";\n"
   }
   return res;
}

// output selectors
function ruleToString(rule){
   return rule.selectorText + " {\n" + propToString(rule.style) +  "}\n"
}

/*
[
   {
   filename: 'filename.css',
   content: [].join('\n')
   }   
]
*/
ResponsiveSplitter.prototype.toFileArray = function toFileArray(){
   this.fileArray = []
   var filecontent = '';
   for (key in this.result) {
      if (key != 'unresponsive') {
         filecontent = ''   
         this.result[key].forEach(function(rule, i){
            filecontent += ruleToString(rule);
         });

         this.fileArray.push({
            filename: key,
            filecontent: filecontent
         });
      }
   }
   /*
      if keyword unresponsive, collect all but no-notation filecontent
   */
   if (this.result.unresponsive) {
      var self = this,
          content = "";
      //collect filecontent from notation files
      this.fileArray.forEach(function(fileObj){
         if (self.filename != fileObj.filename && 
             fileObj.filename != 'unresponsive') {
            content += fileObj.filecontent;
         }
      });
      //add unresponsive file content
      this.result.unresponsive.forEach(function(rule, i){
         content += ruleToString(rule);
      });
      // Add to fileArray
      this.fileArray.push({
         filename: 'unresponsive',
         filecontent: content 
      });
   }
   
   return this;
}


/*var str = 'body{background:red}\
body $300 .wrapper{color:green;background-color:blue;}\
body @300 div {color:red;-moz-border-radius:10px 1px 0px 10px;}\
body div @500 {color:red;-moz-border-radius:10px 1px 0px 10px;}\
body @ignore {test}\
$300 div.for500 @500 {text-align:center;}';

var ResponsiveSplitter = new ResponsiveSplitter(str)
//console.log("ResponsiveSplitter:", ResponsiveSplitter.tree.toString());
//console.log("RESULT:", ResponsiveSplitter.result);
console.log("FILECONTENT:".blue, ResponsiveSplitter.fileArray);

setTimeout(function(){}, 100000);*/
