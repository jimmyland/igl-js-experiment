var RawMesh3 = function(iglMesh, scene) {
    var that = this;

    this.mesh = iglMesh;
    this.scene = scene;

    this.material = new THREE.MeshPhongMaterial( { vertexColors: THREE.NoColors, color: 0xaaaaaa, specular: 0x111111, shininess: 5, shading: THREE.FlatShading } );
    this.geometry = new THREE.BufferGeometry();

    this.geometry.setIndex(new THREE.BufferAttribute(this.mesh.getIndices(), 1));
    this.geometry.addAttribute('position', new THREE.BufferAttribute(this.mesh.getVertices(), 3));

    this.mesh3 = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh3);

};

RawMesh3.prototype.constructor = RawMesh3;
