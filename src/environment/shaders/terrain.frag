// Fragment shader for terrain
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D diffuseMap;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform vec3 baseColor;

void main() {
  // Sample texture
  vec4 texColor = texture2D(diffuseMap, vUv);
  // Simple Lambertian diffuse lighting
  float diff = max(dot(normalize(vNormal), normalize(lightDir)), 0.2);
  vec3 color = baseColor * texColor.rgb * diff * lightColor;
  gl_FragColor = vec4(color, 1.0);
}
