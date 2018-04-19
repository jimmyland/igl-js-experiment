// main test code for running the vorojs functions + showing results via threejs
// currently just a chopped up version of a basic threejs example
/* global THREE, Detector, saveAs, fromByteArray, toByteArray, $, ready_for_emscripten_calls, Module */
/*jshint -W008 */
/*jslint devel: true, indent: 4, maxerr: 50 */
"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var scene, camera, renderer;
var lights;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();


var controls;
var last_touch_for_camera = false;
function override_cam_controls() { // disable trackball controls
    controls.overrideState();
    controls.dragEnabled = false;
    last_touch_for_camera = false;
}


// var v3;
var xf_manager;
var undo_q;

var settings;
var m3;

function loadMeshFile(evt) {
    var files = evt.target.files;

    if (files.length > 0) {
        var reader = new FileReader();
        reader.onload = function(event) {
            Module['FS_createDataFile']('/', 'rot.obj', new Uint8Array(event.target.result), true, false);
            Module.test('/root.obj');
            Module.test('/rot.obj');
            Module.test('rot.obj');
            var m = Module.loadOBJ('rot.obj');
            m3 = new RawMesh3(m, xf_manager.scene);
        };
        reader.readAsArrayBuffer(files[0]);
    }
    document.getElementById('upload_mesh').value = null;
}


function load_mesh() {
    document.getElementById('upload_mesh').addEventListener('change', loadMeshFile, false);
    $("#upload_mesh").trigger('click');  // click a hidden button on the index page to trigger the load file dialog
    return false;
}


//camera, renderer.domElement
var XFManager = function (scene, camera, domEl, override_other_controls) {
    this.controls = undefined;
    var _this = this;

    this.init_geom = function() {
        // init geom, mat, pts, positions to represent handles (w/ none initially)
        this.geom = new THREE.Geometry();
        this.positions = new Float32Array(this.max_points*3);
        this.mat = new THREE.PointsMaterial( { size: 0.2, color: 0x00ffff, depthTest: false, depthWrite: false } );
        this.mat.visible = false;
        this.pts = new THREE.Points(this.geom, this.mat);
        this.geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,0), 100000); // just make it huge; we don't care about the bounding sphere.
        this.scene.add(this.pts);
        this.pts.renderOrder = 1;
    };

    this.reset = function() {
        this.selected = [];
        this.plane = this.mouse_offset = undefined;

        this.mat.visible = false;
        this.controls.detach();
    };

    this.init = function(scene, camera, domEl, override_other_controls) {
        // this.v3 = v3;
        this.scene = scene;
        this.camera = camera;
        this.domEl = domEl;
        this.controls = new THREE.TransformControls(camera, domEl);
        this.controls.addEventListener('objectChange', this.handle_moved); //moved_control
        this.controls.addEventListener('mouseDown', override_other_controls); //e.g. steal from camera
        this.controls.setSpace("world");
        this.scene.add(this.controls);
        this.init_geom();
        this.reset();
    };

    this.update = function() {
        if (this.controls) this.controls.update();
    };

    this.keydown = function(event) {
        if (event.keyCode === 27) {
            this.deselect();
        }
        
        if (this.controls.visible) {
            if (event.keyCode === 'W'.charCodeAt()) {
                this.controls.setMode("translate");
            }
            if (event.keyCode === 'E'.charCodeAt()) {
                this.controls.setMode("rotate");
            }
            if (event.keyCode === 'R'.charCodeAt()) {
                this.controls.setMode("scale");
            }
        }
    };

    this.handle_moved = function() {
        _this.move_selected();
        render();
    };

    this.detach = function() { if (this.controls) this.controls.detach(); };
    this.invis = function() { if (this.mat) this.mat.visible = false; };
    this.stop_custom = function() { this.plane = null; };

    this.deselect = function() {
        this.selected = [];
        this.detach();
        this.invis();
    };

    this.over_axis = function() { return this.controls && this.controls.axis; };
    this.dragging = function() { return this.controls && this.controls.visible && this.controls._dragging; };
    this.dragging_custom = function() { return this.mat && this.plane; };
    this.active = function() { return this.selected.length > 0 && this.mat && this.plane; };

    this.drag_custom = function(mouse) {
        if (this.controls) {
            this.controls.axis = null; // make sure the transformcontrols are not active when the custom drag controls are active
        }

        var pos = mouse.clone().add(this.mouse_offset);
        var caster = new THREE.Raycaster();
        caster.setFromCamera(pos, this.camera);
        
        var endpt = new THREE.Vector3();
        endpt.copy(caster.ray.direction);
        endpt.multiplyScalar(1000);
        endpt.add(caster.ray.origin);
        
        var rayline = new THREE.Line3(caster.ray.origin, endpt);
        var newpos = this.plane.intersectLine(rayline);
        if (newpos && this.selected.length > 0) {
            this.pts.position.set(newpos.x, newpos.y, newpos.z);
            this.move_selected();
        }
    };

    this.move_selected = function() { // assume this.selected is 1:1 w/ the points in this.geom
        this.pts.updateMatrixWorld();
        var p = this.positions;
        var v = new THREE.Vector3();
        var posns = [];
        for (var i=0; i<this.selected.length; i++) {
            v.set(p[i*3],p[i*3+1],p[i*3+2]);
            v.applyMatrix4(this.pts.matrixWorld);
            posns.push([v.x,v.y,v.z]);
        }
        // TODO: actually update posns
    };


    this.attach = function(selected, skip_setting_plane) {
        this.selected = selected;
        if (this.selected.length > 0) {
            if (!skip_setting_plane) {
                // TODO: Setup movement plane through selected object, parallel to lens
                // var n = camera.getWorldDirection();
                // var p = new THREE.Vector3().fromArray(etc);
                // this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
                // var p_on_screen = p.project(camera);
                // this.mouse_offset = p_on_screen.sub(mouse);
            }
            render();
        } else {
            this.deselect();
        }
    };

    this.init(scene, camera, domEl, override_other_controls);
};




