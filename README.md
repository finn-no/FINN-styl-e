#FINN-styl-e! work/hack in progress, please ignore :).

Goals
- Integrate stylus well
- Auto import and expose convenient libs
- Global config file
- Support spriting
  
  - Get code, place wherever you want...

  
        $ git clone git@github.com:finn-no/FINN-styl-e.git
  
  
  -  install node-canvas dependency "cairo grapics library": https://github.com/LearnBoost/node-canvas/wiki || http://cairographics.org/download/ 
  

        LINUX:  $ sudo apt-get install libcairo2-dev libjpeg8-dev libgd2-xpm-dev pngcrush
  
        MAC:    $ sudo brew install cairo libgd pngcrush
        
        WINDOWS:$ noop!


  - Dependencies
    - ? Install node.js >= v0.4.12 and npm. www.nodejs.org, www.npmjs.org
  

            $ npm install
  
            $ sudo npm link
  
  - Usage
    -  make a config.json file and 'cd' to this folder.      
    
            $ finnstyle
  
  
#TODO
  - Make pretty/non-hacky :)
  - Make tests
  
## License 

(The MIT License)

Copyright (c) 2011 Sveinung Røsaker

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.  
