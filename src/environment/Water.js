// Water.js - Simple animated water plane with reflections and refractions
import * as THREE from 'three';

export default class Water {
  constructor({
    width = 12000,
    height = 12000,
    segments = 128,
    color = 0x4dc3ff,
    opacity = 0.85,
    elevation = 0
  } = {}) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    // Water shader (simple: animated normal map, fresnel, color, foam)
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `;
    const fragmentShader = `
      uniform float time;
      uniform vec3 color;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        // Animated waves (simple sine)
        float wave = 0.04 * sin(20.0 * vUv.x + time * 1.2) +
                     0.03 * sin(15.0 * vUv.y + time * 1.7) +
                     0.02 * sin(40.0 * vUv.x + time * 2.3);
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldPosition), vec3(0,1,0))), 2.0);
        vec3 base = mix(color, vec3(1.0), fresnel * 0.35);
        float foam = smoothstep(0.93, 1.0, abs(wave));
        vec3 foamColor = mix(base, vec3(1.0), foam * 0.6);
        gl_FragColor = vec4(foamColor, opacity * (1.0 - foam * 0.3));
      }
    `;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
        reflection: { value: null },
        reflectionStrength: { value: 0.6 }
      },
      vertexShader,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        uniform sampler2D reflection;
        uniform float reflectionStrength;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          float wave = 0.04 * sin(20.0 * vUv.x + time * 1.2) +
                       0.03 * sin(15.0 * vUv.y + time * 1.7) +
                       0.02 * sin(40.0 * vUv.x + time * 2.3);
          float fresnel = pow(1.0 - abs(dot(normalize(vWorldPosition), vec3(0,1,0))), 2.0);
          vec3 base = mix(color, vec3(1.0), fresnel * 0.35);
          float foam = smoothstep(0.93, 1.0, abs(wave));
          vec3 foamColor = mix(base, vec3(1.0), foam * 0.6);

          // Reflection sample
          vec2 reflectUv = vUv;
          reflectUv.y = 1.0 - reflectUv.y; // Flip vertically
          vec3 reflectColor = texture2D(reflection, reflectUv).rgb;
          vec3 finalColor = mix(foamColor, reflectColor, reflectionStrength * fresnel);
          gl_FragColor = vec4(finalColor, opacity * (1.0 - foam * 0.3));
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = elevation;
    this.mesh.frustumCulled = false;
    this.material = material;
  }

  update(time) {
    this.material.uniforms.time.value = time;
  }

  setReflectionTexture(texture) {
    this.material.uniforms.reflection.value = texture;
  }

  getMesh() {
    return this.mesh;
  }
}