function wait_for_ready() {
    if (ready_for_emscripten_calls) {
        init();
    } else {
        requestAnimationFrame( wait_for_ready );
    }
}
$(document).ready( function() {
    wait_for_ready();
});


function clear_lights() {
    if (lights) {
        for (var i=0; i<lights.length; i++) {
            scene.remove(lights[i]);
        }
        lights = [];
    }
}

var LightPresets = {
    "Axis Colors": function() {
        var l = [];
        l[0] = new THREE.DirectionalLight( 0xcc9999 );
        l[1] = new THREE.DirectionalLight( 0x99cc99 );
        l[2] = new THREE.DirectionalLight( 0x9999cc );
        
        l[3] = new THREE.DirectionalLight( 0xff9999 );
        l[4] = new THREE.DirectionalLight( 0x99ff99 );
        l[5] = new THREE.DirectionalLight( 0x9999ff );
        
        l[0].position.set( 0, 1, 0 );
        l[1].position.set( 1, 0, 0 );
        l[2].position.set( 0, 0, 1 );
        l[3].position.set( 0,-1, 0 );
        l[4].position.set(-1, 0, 0 );
        l[5].position.set( 0, 0,-1 );
        return l;
    },
    "Plain Three Light": function() {
        var l = [];
        l[0] = new THREE.DirectionalLight( 0x888888 );
        l[1] = new THREE.DirectionalLight( 0x888888 );
        l[2] = new THREE.AmbientLight( 0xdddddd );
        
        l[0].position.set(  1, .1,-.1 );
        l[1].position.set( .1,-.1,  1 );
        return l;
    },
    "Solid Color with No Shading": function() {
        var l = [new THREE.AmbientLight( 0xffffff )]; 
        l[0].intensity = 1.5;
        return l;
    }
};

function set_lights(light_preset_name) {
    clear_lights();

    lights = LightPresets[light_preset_name]();

    for (var i=0; i<lights.length; i++) {
        scene.add(lights[i]);
    }
}

