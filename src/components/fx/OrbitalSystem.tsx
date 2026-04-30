"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Float, Text3D } from "@react-three/drei";
import * as THREE from "three";

function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1.5, 32, 32]} position={[0, 0, 0]}>
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

function Planet({ distance, speed, size, color, emissive, label }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (orbitRef.current) {
      const time = state.clock.elapsedTime;
      orbitRef.current.rotation.y = time * speed;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={orbitRef}>
      <group position={[distance, 0, 0]}>
        <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
          <Sphere ref={meshRef} args={[size, 24, 24]}>
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
            />
          </Sphere>
        </Float>
        
        {/* Orbit ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[distance - 0.1, distance + 0.1, 64]} />
          <meshBasicMaterial
            color="rgba(255, 255, 255, 0.05)"
            side={THREE.DoubleSide}
            transparent
          />
        </mesh>
      </group>
    </group>
  );
}

function AsteroidBelt() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 2000;
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 4;
      const height = (Math.random() - 0.5) * 2;
      
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
        size={0.05}
        color="#888888"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export const OrbitalSystem = () => {
  const planets = [
    { distance: 4, speed: 0.5, size: 0.4, color: "#4287f5", emissive: "#1e56c7", label: "Mercury" },
    { distance: 6, speed: 0.3, size: 0.6, color: "#ff6b6b", emissive: "#c44545", label: "Venus" },
    { distance: 8, speed: 0.2, size: 0.7, color: "#4ecdc4", emissive: "#2a8c85", label: "Earth" },
    { distance: 10, speed: 0.15, size: 0.5, color: "#ff9f43", emissive: "#cc7e35", label: "Mars" },
    { distance: 14, speed: 0.1, size: 1.2, color: "#feca57", emissive: "#c99e46", label: "Jupiter" },
    { distance: 18, speed: 0.08, size: 1.0, color: "#ff9ff3", emissive: "#cc7fc2", label: "Saturn" },
    { distance: 22, speed: 0.06, size: 0.8, color: "#54a0ff", emissive: "#4280cc", label: "Uranus" },
    { distance: 26, speed: 0.05, size: 0.8, color: "#5f27cd", emissive: "#4b1fa4", label: "Neptune" },
  ];

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 20, 30], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 20, 50]} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={1} color="#ffd700" />
        
        <Sun />
        <AsteroidBelt />
        
        {planets.map((planet, index) => (
          <Planet key={index} {...planet} />
        ))}
        
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          autoRotate
          autoRotateSpeed={0.3}
          maxDistance={50}
          minDistance={10}
        />
      </Canvas>
    </div>
  );
};