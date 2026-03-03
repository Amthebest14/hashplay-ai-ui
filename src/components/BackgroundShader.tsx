import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

// Extend Three Fiber to recognize the Water class
extend({ Water });
// Global uniform reference trick for rain drops logic
const raindrops: { x: number, y: number, time: number }[] = [];

function WaterSurface({ speedLevel }: { speedLevel: number }) {
    const waterRef = useRef<any>(null);

    const waterMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color('#00C16E') },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uDrops: { value: [] }, // Array of drop data: vec3(x, y, timeSinceDrop)
                uDropsCount: { value: 0 },
                tReflectionMap: { value: null } // Mirror refraction Map
            },
            vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        uniform float uTime;
        uniform vec3 uDrops[10]; 
        uniform int uDropsCount;

        // Simple noise
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Base procedural waves
          float waveHeight = sin(pos.x * 10.0 + uTime * 2.0) * cos(pos.y * 10.0 + uTime * 1.5) * 0.05;
          
          // Raindrop displacement logic
          for(int i = 0; i < 10; i++) {
              if (i >= uDropsCount) break;
              
              vec3 drop = uDrops[i];
              float dist = distance(uv, drop.xy);
              float maxRadius = drop.z * 2.0; // expand over time
              
              if (dist < maxRadius) {
                 // Ripple formula: decaying sine wave based on distance and time
                 float ripplePhase = (dist * 40.0) - (drop.z * 15.0);
                 float amplitude = max(0.0, 1.0 - (dist / 0.5)) * max(0.0, 1.0 - drop.z); // fade out over 1s distance 0.5
                 waveHeight += sin(ripplePhase) * amplitude * 0.1;
              }
          }

          pos.z += waveHeight;
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
            fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
           // Deep black liquid base
           vec3 baseColor = vec3(0.0, 0.0, 0.0);
           
           // Highlight calculated from normals/height in real app, keeping simple caustics here
           float highlight = smoothstep(0.0, 0.1, vWorldPosition.z);
           vec3 finalColor = mix(baseColor, uColor * 0.8, highlight);

           gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
            transparent: true,
            side: THREE.DoubleSide
        });
    }, []);

    // Update uniforms and automate rain
    useFrame((_, delta) => {
        if (waterRef.current) {
            // Time
            waterMaterial.uniforms.uTime.value += delta * speedLevel;

            // Process raindrops
            const activeDrops = [];
            for (let i = 0; i < raindrops.length; i++) {
                raindrops[i].time += delta;
                // Keep drops alive for 2 seconds
                if (raindrops[i].time < 2.0) {
                    activeDrops.push(raindrops[i]);
                }
            }

            // Update original array with living drops
            raindrops.length = 0;
            raindrops.push(...activeDrops);

            // Format for shader uniform vec3(x, y, time)
            const shaderDrops = activeDrops.map(d => new THREE.Vector3(d.x, d.y, d.time));
            waterMaterial.uniforms.uDrops.value = shaderDrops;
            waterMaterial.uniforms.uDropsCount.value = shaderDrops.length;
        }
    });

    return (
        <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[10, 10, 256, 256]} />
            <primitive object={waterMaterial} attach="material" />
        </mesh>
    );
}

export default function BackgroundShader({ speedLevel = 1 }: { speedLevel?: number }) {

    // Random Raindrop Generator
    useEffect(() => {
        const interval = setInterval(() => {
            if (raindrops.length < 10) {
                raindrops.push({
                    x: Math.random(), // 0 to 1 UV space
                    y: Math.random(),
                    time: 0
                });
            }
        }, 400); // New drop every 400ms

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-black pointer-events-none">
            <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[0, 10, 5]} intensity={1} />

                {/* Tilt the camera slightly down at the water */}
                <group rotation={[Math.PI / 8, 0, 0]}>
                    <WaterSurface speedLevel={speedLevel} />
                </group>
            </Canvas>
        </div>
    );
}