function setup_scene() {
    // TODO: cleanup any old scene stuff first

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 30;

    // TODO: make an undo queue class and init it here ...
    // undo_q = new UndoQueue();
    
    set_lights("Plain Three Light");
    
    var bb_geom = new THREE.BoxBufferGeometry( 20, 20, 20 );
    var bb_edges = new THREE.EdgesGeometry( bb_geom );
    scene.add( new THREE.LineSegments( bb_edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) ) );

    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.rotateSpeed = 10.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', render );

    xf_manager = new XFManager(scene, camera, renderer.domElement, override_cam_controls);
}

function focusOver() {
    $('#container').focus();
}

function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    
    window.addEventListener( 'resize', onWindowResize, false );
    var container = document.getElementById( 'container' );
    container.addEventListener( 'mousemove', onDocumentMouseMove, false );
    container.addEventListener( 'touchstart', onDocumentTouchStart, false );
    container.addEventListener( 'touchmove', onDocumentTouchMove, false );
    container.addEventListener( 'touchend', onDocumentTouchEnd, false );
    container.addEventListener( 'mousedown', onDocumentMouseDown, false );
    container.addEventListener( 'keydown', onDocumentKeyDown, false );
    container.addEventListener( 'mouseup', onDocumentMouseUp, false );
    container.addEventListener( 'mouseover', focusOver, false );

    
    container.appendChild( renderer.domElement );

    setup_scene();
    
    animate();
    render();
}

function onDocumentKeyDown( event ) {
    addToUndoQIfNeeded();
    if (event.keyCode == "Z".charCodeAt() && (event.ctrlKey || event.metaKey)) {
        if (event.shiftKey) {
            // TODO: redo();
        } else {
            // TODO: undo();
        }
    }

    if (event.keyCode == "D".charCodeAt()) { // debug test key
        Module.test();
    }
    
    xf_manager.keydown(event);

    // not sure this feature was actually useful ...
    // if (event.keyCode >= 'X'.charCodeAt() && event.keyCode <= 'Z'.charCodeAt()) {
    //     var axis = event.keyCode - 'X'.charCodeAt();
    //     controls.alignToAxis(axis);
    //     xf_manager.deselect();
    // }

    // if the keypresses did anything worthy of the undo Q, ensure it's captured seprately.
    addToUndoQIfNeeded();

    render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
    render();
}





function addToUndoQIfNeeded() {
    // var old_sel = undo_q.get_top_sel_inds();
    // var selection_changed = function(old_sel, sel) {
    //     if (old_sel.length != sel.length) {
    //         return true;
    //     }
    //     for (var i=0; i<sel.length; i++) {
    //         if (sel[i] != old_sel[i]) {
    //             return true;
    //         }
    //     }
    //     return false;
    // };
    // if (v3.has_acts() || selection_changed(old_sel, xf_manager.cells)) {
    //     undo_q.add_undoable(new UndoAct(old_sel, xf_manager.cells, v3.pop_acts()));
    // }
}

function startMove(mouse, extend_current_sel, nbr) {
    if (!xf_manager.active()) {
        // TODO: Select and move stuff
        // if (settings.mode === 'move' || settings.mode === 'move neighbor') {
        //     var moving_cell_new;
        //     if (settings.mode === 'move') {
        //         moving_cell_new = v3.raycast(mouse, camera, raycaster);
                
        //     }
        //     if (settings.mode === 'move neighbor' || nbr) {
        //         moving_cell_new = v3.raycast_neighbor(mouse, camera, raycaster);
        //     }
        //     if (moving_cell_new < 0) {
        //         return;
        //     }

        //     var has_cell = false;
        //     for (var i=0; i<xf_manager.cells.length; i++) {
        //         has_cell = has_cell || (xf_manager.cells[i] === moving_cell_new);
        //     }

        //     var cells = [moving_cell_new];
        //     if (extend_current_sel || has_cell) {
        //         cells = xf_manager.cells;
                
        //         if (!has_cell) {
        //             cells.push(moving_cell_new);
        //         }
        //     }
        //     xf_manager.attach(cells);
        // }
    }
}

