import * as Alea from "alea";

global.THREE = require('three');

import 'bootstrap';
import '../scss/index.scss';

import OrbitControls from 'orbit-controls-es6';
import WEBGL from './utils/WebGL';

var dat = require('dat.gui/build/dat.gui.js');
var Stats = require('stats.js');

const checkerboard = require('../assets/textures/checkerboard.jpg');
const star = require('../assets/textures/star.png');
const skybox_px = require('../assets/textures/sky/dark-s_px.jpg');
const skybox_nx = require('../assets/textures/sky/dark-s_nx.jpg');
const skybox_py = require('../assets/textures/sky/dark-s_py.jpg');
const skybox_ny = require('../assets/textures/sky/dark-s_ny.jpg');
const skybox_pz = require('../assets/textures/sky/dark-s_pz.jpg');
const skybox_nz = require('../assets/textures/sky/dark-s_nz.jpg');

// /* eslint import/no-webpack-loader-syntax: off */
import * as meshVertShader from '!raw-loader!glslify-loader!./shaders/vertexShader.glsl';
import * as meshFragShader from '!raw-loader!glslify-loader!./shaders/fragmentShader.glsl';
import * as SimplexNoise from "simplex-noise";

const GROUP_SIZE = 50;

class Application {
  constructor(opts = {}) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    if (opts.container) {
      this.container = opts.container;
    } else {
      const div = Application.createContainer();
      document.body.appendChild(div);
      this.container = div;
    }

