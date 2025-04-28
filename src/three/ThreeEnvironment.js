import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default class ThreeEnvironment {
  constructor(container) {
    this.container = container;
    this.loadingManager = new THREE.LoadingManager();
    // Asset cache to prevent duplicate loads
    this.assetCache = new Map();

    // Loading progress tracking (console-based, can be hooked to UI)
    this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
      console.log(`[LoadingManager] Started loading: ${url} (${itemsLoaded}/${itemsTotal})`);
      // TODO: Hook to UI progress bar
    };
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      console.log(`[LoadingManager] Loading: ${url} (${itemsLoaded}/${itemsTotal})`);
      // TODO: Hook to UI progress bar
    };
    this.loadingManager.onLoad = () => {
      console.log('[LoadingManager] All assets loaded.');
      // TODO: Hide UI progress bar
    };
    this.loadingManager.onError = (url) => {
      console.error(`[LoadingManager] Error loading: ${url}`);
      // TODO: Show error in UI
    };


    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    // Skybox (simple color background for now)
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // neutral color, moderate intensity
    this.scene.add(this.ambientLight);

    // Directional Light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 10, 7);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(this.directionalLight);

    // Hemisphere Light
    this.hemisphereLight = new THREE.HemisphereLight(0xaaaaee, 0x444422, 0.6);
    this.scene.add(this.hemisphereLight);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // OrbitControls for user camera interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Animation loop state
    this._animationId = null;
    this.animate = this.animate.bind(this);
    this.startAnimation = this.startAnimation.bind(this);
    this.stopAnimation = this.stopAnimation.bind(this);

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // Start the render loop automatically
    this.startAnimation();
  
    // Optionally: expose a method to adjust lighting
    this.adjustLighting = this.adjustLighting.bind(this);

    // Load a real skybox using CubeTextureLoader (example images from Three.js)
    const loader = new THREE.CubeTextureLoader();
    // Use local MilkyWay skybox images with exact names
    const baseUrl = '/skybox/';
    const fileNames = [
      'dark-s_px.jpg', // +X
      'dark-s_nx.jpg', // -X
      'dark-s_py.jpg', // +Y
      'dark-s_ny.jpg', // -Y
      'dark-s_pz.jpg', // +Z
      'dark-s_nz.jpg', // -Z
    ];
    const urls = fileNames.map(name => baseUrl + name);
    console.log('Loading local skybox:', urls);
    loader.load(
      urls,
      (texture) => {
        this.scene.background = texture;
        // Optionally: set environment for reflections
        // this.scene.environment = texture;
      },
      undefined,
      (err) => {
        console.error('Skybox loading error:', err);
        // Fallback to sky blue if skybox fails
        this.scene.background = new THREE.Color(0x87ceeb);
      }
    );
  }


  handleResize() {
    let width = this.container.clientWidth;
    let height = this.container.clientHeight;
    // Fallback if container is not sized
    if (width === 0 || height === 0) {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    // Single-frame render (manual)
    this.renderer.render(this.scene, this.camera);
    // console.log('Rendering frame', this.camera.position);
  }

  animate() {
    // Animation loop for smooth rendering and control updates
    this._animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.render();
  }

  startAnimation() {
    if (!this._animationId) {
      this.animate();
    }
  }

  stopAnimation() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  adjustLighting({ ambientIntensity, directionalIntensity, hemisphereIntensity, timeOfDay } = {}) {
    if (ambientIntensity !== undefined) this.ambientLight.intensity = ambientIntensity;
    if (directionalIntensity !== undefined) this.directionalLight.intensity = directionalIntensity;
    if (hemisphereIntensity !== undefined) this.hemisphereLight.intensity = hemisphereIntensity;
    // Optionally, adjust colors or positions based on timeOfDay or other parameters
  }


  dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.stopAnimation();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
