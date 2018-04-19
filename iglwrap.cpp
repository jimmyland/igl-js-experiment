// this will be a wrapper around igl functionality, helping exposing it to js (and threejs specifically)

#include <iostream>
#include <fstream>
#include <string>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#endif

#include "igl/cotmatrix.h"
#include "igl/readOBJ.h"
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

typedef Eigen::Matrix<float, Eigen::Dynamic, 3, Eigen::RowMajor> RowMat3f;
typedef Eigen::Matrix<unsigned int, Eigen::Dynamic, 3, Eigen::RowMajor> RowMat3ui;

struct Mesh
{
    RowMat3ui F;
    RowMat3f V;

    val getVertices() {
        return val(typed_memory_view(V.size(), V.data()));
    }

    val getIndices() {
        return val(typed_memory_view(F.size(), F.data()));
    }
};

Mesh loadOBJ(std::string file) {
    Mesh m;
    igl::readOBJ(file, m.V, m.F);
    return m;
}

int test(std::string file)
{
    std::cout << "trying to load " << file << std::endl;

    std::vector<std::vector<double > > Vo;
    std::vector<std::vector<int> > Fo;
    igl::readOBJ(file, Vo, Fo);
    std::cout << "loaded " << file << " with verts " << Vo.size() << " and faces " << Fo.size() << std::endl;
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
    function("loadOBJ", &loadOBJ);
    class_<Mesh>("Mesh")
    .function("getVertices", &Mesh::getVertices)
    .function("getIndices", &Mesh::getIndices)
    ;
}
