import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

// Simple 2D noise function
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv * 5.0; // scale of the ripples
  
  // Create moving ripples
  float n1 = snoise(uv + uTime * 0.2);
  float n2 = snoise(uv * 2.0 - uTime * 0.3);
  float n3 = snoise(uv * 4.0 + uTime * 0.1);
  
  float caustics = max(0.0, sin((n1 + n2 + n3) * 3.1415));
  caustics = pow(caustics, 2.5); // Sharpen the highlights
  
  // Base color is black, ripples are uColor
  vec3 finalColor = uColor * caustics * 0.15; // 15% opacity 
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

function ShaderMesh({ speedLevel }: { speedLevel: number }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00C16E') }
    }), []);

    // Use a local ref to track accumulated time based on speed
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        if (materialRef.current) {
            timeRef.current += delta * speedLevel;
            materialRef.current.uniforms.uTime.value = timeRef.current;
        }
    });

    return (
        <mesh>
            <planeGeometry args={[100, 100]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                depthWrite={false}
            />
        </mesh>
    );
}

export default function BackgroundShader({ speedLevel = 1 }: { speedLevel?: number }) {
    return (
        <div className="fixed inset-0 z-0 bg-black pointer-events-none">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <ShaderMesh speedLevel={speedLevel} />
            </Canvas>
        </div>
    );
}
