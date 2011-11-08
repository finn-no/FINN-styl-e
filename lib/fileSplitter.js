var cssom = require('cssom');
var cssparser = require('cssom').parse;

var Splitter = module.exports = function Splitter(str) {
   console.log('INPUT', str);
   this.str = str;
   this.parse();
   this.compact();
   this.toFileArray();
   return this;
};

/*
 Split the file into a tree
*/
Splitter.prototype.parse = function parse(){
   console.log('PARSING');
   this.tree = cssparser(this.str);
   return this;
};

/*
   Compact tree
   Move same @filename selectors
*/
Splitter.prototype.compact = function compact(){
   var self = this;
   this.result = {current:[]};
   this.tree.cssRules.forEach(function(rule, i){
      console.log(rule.selectorText, rule.style, i)
      self.addToResult(rule);
   })
   return this;
}

/*

*/
var rexTest = /\$(\w+)|@(\d+)/;
var rexReplace = /(\$\w+?\s)|(@\d+?\s)/m;
Splitter.prototype.addToResult = function addToResult(rule){
   var matches = rule.selectorText.match(rexTest);
   console.log('MATCH', matches)
   if (matches) {
      var filename = matches[1]||matches[2];
      rule.selectorText = rule.selectorText.replace(rexReplace, '');
      if (this.result[filename]) {
         this.result[filename].push(rule);
      } else {
         this.result[filename] = [rule];
      }
   } else {
      this.result.current.push(rule);
   }
};

/*
[
   {
   filename: 'filename.css',
   content: [].join('\n')
   }   
]
*/

Splitter.prototype.toFileArray = function toFileArray(){
   this.fileArray = []
   var stylesheet;
   for (key in this.result) {
      stylesheet = new cssom.CSSStyleSheet();
      console.log("stylesheet", stylesheet.insertRule);
      this.result[key].forEach(function(rule, i){
         stylesheet.insertRule(rule)
      });
      
      
      this.fileArray.push({
         filename: key,
         filecontent: stylsheet.toString()
      });
   }
      
   return this;
}


var str = 'body{background:red}\
body $300 .wrapper{color:green}\
body @300 div {color:red;}\
body @ignore {test}';

var splitter = new Splitter(str)
console.log("SPLITTER:", splitter.tree.toString());
console.log("RESULT:", splitter.result);
console.log("FILECONTENT:", splitter.fileArray);

setTimeout(function(){}, 100000);
