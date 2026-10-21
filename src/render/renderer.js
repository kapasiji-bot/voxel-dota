// render/renderer.js — WebGL renderer, scene, camera, lights, 2D overlay canvas.
// ================= renderer / scene =================
const canvas = $('gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
const scene = new T.Scene();
scene.background = new T.Color('#8cc0ec');
scene.fog = new T.Fog('#8cc0ec', 150, 320);
const camera = new T.PerspectiveCamera(42, innerWidth / innerHeight, 1, 600);
scene.add(new T.HemisphereLight('#ffffff', '#4a5a3a', 0.62));
const sun = new T.DirectionalLight('#fff1d6', 0.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
sun.shadow.bias = -0.0006;
scene.add(sun); scene.add(sun.target);
const ovc = $('ov'), ov = ovc.getContext('2d');
function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  ovc.width = innerWidth; ovc.height = innerHeight;
}
addEventListener('resize', onResize); onResize();

// shared geometry / temp objects
const boxG = new T.BoxGeometry(1, 1, 1);
const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color();
