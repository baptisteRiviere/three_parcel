import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Stats } from 'three/examples/jsm/libs/stats.module.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { OctreeHelper } from 'three//examples/jsm/helpers/OctreeHelper.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';


// SCENE INIT

const scene = new THREE.Scene();
const worldOctree = new Octree();

// CAMERA

const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.set(2, 5, 2);

// RENDERER

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// LIGHTS AND BACKGROUND

var hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
hemiLight.position.set(0, 300, 0);
scene.add(hemiLight);

var dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(75, 300, -75);
scene.add(dirLight);

scene.fog = new THREE.Fog(0xffffff, 0.015, 100);
scene.background = new THREE.Color(0x87CEEB)

// MENU PANEL

const menuPanel = document.getElementById('menuPanel');
const startButton = document.getElementById('startButton');
startButton.addEventListener(
  'click',
  function () {
    controls.lock()
  },
  false
)

// CONTROLS

/*
const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents(window); // optional
controls.enablePan = false;
controls.enableZoom = false;
*/

const controls = new PointerLockControls(camera, renderer.domElement);
controls.lock();
controls.addEventListener('lock', function () { menuPanel.style.display = 'none'; });
controls.addEventListener('unlock', function () { menuPanel.style.display = 'block'; });


// LOADER

async function loadData(datafile, modelManipulation = false) {
  new GLTFLoader()
    .setPath('assets/models/')
    .load(datafile, (gltf) => {
      let model = null;
      model = gltf.scene;
      if (model != null) {
        console.log("Model loaded:  " + model);
        if (modelManipulation) {
          modelManipulation(model);
        }
        scene.add(model);
        //worldOctree.fromGraphNode(model);
      } else {
        console.log("Load FAILED.  ");
        return false
      }
    });
}

// TEST CUBE 

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// LOADING BUCKET

function bucketManipulation(bucket) {
  //worldOctree.fromGraphNode(bucket);
  const x = 2;
  const y = 1;
  const z = -6;
  bucket.position.set(x, y, z);
  camera.lookAt(x, y, z);
}

loadData('myBucket.glb', bucketManipulation)


// LOADING GARDEN

loadData('garden.glb');

// ADDING SPHERES

const SPHERE_RADIUS = 0.2;

const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbb44 });

const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add(sphereMesh);

let sphere = {
  mesh: sphereMesh,
  collider: new THREE.Sphere(new THREE.Vector3(0, - 100, 0), SPHERE_RADIUS),
  velocity: new THREE.Vector3()
};

// ****************************************************
//
// THROWING THINGS

// init

const GRAVITY = 30;
const STEPS_PER_FRAME = 5;

let capsuleStart = new THREE.Vector3(0, -0.3, 0).add(camera.position);
let capsuleEnd = new THREE.Vector3(0.3, -0.1, 0).add(camera.position);

const playerCollider = new Capsule(capsuleStart, capsuleEnd, 0.35);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let mouseTime = 0;

// event listeners

document.addEventListener('mouseup', () => {
  console.log(sphere.mesh.position);
  if (document.pointerLockElement !== null) throwBall();
});

document.addEventListener('mousedown', () => {
  mouseTime = performance.now();
});

// physics

function throwBall() {
  camera.getWorldDirection(playerDirection);
  sphere.collider.center.copy(playerCollider.end).addScaledVector(playerDirection, playerCollider.radius * 1.5);
  const impulse = 15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));
  sphere.velocity.copy(playerDirection).multiplyScalar(impulse);
  sphere.velocity.addScaledVector(playerVelocity, 2);
}

function updateSphere(deltaTime) {
  sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);
  const result = worldOctree.sphereIntersect(sphere.collider);
  if (result) {
    sphere.velocity.addScaledVector(result.normal, - result.normal.dot(sphere.velocity) * 1.5);
    sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
  } else {
    sphere.velocity.y -= GRAVITY * deltaTime;
  }
  const damping = Math.exp(- 1.5 * deltaTime) - 1;
  sphere.velocity.addScaledVector(sphere.velocity, damping);

  sphere.mesh.position.copy(sphere.collider.center);

}


// CLOCK

const clock = new THREE.Clock();

// Main loop

const animation = () => {

  renderer.setAnimationLoop(animation); // requestAnimationFrame() replacement, compatible with XR 

  const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
  updateSphere(deltaTime);

  renderer.render(scene, camera);

};

animation();