    if (WEBGL.isWebGLAvailable()) {
      this.init();
      this.animate();
    } else {
      var warning = WEBGL.getWebGLErrorMessage();
      this.container.appendChild(warning);
    }
  }

  init() {
    // Preamble of standard stuff expected everywhere
    this.prepareInit();

    // Standard scene stuff
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupHelpers();
    this.setupFloor();
    this.setupControls();

    this.setupCube();
    this.setupCustomObject();
    this.setupParticleSystem();
    this.setupGroupObject();
    this.setupSkyBox();

    this.setupParamsControl();

    window.addEventListener('resize', () => this.onResize, false);
  }

  prepareInit() {
    this.scene = new THREE.Scene();
    this.stats = new Stats();
    this.random = new Alea();
    this.noise = new SimplexNoise(this.random);
    this.gui = new dat.GUI();

    this.params = {
      // General
      rotate: true,
      panRotate: true,
      // Lighting
      dirLightColor: 0x9f9f9f,
      spotLightColor: 0xffffff,
      ambLightColor: 0x040404,
    };
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    this.stats.update();
    this.controls.update();
    this.update();
    this.renderer.render(this.scene, this.camera);
    // when render is invoked via requestAnimationFrame(this.render) there is no 'this',
    // so either we bind it explicitly like so: requestAnimationFrame(this.render.bind(this));
    // or use an es6 arrow function like so:
    requestAnimationFrame(() => this.animate());
  }

  static createContainer() {
    const div = document.createElement('div');
    div.setAttribute('class', 'container');
    div.setAttribute('id', 'canvas-container');
    // div.setAttribute('width', window.innerWidth);
    // div.setAttribute('height', window.innerHeight);
    return div;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    // this.renderer.setClearColor(0xd3d3d3);  // it's a light gray
    this.renderer.setClearColor(0x222222);  // it's a dark gray
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.stats.dom);
    this.container.appendChild(this.renderer.domElement);
  }

  setupCamera() {
    const fov = 75;
    const aspect = this.width / this.height;
    const near = 0.1;
    const far = 10000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(this.scene.position);
  }

  setupLights() {
    // directional light
    this.dirLight = new THREE.DirectionalLight(this.params.dirLightColor, 1);
    this.dirLight.position.set(120, 30, -200);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.near = 10;
    this.scene.add(this.dirLight);

    // spotlight
    this.spotLight = new THREE.SpotLight(this.params.spotLightColor);
    this.spotLight.position.set(100, 50, 0);
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(this.params.ambLightColor);
    this.scene.add(this.ambientLight);
  }

  setupCube() {
    const side = 20;
    const geometry = new THREE.CubeGeometry(side, side, side);
    const material = new THREE.MeshLambertMaterial({color: 0xFBBC05});
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, side / 2, 0);
    this.cube = cube;
    this.scene.add(cube);
  }

  setupHelpers() {
    // floor grid helper
    const gridHelper = new THREE.GridHelper(200, 16);
    this.scene.add(gridHelper);

    // XYZ axes helper (XYZ axes are RGB colors, respectively)
    const axisHelper = new THREE.AxisHelper(75);
    this.scene.add(axisHelper);

    // directional light helper + shadow camera helper
    const dirLightHelper = new THREE.DirectionalLightHelper(this.dirLight, 10);
    this.scene.add(dirLightHelper);
    const dirLightCameraHelper = new THREE.CameraHelper(this.dirLight.shadow.camera);
    this.scene.add(dirLightCameraHelper);

    // spot light helper + shadow camera helper
    const spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
    this.scene.add(spotLightHelper);
    const spotLightCameraHelper = new THREE.CameraHelper(this.spotLight.shadow.camera);
    this.scene.add(spotLightCameraHelper);
  }

  setupFloor() {
    const geometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    const texture = new THREE.TextureLoader().load(checkerboard);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: texture
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.position.y = -0.5;
    floor.rotation.x = Math.PI / 2;
    this.scene.add(floor);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = true;
    this.controls.maxDistance = 1500;
    this.controls.minDistance = 0;
    this.controls.autoRotate = true;
  }

  setupParamsControl() {
    let f = this.gui.addFolder("General");
    f.add(this.params, 'rotate');
    f.add(this.controls, 'autoRotate');
    f.close();

    f = this.gui.addFolder('Lighting');
    f.add(this.dirLight.position, 'x').name('Directional X').min(-200).max(200);
    f.add(this.dirLight.position, 'y').name('Directional Y').min(-200).max(200);
    f.add(this.dirLight.position, 'z').name('Directional Z').min(-200).max(200);

    let dirLightColorCtrl = f.addColor(this.params, 'dirLightColor').name('Directional Color').listen();
    dirLightColorCtrl.onChange(function () {
      this.dirLight.color.set(this.params.dirLightColor);
      this.dirLightColor.set(this.dirLight.color.r, this.dirLight.color.g, this.dirLight.color.b, 1.0);
    });

    f.add(this.spotLight.position, 'x').name('Spot X').min(-200).max(200);
    f.add(this.spotLight.position, 'y').name('Spot Y').min(-200).max(200);
    f.add(this.spotLight.position, 'z').name('Spot Z').min(-200).max(200);
    let spotLightColorCtrl = f.addColor(this.params, 'spotLightColor').name('Spot Color').listen();
    spotLightColorCtrl.onChange(function () {
      this.spotLight.color.set(this.params.spotLightColor);
    });

    let ambLightColorCtrl = f.addColor(this.params, 'ambLightColor').name('Ambient Color').listen();
    ambLightColorCtrl.onChange(function () {
      this.ambientLight.color.set(this.params.ambLightColor);
    });
    f.close();

    f = this.gui.addFolder('Camera');
    f.add(this.camera.position, 'x').name('Camera X').min(0).max(100);
    f.add(this.camera.position, 'y').name('Camera Y').min(0).max(100);
    f.add(this.camera.position, 'z').name('Camera Z').min(0).max(100);
    f.open();
  }

  setupCustomObject() {
    // create an object that uses custom shaders
    this.delta = 0;
    const customUniforms = {
      delta: {value: 0}
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: meshVertShader,
      fragmentShader: meshFragShader,
      uniforms: customUniforms,
    });

    const geometry = new THREE.SphereBufferGeometry(5, 64, 64);

    this.vertexDisplacement = new Float32Array(geometry.attributes.position.count);
    for (let i = 0; i < this.vertexDisplacement.length; i += 1) {
      this.vertexDisplacement[i] = Math.sin(i) * Math.random() * .75 + Math.cos(i) * Math.random() * .25;
    }

    geometry.addAttribute('vertexDisplacement', new THREE.BufferAttribute(this.vertexDisplacement, 1));

    this.customMesh = new THREE.Mesh(geometry, material);
    this.customMesh.position.set(5, 5, 5);
    this.scene.add(this.customMesh);
  }

  setupParticleSystem() {
    const geometry = new THREE.Geometry();

    const count = 500;
    for (let i = 0; i < count; i += 1) {
      const particle = new THREE.Vector3();
      particle.x = THREE.Math.randFloatSpread(55);
      particle.y = THREE.Math.randFloatSpread(55);
      particle.z = THREE.Math.randFloatSpread(55);
      geometry.vertices.push(particle);
    }

    const texture = new THREE.TextureLoader().load(star);
    const material = new THREE.PointsMaterial({
      size: 5,
      map: texture,
      transparent: true,
      // alphaTest's default is 0 and the particles overlap. Any value > 0 prevents the particles from overlapping.
      alphaTest: 0.5,
    });

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.position.set(-50, 50, -50);
    this.particleSystem = particleSystem;
    this.scene.add(this.particleSystem);
  }

  setupGroupObject() {
    const group = new THREE.Group();
    const side = 5;
    // const geometry = new THREE.BoxGeometry(side, side, side);
    const geometry = new THREE.TorusBufferGeometry(5.7, 1.9, 10, 30);

    for (let i = 0; i < GROUP_SIZE; i += 1) {
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random())
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = THREE.Math.randFloatSpread(50);
      mesh.position.y = THREE.Math.randFloatSpread(50);
      mesh.position.z = THREE.Math.randFloatSpread(50);
      mesh.rotation.x = Math.random() * 360 * (Math.PI / 180);
      mesh.rotation.y = Math.random() * 360 * (Math.PI / 180);
      mesh.rotation.z = Math.random() * 360 * (Math.PI / 180);
      group.add(mesh);
    }
    group.position.set(50, 20, 50);
    this.group = group;
    this.scene.add(this.group);
  }

  setupSkyBox() {
    // Spacesky Shader
    const N = 6;
    const two_n = Math.pow(2, N);
    let loader = new THREE.CubeTextureLoader();

    const textureCube = loader.load([
      skybox_px, skybox_nx,
      skybox_py, skybox_ny,
      skybox_pz, skybox_nz
    ]);
    const spaceskyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5000, two_n, two_n),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        envMap: textureCube,
        side: THREE.BackSide,
        transparent: true
      })
    );
    this.scene.add(spaceskyMesh);
  }

  update() {
    // update an object that uses custom shaders
    this.delta += 0.1;
    this.cube.rotation.y += 0.01;

    this.particleSystem.rotation.y += 0.01;
    this.particleSystem.rotation.z -= 0.01;

    this.group.rotation.y -= 0.01;
    for (let i = 0; i < GROUP_SIZE; i += 1) {
      if (i % 2 === 0) {
        this.group.children[i].rotation.x += 0.02;
      }
      if (i % 3 === 0) {
        this.group.children[i].rotation.y += 0.03;
      }
      if (i % 4 === 0) {
        this.group.children[i].rotation.z += 0.04;
      }
    }

    this.customMesh.material.uniforms.delta.value = 0.5 + (Math.sin(this.delta) * 0.5);
    for (let i = 0; i < this.vertexDisplacement.length; i += 1) {
      this.vertexDisplacement[i] = 0.5 + (Math.sin(i + this.delta) * 0.25);
    }
    // attribute buffers are not refreshed automatically, so we need to set the needsUpdate flag to true
    this.customMesh.geometry.attributes.vertexDisplacement.needsUpdate = true;
  }
}

// wrap everything inside a function scope and invoke it (IIFE, a.k.a. SEAF)
(() => {
  const app = new Application({
    container: document.getElementById('canvas-container'),
  });
  console.log(app);
})();
