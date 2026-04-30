"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, Float } from "@react-three/drei";

const ParticleCount = 5000;

function Particles() {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  // Generate particle positions with more interesting distribution
  const positions = useMemo(() => {
    const arr = new Float32Array(ParticleCount * 3);
    for (let i = 0; i < ParticleCount; i++) {
      // Create a torus-like distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 4;
      
      arr[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = radius * Math.cos(theta);
    }
    return arr;
  }, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(ParticleCount * 3);
    for (let i = 0; i < ParticleCount; i++) {
      // Gradient from white to cyan
      arr[i * 3] = 0.8 + Math.random() * 0.2;     // R
      arr[i * 3 + 1] = 0.9 + Math.random() * 0.1; // G
      arr[i * 3 + 2] = 1.0;                       // B
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      
      // Pulsing scale
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
    
    if (materialRef.current) {
      // Animate opacity
      materialRef.current.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={ParticleCount}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={ParticleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function FloatingShapes() {
  const shapes = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (shapes.current) {
      shapes.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={shapes}>
      {/* Torus Knot */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[3, 2, 0]}>
          <torusKnotGeometry args={[1, 0.3, 128, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#00ffff"
            emissiveIntensity={0.3}
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
      </Float>

      {/* Icosahedron */}
      <Float speed={1.5} rotationIntensity={2} floatIntensity={1.5}>
        <mesh position={[-3, -1, 2]}>
          <icosahedronGeometry args={[1.2]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ff00ff"
            emissiveIntensity={0.2}
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.5}
          />
        </mesh>
      </Float>

      {/* Octahedron */}
      <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
        <mesh position={[0, -3, -2]}>
          <octahedronGeometry args={[1.5]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffff00"
            emissiveIntensity={0.2}
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      </Float>
    </group>
  );
}

export const ParticleField = () => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 10, 25]} />
        
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
        
        <Particles />
        <FloatingShapes />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.2}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};