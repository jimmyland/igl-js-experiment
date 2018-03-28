// this will be a wrapper around igl functionality, helping exposing it to js (and threejs specifically)

#include <iostream>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#endif

#include "igl/cotmatrix.h"
#include <Eigen/Dense>
#include <Eigen/Sparse>

using namespace emscripten;

// define this to disable all (expensive, debugging-only) sanity checking; INSANITY is recommended for a final build
#define INSANITY

// main is called once emscripten has asynchronously loaded all it needs to call the other C functions
// so we wait for its call to run the js init
int main() {
    emscripten_run_script("ready_for_emscripten_calls = true;");
}

int test()
{
    Eigen::MatrixXd V(4,2);
    V<< 0,0,
        1,0,
        1,1,
        0,1;
    Eigen::MatrixXi F(2,3);
    F<< 0,1,2,
        0,2,3;
    Eigen::SparseMatrix<double> L;
    igl::cotmatrix(V,F,L);
    std::cout << "Hello, mesh: " << std::endl << L*V << std::endl;
    return 0;
}

EMSCRIPTEN_BINDINGS(igl) {
    function("test", &test);
}
