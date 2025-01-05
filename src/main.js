import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

// Canvas setup
const canvas = document.querySelector('#canvas');
let width = window.innerWidth;
let height = window.innerHeight;

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.z = 3.5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: canvas,
  alpha: true
});

renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2; // Increased exposure
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// PMREM Generator setup
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Add blue rim light
const blueRimLight = new THREE.PointLight(0x0066ff, 10);
blueRimLight.position.set(-5, 0, -5);
scene.add(blueRimLight);

// Post-processing setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0030; // Increased RGB shift
composer.addPass(rgbShiftPass);

// Environment setup
const rgbeLoader = new RGBELoader();
rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/pond_bridge_night_1k.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  
  texture.dispose();
  pmremGenerator.dispose();
});

// Model loading
const loader = new GLTFLoader();
let model;

loader.load(
  '/DamagedHelmet.gltf', // Remove 'public' from path since it's in the public directory
  (gltf) => {
    model = gltf.scene;
    // Enhance material properties
    model.traverse((child) => {
      if (child.isMesh) {
        child.material.roughness = 0.7; // Adjust roughness
        child.material.metalness = 0.8; // Enhance metallic effect
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(model);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('An error happened:', error);
  }
);

// Handle mouse movement
window.addEventListener('mousemove', (event) => {
  if (model) {
    const rotationX = (event.clientY / window.innerHeight * 0.5) * (Math.PI * 0.18);
    const rotationY = (event.clientX / window.innerWidth * 0.5) * (Math.PI * 0.18);
    
    model.rotation.x = rotationX;
    model.rotation.y = rotationY;
    
    // Move blue rim light based on mouse position
    blueRimLight.position.x = -5 + (event.clientX / width) * 10;
    blueRimLight.position.y = -5 + (event.clientY / height) * 10;
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  
  // Update renderer and composer
  renderer.setSize(width, height);
  composer.setSize(width, height);
  
  // Update camera
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  composer.render();
}
animate();