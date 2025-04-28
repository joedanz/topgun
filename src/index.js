import ThreeEnvironment from './three/ThreeEnvironment';

const appDiv = document.getElementById('app');
const threeEnv = new ThreeEnvironment(appDiv);

function animate() {
  requestAnimationFrame(animate);
  threeEnv.render();
}
animate();

console.log('Top Gun Game: Entry point loaded!');

if (module.hot) {
  module.hot.accept();
  console.log('HMR enabled');
}

