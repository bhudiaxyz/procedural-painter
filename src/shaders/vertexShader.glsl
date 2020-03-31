precision highp float;

attribute float vertexDisplacement;
uniform float delta;
varying float vOpacity;
varying vec3 vUv;

#pragma glslify: pnoise = require(glsl-noise/periodic/3d)

const float PI = 3.14159265358979323846264;
const vec3 noiseVec3 = vec3(PI);

void main() {
    vUv = position;
    vOpacity = vertexDisplacement;

    vec3 p = position;

    float displacement = pnoise(p + noiseVec3, noiseVec3) * 1.5;

    p.x += sin(vertexDisplacement) * 50.0 + displacement * 10.0;
    p.y += cos(vertexDisplacement) * 50.0 + displacement * 10.0;

    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}
