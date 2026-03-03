import { useRef, useMemo, useEffect, useState } from 'react';
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
uniform vec2 uMouse;
uniform vec2 uHoverPos;
uniform float uHoverIntensity;

varying vec2 vUv;

// Simplex 2D noise
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
  // Base UV with aspect ratio correction
  vec2 uv = vUv * 5.0; 
  
  // Distortion from mouse position (inertia effect)
  vec2 distortion = uMouse * 0.5;
  
  // Create heavy organic liquid movement
  float n1 = snoise(uv + distortion + uTime * 0.15);
  float n2 = snoise(uv * 1.5 - distortion + uTime * 0.2);
  float n3 = snoise(uv * 3.0 + uTime * 0.1);
  
  // Refractive caustic lines
  float caustics = max(0.0, sin((n1 + n2 + n3) * 3.1415));
  caustics = pow(caustics, 3.0); // Sharpen into 'liquid metal' reflections
  
  // Calculate distance to hover points for localized intensity increase
  float distToHover = distance(vUv, uHoverPos);
  float hoverInfluence = smoothstep(0.4, 0.0, distToHover) * uHoverIntensity;
  
  // Add hover glow
  caustics += hoverInfluence * 0.5;

  // Base is #000000, highlights are Hedera Green
  vec3 baseColor = vec3(0.0);
  vec3 liquidChrome = uColor * caustics * 0.25; // 25% opacity for deeper look
  
  gl_FragColor = vec4(baseColor + liquidChrome + (hoverInfluence * uColor * 0.1), 1.0);
}
`;

function ShaderMesh({ speedLevel, mouseInertia, hoverState }: { speedLevel: number, mouseInertia: { x: number, y: number }, hoverState: { active: boolean, x: number, y: number } }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00C16E') },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uHoverPos: { value: new THREE.Vector2(0.5, 0.5) },
        uHoverIntensity: { value: 0 }
    }), []);

    const timeRef = useRef(0);
    const smoothedMouse = useRef({ x: 0, y: 0 });
    const smoothedIntensity = useRef(0);

    useFrame((_, delta) => {
        if (materialRef.current) {
            // Time accumulation
            timeRef.current += delta * speedLevel;
            materialRef.current.uniforms.uTime.value = timeRef.current;

            // Mouse inertia smoothing (lerp)
            smoothedMouse.current.x += (mouseInertia.x - smoothedMouse.current.x) * delta * 2.0;
            smoothedMouse.current.y += (mouseInertia.y - smoothedMouse.current.y) * delta * 2.0;
            materialRef.current.uniforms.uMouse.value.set(smoothedMouse.current.x, smoothedMouse.current.y);

            // Hover intensity smoothing
            const targetIntensity = hoverState.active ? 1.0 : 0.0;
            smoothedIntensity.current += (targetIntensity - smoothedIntensity.current) * delta * 5.0;
            materialRef.current.uniforms.uHoverIntensity.value = smoothedIntensity.current;

            // Set hover position
            if (hoverState.active) {
                materialRef.current.uniforms.uHoverPos.value.set(hoverState.x, hoverState.y);
            }
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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hoverState, setHoverState] = useState({ active: false, x: 0.5, y: 0.5 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position from -1 to 1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            setMousePos({ x, y });

            // Check if hovering over arena cards (very basic hit detection)
            const target = e.target as HTMLElement;
            const card = target.closest('.arena-card');
            if (card) {
                const rect = card.getBoundingClientRect();
                // Normalized UV position of the card center
                const hoverX = (rect.left + rect.width / 2) / window.innerWidth;
                const hoverY = 1.0 - ((rect.top + rect.height / 2) / window.innerHeight);
                setHoverState({ active: true, x: hoverX, y: hoverY });
            } else {
                setHoverState(prev => ({ ...prev, active: false }));
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-black pointer-events-none">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <ShaderMesh speedLevel={speedLevel} mouseInertia={mousePos} hoverState={hoverState} />
            </Canvas>
        </div>
    );
}


