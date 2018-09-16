// this will be a wrapper around igl functionality, helping exposing it to js (and threejs specifically)

#include <iostream>
#include <fstream>
#include <string>

#include <exception>

// pthreads support is experimental in emscripten; safer to disable threading for now
#define IGL_PARALLEL_FOR_FORCE_SERIAL

#ifdef EMSCRIPTEN
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#endif

#include "igl/cotmatrix.h"
#include "igl/readOBJ.h"
#include "igl/qslim.h"
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

void err(const std::string &msg) {
    std::cerr << "ERROR: " << msg << std::endl;
    #ifndef INSANITY
    assert(false);
    #endif
}

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
    
    // helpers to cast from the igl-favored forms to the 3js-favored forms
    void setV(const Eigen::MatrixXd &V) {
        this->V = V.cast<float>();
    }
    void setF(const Eigen::MatrixXi &F) {
        this->F = F.cast<unsigned int>();
    }
    
    bool qslim(size_t targetFaceCount) {
        // extra casting because igl::qslim only accepts the igl-favored forms
        Eigen::MatrixXd Vin = V.cast<double>();
        Eigen::MatrixXi Fin = F.cast<int>();
        Eigen::MatrixXd OutV;
        Eigen::MatrixXi OutF;
        Eigen::VectorXi birthFaces, birthVertices;
        bool success = igl::qslim(Vin, Fin, targetFaceCount, OutV, OutF, birthFaces, birthVertices);
        if (!success) {
            err("qslim failed");
            return false;
        }
        this->setV(OutV);
        this->setF(OutF);
        return true;
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
    .function("qslim", &Mesh::qslim)
    ;
}