function set_cursor(cell_over) {
    // TODO: do this
    // if (cell_over === undefined) {
    //     cell_over = v3.raycast(mouse, camera, raycaster);
    // }
    // if (controls.isActive()) {
    //     renderer.domElement.style.cursor = "move";
    // } else if (xf_manager.dragging() || xf_manager.dragging_custom()) {
    //     renderer.domElement.style.cursor = "move";
    //     renderer.domElement.style.cursor = "grabbing";
    //     renderer.domElement.style.cursor = "-moz-grabbing";
    //     renderer.domElement.style.cursor = "-webkit-grabbing";
    // } else if (xf_manager.over_axis()) {
    //     renderer.domElement.style.cursor = "default";
    // } else if (cell_over !== null && cell_over >= 0) {
    //     renderer.domElement.style.cursor = "pointer";
    // } else {
    //     renderer.domElement.style.cursor = "move";
    // }
}

function onDocumentMouseDown(event) {
    doToggleClick(event.button, mouse);
    var buttons = event.buttons;
    if (buttons === undefined) { // safari doesn't know about event.buttons yet
        buttons = event.button === 0; // this hack allows the sad safari to paint
    }

    startMove(mouse, event.shiftKey, event.button===2);
    
    render();

    set_cursor();
}

// unused vector logging functions; helpful for debugging sometimes
// function logv2(s,v){
//     console.log(s + ": " + v.x + ", " + v.y);
// }
// function logv3(s,v){
//     console.log(s + ": " + v.x + ", " + v.y + ", " + v.z);
// }

function onDocumentMouseUp() {
    xf_manager.stop_custom();
    addToUndoQIfNeeded();

    set_cursor();
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    doCursorMove(event.clientX, event.clientY);
    var over_moving_controls = xf_manager.over_axis();
    var cell_over = check_allow_trackball(over_moving_controls);
    set_cursor(cell_over);
    
}

function check_allow_trackball(over_moving_controls) {
    if (over_moving_controls===undefined) over_moving_controls = xf_manager.over_axis();
    if (!xf_manager.dragging()) {
        // cell = v3.raycast(mouse, camera, raycaster);
        // if (!controls.isActive() || controls.isTouch()) {
        //     controls.dragEnabled = (cell < 0 || settings.mode === 'camera') && !over_moving_controls;
        //     if (!controls.dragEnabled) {
        //         set_preview_hover();
        //     }
        // }
    }
    return null;
}
function doCursorMove(cur_x, cur_y) {
    mouse.x = ( cur_x / window.innerWidth ) * 2 - 1;
    mouse.y = - ( cur_y / window.innerHeight ) * 2 + 1;
    if (xf_manager.dragging_custom()) {
        xf_manager.drag_custom(mouse);
    }
    
    render();
}

function mouse_from_touch(event) {
    var cur_x = event.touches[0].clientX, cur_y = event.touches[0].clientY;
    mouse.x = ( cur_x / window.innerWidth ) * 2 - 1;
    mouse.y = - ( cur_y / window.innerHeight ) * 2 + 1;
}

function onDocumentTouchStart( event ) {
    event.preventDefault();

    mouse_from_touch(event);
    check_allow_trackball(xf_manager.controls.checkHover(event));

    startMove(mouse, false, false);
}

function onDocumentTouchMove( event ) {
    event.preventDefault();
    mouse_from_touch(event);
    doCursorMove(event.touches[0].clientX, event.touches[0].clientY);
}
function onDocumentTouchEnd( event ) {
    xf_manager.stop_custom();

    event.preventDefault();
    addToUndoQIfNeeded();
}

function render() {
    xf_manager.update();
    renderer.render( scene, camera );
}

function animate() {
    render();  
    controls.update();

    requestAnimationFrame( animate );
}



