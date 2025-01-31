import './style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
// import gsap from 'gsap'
// Shery.mouseFollower();

function inet(){
    gsap.registerPlugin(ScrollTrigger);
    const locoScroll = new LocomotiveScroll({
      el: document.querySelector("#main"),
      smooth: true
    });
    locoScroll.on("scroll", ScrollTrigger.update);
    
    ScrollTrigger.scrollerProxy("#main", {
      scrollTop(value) {
        return arguments.length ? locoScroll.scrollTo(value, 0, 0) : locoScroll.scroll.instance.scroll.y;
      }, 
        getBoundingClientRect() {
        return {top: 0, left: 0, width: window.innerWidth, height: window.innerHeight};
      },
      pinType: document.querySelector("#main").style.transform ? "transform" : "fixed"
    });
    
    }
    
    inet();

// Texture loading
const textureLoader = new THREE.TextureLoader();
const floorterrain = textureLoader.load('/textures/terrain-normal.jpg');
const floorrough = textureLoader.load('/textures/terrain-roughness.jpg');
// const ao  =  textureLoader.load("/rubber_tiles_4k/textures/rubber_tiles_ao_4k.png")
// const b = textureLoader.load("/rubber_tiles_4k/textures/rubber_tiles_arm_4k.png")
// const color = textureLoader.load("/rubber_tiles_4k/textures/rubber_tiles_diff_4k.png")
// const dis =  textureLoader.load("/rubber_tiles_4k/textures/rubber_tiles_disp_4k.png")
// const nor = textureLoader.load("/rubber_tiles_4k/textures/rubber_tiles_nor_dx_4k.png")
// const f = textureLoader.load("/rubber_tiles_4k/textures/rubber_tiles_nor_gl_4k.png")
// const rough = textureLoader.load('/rubber_tiles_4k/textures/rubber_tiles_rough_4k.png')
const cubetexture = new THREE.CubeTextureLoader();
const env = cubetexture.load([
    '/textures/environmentMaps/1/px.jpg',
    '/textures/environmentMaps/1/nx.jpg',
    '/textures/environmentMaps/1/py.jpg',
    '/textures/environmentMaps/1/ny.jpg',
    '/textures/environmentMaps/1/pz.jpg',
    '/textures/environmentMaps/1/nz.jpg',
]);

// GLTF and DRACO loading
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'wasm', url: '/draco/draco_decoder.wasm' });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Base settings
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.z = 70;
camera.position.y = 15;
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true,});
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
env.encoding = THREE.sRGBEncoding
renderer.shadowMap.enabled = true;
renderer.toneMappingExposure = 2
renderer.setClearColor('black')

const fog = new THREE.Fog('black',50,130)
scene.fog = fog

const gui = new dat.GUI({ width: 400, height: 400, scale: 2 });
const Debugobj = { intensity: 1 };
gui.add(Debugobj, 'intensity').max(10).min(1).step(1).name('intensityEnvMap').onChange(updateMaterial);
gui.add(renderer, 'toneMapping', {
    No: THREE.NoToneMapping,
    Linaer: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    cineon: THREE.CineonToneMapping,
    ACESFilmicg: THREE.ACESFilmicToneMapping,
});

// Lighting
const directionlight = new THREE.DirectionalLight('#ffffff',15  )
directionlight.position.set(-5.763,40,-2.25)
scene.add(directionlight)

directionlight.castShadow = true;
directionlight.shadow.mapSize.width = 2048; // Adjust as necessary
directionlight.shadow.mapSize.height = 2048;

directionlight.shadow.camera.left = -50;
directionlight.shadow.camera.right = 50;
directionlight.shadow.camera.top = 50;
directionlight.shadow.camera.bottom = -50;
directionlight.shadow.camera.near = 0.5;
directionlight.shadow.camera.far = 500;
const DirectionalLightHelper = new THREE.DirectionalLightHelper(directionlight,0.2)
// scene.add(DirectionalLightHelper)
gui.add(directionlight,'intensity').min(0).max(25).step(0.001).name('lightIntensity')
gui.add(directionlight.position,'x').min(-50).max(50).step(0.001).name('lightX')
gui.add(directionlight.position,'y').min(-50).max(50).step(0.001).name('lightY')
gui.add(directionlight.position,'z').min(-50).max(50).step(0.001).name('lightZ')
const ambientLight = new THREE.AmbientLight('#b9d5ff', 0.12)
gui.add(ambientLight, 'intensity').min(0).max(10).step(0.001)
scene.add(ambientLight)


// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ 
        color: '#111',
        // map:color,
        // transparent:true,   
        // aoMap:ao,
        // displacementMap:dis,
        // displacementScale:0.1,
        // normalMap:nor,
        // roughnessMap:rough
        // aoMap:grassambientOcclusiontexture,
        normalMap:floorterrain,
        roughnessMap:floorrough,
        roughness: 0.8, // Lower value makes it shinier
        metalness: 1, // Higher value gives a metallic look
     })
)
floor.geometry.setAttribute(
  'uv2',
  new THREE.Float32BufferAttribute(floor.geometry.attributes.uv.array,2)
)
floorrough.repeat.set(2,2)
floorterrain.repeat.set(5,5)
floor.receiveShadow = true; 

floorterrain.wrapS = THREE.RepeatWrapping
floorrough.wrapT = THREE.RepeatWrapping

floor.rotation.x = - Math.PI * 0.5
floor.position.y = -12.5
scene.add(floor)





