# IGL-JS Experiment

## This is a playground for adding web UI on top of libigl algos

There's a bunch of cool research code here that has no UI.

I just want to make toys out of some of it.

Any new code here from me is released under the standard open source MIT license.

# Developer Instructions

If you want to make toys here too, that's cool.

## Building and running:

### Compiling the C++ code

If you just want to mess with JS, I'm going to include pre-compiled js for any C++ components.

If you want to mess with the C++:

1. Acquire Emscripten: http://kripken.github.io/emscripten-site/ (or `brew install emscripten` on Mac if you have homebrew)

2. Run `make`.

### Running the JS code

You basically just need to open index.html in a browser, BUT for the browser to successfully load all the other resource and js files it needs, you'll need to serve that file from a local server instead of opening it directly.  What I do is install the super-basic `http-server` and use that to serve index.html on localhost:

1. Install node.js: https://nodejs.org/en/download/ (or `brew install node` on Mac if you have homebrew)
2. Install http-server globally: `npm install http-server -g`
3. cd to the directory where you've downloaded the voro project files, and run `http-server`
4. While the server is running, open `http:127.0.0.1:8080` in your web browser

When developing and testing the code, I like to use Chrome and have the developer tools open, and go to the Network tab of the developer tools and make sure 'Disable cache' is checked.  That way, when I edit a javascript file and refresh the browser, it will reliably pick up my changes.
