// MIT Licensed code from ThreeJS with some changes by me (Jimmy) to
// make this function a monkey patch of Mesh's raycast, in order to work around two issues:
//
// (1) raycast ignores geometry draw ranges, 
// (2) raycast bounding sphere check caches the bounding sphere and doesn't update when geometry changes 
//         (... and in our case geometry never changes and we never even want the sphere check)
// There's also a third issue where the raycast will get the wrong result for wireframe materials (draw ranges should be doubled in that case)
// but for now I think my code doesn't care about that case so I just assert against handling that ...
//
// in addition to these fixes, this code also adds "THREE." all over due to the way it's implemented as a monkeypatch.
THREE.Mesh.prototype.raycast = ( function () {

    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();
    var sphere = new THREE.Sphere();

    var vA = new THREE.Vector3();
    var vB = new THREE.Vector3();
    var vC = new THREE.Vector3();

    var tempA = new THREE.Vector3();
    var tempB = new THREE.Vector3();
    var tempC = new THREE.Vector3();

    var uvA = new THREE.Vector2();
    var uvB = new THREE.Vector2();
    var uvC = new THREE.Vector2();

    var barycoord = new THREE.Vector3();

    var intersectionPoint = new THREE.Vector3();
    var intersectionPointWorld = new THREE.Vector3();

    function uvIntersection( point, p1, p2, p3, uv1, uv2, uv3 ) {

        THREE.Triangle.barycoordFromPoint( point, p1, p2, p3, barycoord );

        uv1.multiplyScalar( barycoord.x );
        uv2.multiplyScalar( barycoord.y );
        uv3.multiplyScalar( barycoord.z );

        uv1.add( uv2 ).add( uv3 );

        return uv1.clone();

    }

    function checkIntersection( object, raycaster, ray, pA, pB, pC, point ) {

        var intersect;
        var material = object.material;

        if ( material.side === THREE.BackSide ) {

            intersect = ray.intersectTriangle( pC, pB, pA, true, point );

        } else {

            intersect = ray.intersectTriangle( pA, pB, pC, material.side !== THREE.DoubleSide, point );

        }

        if ( intersect === null ) return null;

        intersectionPointWorld.copy( point );
        intersectionPointWorld.applyMatrix4( object.matrixWorld );

        var distance = raycaster.ray.origin.distanceTo( intersectionPointWorld );

        if ( distance < raycaster.near || distance > raycaster.far ) return null;

        return {
            distance: distance,
            point: intersectionPointWorld.clone(),
            object: object
        };

    }

    function checkBufferGeometryIntersection( object, raycaster, ray, position, uv, a, b, c ) {

        vA.fromBufferAttribute( position, a );
        vB.fromBufferAttribute( position, b );
        vC.fromBufferAttribute( position, c );

        var intersection = checkIntersection( object, raycaster, ray, vA, vB, vC, intersectionPoint );

        if ( intersection ) {

            if ( uv ) {

                uvA.fromBufferAttribute( uv, a );
                uvB.fromBufferAttribute( uv, b );
                uvC.fromBufferAttribute( uv, c );

                intersection.uv = uvIntersection( intersectionPoint, vA, vB, vC, uvA, uvB, uvC );

            }

            intersection.face = new THREE.Face3( a, b, c, THREE.Triangle.normal( vA, vB, vC ) );
            intersection.faceIndex = a;

        }

        return intersection;

    }

    return function raycast( raycaster, intersects ) {

        var geometry = this.geometry;
        var material = this.material;
        var matrixWorld = this.matrixWorld;

        if ( material === undefined ) return;

        // Checking boundingSphere distance to ray

//        if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

//        sphere.copy( geometry.boundingSphere );
//        sphere.applyMatrix4( matrixWorld );
                                


//        if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;

        inverseMatrix.getInverse( matrixWorld );
        ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

        // Check boundingBox before continuing

        if ( geometry.boundingBox !== null ) {

            if ( ray.intersectsBox( geometry.boundingBox ) === false ) return;

        }

        var intersection;

        if ( geometry.isBufferGeometry ) {

            var a, b, c;
            var index = geometry.index;
            var position = geometry.attributes.position;
            var uv = geometry.attributes.uv;
            var i, l;

            if ( index !== null ) {

                // indexed buffer geometry

                for ( i = 0, l = index.count; i < l; i += 3 ) {

                    a = index.getX( i );
                    b = index.getX( i + 1 );
                    c = index.getX( i + 2 );

                    intersection = checkBufferGeometryIntersection( this, raycaster, ray, position, uv, a, b, c );

                    if ( intersection ) {

                        intersection.faceIndex = Math.floor( i / 3 ); // triangle number in indices buffer semantics
                        intersects.push( intersection );

                    }

                }

            } else if ( position !== undefined ) { // HACK: check for undefined position b/c this gets called w/ garbage data when I interact w/ the selection's rotation ball transform control?

                // non-indexed buffer geometry
                var drawRangeFac = 1;
                assert(!material.wireframe); // draw range may need to be cut in half in this case
                var l = Math.min(position.count,geometry.drawRange.start+geometry.drawRange.count);

                for ( i = geometry.drawRange.start; i < l; i += 3 ) {

                    a = i;
                    b = i + 1;
                    c = i + 2;

                    intersection = checkBufferGeometryIntersection( this, raycaster, ray, position, uv, a, b, c );

                    if ( intersection ) {

                        intersection.index = a; // triangle number in positions buffer semantics
                        intersects.push( intersection );

                    }

                }

            }

        } else if ( geometry.isGeometry ) {

            var fvA, fvB, fvC;
            var isMultiMaterial = Array.isArray( material );

            var vertices = geometry.vertices;
            var faces = geometry.faces;
            var uvs;

            var faceVertexUvs = geometry.faceVertexUvs[ 0 ];
            if ( faceVertexUvs.length > 0 ) uvs = faceVertexUvs;

            for ( var f = 0, fl = faces.length; f < fl; f ++ ) {

                var face = faces[ f ];
                var faceMaterial = isMultiMaterial ? material[ face.materialIndex ] : material;

                if ( faceMaterial === undefined ) continue;

                fvA = vertices[ face.a ];
                fvB = vertices[ face.b ];
                fvC = vertices[ face.c ];

                if ( faceMaterial.morphTargets === true ) {

                    var morphTargets = geometry.morphTargets;
                    var morphInfluences = this.morphTargetInfluences;

                    vA.set( 0, 0, 0 );
                    vB.set( 0, 0, 0 );
                    vC.set( 0, 0, 0 );

                    for ( var t = 0, tl = morphTargets.length; t < tl; t ++ ) {

                        var influence = morphInfluences[ t ];

                        if ( influence === 0 ) continue;

                        var targets = morphTargets[ t ].vertices;

                        vA.addScaledVector( tempA.subVectors( targets[ face.a ], fvA ), influence );
                        vB.addScaledVector( tempB.subVectors( targets[ face.b ], fvB ), influence );
                        vC.addScaledVector( tempC.subVectors( targets[ face.c ], fvC ), influence );

                    }

                    vA.add( fvA );
                    vB.add( fvB );
                    vC.add( fvC );

                    fvA = vA;
                    fvB = vB;
                    fvC = vC;

                }

                intersection = checkIntersection( this, raycaster, ray, fvA, fvB, fvC, intersectionPoint );

                if ( intersection ) {

                    if ( uvs && uvs[ f ] ) {

                        var uvs_f = uvs[ f ];
                        uvA.copy( uvs_f[ 0 ] );
                        uvB.copy( uvs_f[ 1 ] );
                        uvC.copy( uvs_f[ 2 ] );

                        intersection.uv = uvIntersection( intersectionPoint, fvA, fvB, fvC, uvA, uvB, uvC );

                    }

                    intersection.face = face;
                    intersection.faceIndex = f;
                    intersects.push( intersection );

                }

            }

        }

    };

}() );