// Load model
let carPaintMesh = null;
let  carTyreMesh = null;
gltfLoader.load('/models/scene.glb', (gltf) => {
    // console.log(gltf.scene);
    gltf.scene.scale.set(25, 25, 25);
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.y = Math.PI / 2;
    scene.add(gltf.scene);
   
    gui.add(gltf.scene.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.001).name('Rotation');
    gui.add(gltf.scene.position, 'x').min(0).max(100).step(0.001).name('Rotation');
    gui.add(gltf.scene.position, 'y').min(0).max(100).step(0.001).name('Rotation');
    gui.add(gltf.scene.position, 'z').min(0).max(100).step(0.001).name('Rotation');
    gui.add(gltf.scene.scale, 'x').min(0).max(100).step(0.001).name('Rotation');
    gui.add(gltf.scene.scale, 'y').min(0).max(100).step(0.001).name('Rotation');
    gui.add(gltf.scene.scale, 'z').min(0).max(100).step(0.001).name('Rotation');
   
    updateMaterial();
});

// Update material
function updateMaterial() {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.envMap = env;
            child.material.envMapIntensity = Debugobj.intensity;
            child.castShadow = true;
            child.receiveShadow = true;
        }
        if (child.isMesh && child.material.name === 'EXT_Carpaint.004') {
            carPaintMesh = child;
            carPaintMesh.material.color.set('white');
        }
        if (child.isMesh && child.material.name === 'EXT_Tyre.004') {
          carTyreMesh = child; // Store the reference to the tyre mesh
    
      }
       
        
       
    }); 
}



function changeCarPaintColor(color) {
    if (carPaintMesh) {
        carPaintMesh.material.color.set(color);
    }
}

const clock = new THREE.Clock();
// Animate
function animate() {


  const elapsedTime = clock.getElapsedTime();
  const radius = 65; // Radius of the circular path
  const speed = 0.1; // Speed of the camera revolution
  const angle = elapsedTime * speed; // Calculate the angle based on elapsed time

  camera.position.x = radius * Math.cos(angle);
  camera.position.z = radius * Math.sin(angle);
  camera.lookAt(0, 0, 0);

   // Look at the center where the car is
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Resize handling
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Color change buttons
document.querySelectorAll('button[data-color]').forEach(button => {
    button.addEventListener('click', () => {
        changeCarPaintColor(button.getAttribute('data-color'));
    });
});

const leftBox1 = document.getElementById('infoone');
const leftBox2 = document.getElementById('infothree');
const rightBox1 = document.getElementById('infotwo');
const rightBox2 = document.getElementById('infofour');
const leftButton1 = document.getElementById('select1');
const leftButton2 = document.getElementById('select2');
const rightButton1 = document.getElementById('select3');
const rightButton2 = document.getElementById('select4');

let left1Toggled = false;
let left2Toggled = false;
let right1Toggled = false;
let right2Toggled = false;

function closeAllDivs() {
  gsap.to(leftBox1, { transform: 'translateX(-100%)', duration: 1,ease: "power1.out", });
  gsap.to(leftBox2, { transform: 'translateX(-100%)', duration: 1,ease: "power1.out", });
  gsap.to(rightBox1, { transform: 'translateX(100%)', duration: 1,ease: "power1.out", });
  gsap.to(rightBox2, { transform: 'translateX(100%)', duration: 1,ease: "power1.out", });

  left1Toggled = false;
  left2Toggled = false;
  right1Toggled = false;
  right2Toggled = false;
}

leftButton1.addEventListener('click', () => {
  closeAllDivs();
  left1Toggled = !left1Toggled;
  gsap.to(leftBox1, { transform: left1Toggled ? 'translateX(0%)' : 'translateX(-100%)', duration: 1,ease: "power1.out", });
  if (left1Toggled) {
    setTimeout(() => {
      gsap.to(leftBox1, { transform: 'translateX(-100%)', duration: 1,ease: "power1.out", });
      left1Toggled = false;
    }, 10000);
  }
});

leftButton2.addEventListener('click', () => {
  closeAllDivs();
  left2Toggled = !left2Toggled;
  gsap.to(leftBox2, { transform: left2Toggled ? 'translateX(0%)' : 'translateX(-100%)', duration: 1,ease: "power1.out", });
  if (left2Toggled) {
    setTimeout(() => {
      gsap.to(leftBox2, { transform: 'translateX(-100%)', duration: 1,ease: "power1.out", });
      left2Toggled = false;
    }, 10000);
  }
});

rightButton1.addEventListener('click', () => {
  closeAllDivs();
  right1Toggled = !right1Toggled;
  gsap.to(rightBox1, { transform: right1Toggled ? 'translateX(0%)' : 'translateX(100%)', duration: 1,ease: "power1.out", });
  if (right1Toggled) {
    setTimeout(() => {
      gsap.to(rightBox1, { transform: 'translateX(100%)', duration: 1,ease: "power1.out", });
      right1Toggled = false;
    }, 10000);
  }
});

rightButton2.addEventListener('click', () => {
  closeAllDivs();
  right2Toggled = !right2Toggled;
  gsap.to(rightBox2, { transform: right2Toggled ? 'translateX(0%)' : 'translateX(100%)', duration: 1,ease: "power1.out", });
  if (right2Toggled) {
    setTimeout(() => {
      gsap.to(rightBox2, { transform: 'translateX(100%)', duration: 1,ease: "power1.out", });
      right2Toggled = false;
    }, 10000);
  }
});
