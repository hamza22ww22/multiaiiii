"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";

function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 24, 24]} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#ffd700"
        emissive="#ff6b00"
        emissiveIntensity={0.8}
        roughness={0.1}
      />
      <pointLight intensity={2} color="#ffd700" />
    </Sphere>
  );
}

function Planet({ distance, speed, size, color, emissive }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y = state.clock.elapsedTime * speed;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={orbitRef}>
      <group position={[distance, 0, 0]}>
        <Sphere ref={meshRef} args={[size, 16, 16]}>
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </Sphere>
      </group>
    </group>
  );
}

function AsteroidBelt() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 1000;
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 2;
      const height = (Math.random() - 0.5) * 1;
      
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = height;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#888888"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

export const OrbitalSystem = () => {
  const planets = [
    { distance: 3, speed: 0.5, size: 0.3, color: "#4287f5", emissive: "#1e56c7" },
    { distance: 4.5, speed: 0.3, size: 0.4, color: "#ff6b6b", emissive: "#c44545" },
    { distance: 6, speed: 0.2, size: 0.5, color: "#4ecdc4", emissive: "#2a8c85" },
    { distance: 7.5, speed: 0.15, size: 0.35, color: "#ff9f43", emissive: "#cc7e35" },
    { distance: 10, speed: 0.1, size: 0.9, color: "#feca57", emissive: "#c99e46" },
  ];

  return (
    <div className="absolute inset-0 z-0 opacity-50">
      <Canvas
        camera={{ position: [0, 15, 25], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#000000"]} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={1} color="#ffd700" />
        
        <Sun />
        <AsteroidBelt />
        
        {planets.map((planet, index) => (
          <Planet key={index} {...planet} />
        ))}
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
};