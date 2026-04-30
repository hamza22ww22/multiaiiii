import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Knot() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.15;
    ref.current.rotation.y = t * 0.2;
    const m = state.mouse;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, m.x * 0.5, 0.05);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, m.y * 0.3, 0.05);
  });
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[1, 0.32, 220, 32]} />
      <meshStandardMaterial
        color="#ffffff"
        wireframe
        transparent
        opacity={0.35}
        emissive="#ffffff"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 800;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.03;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.1) * 0.1;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export const Hero3D = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <Knot />
        <Particles />
      </Canvas>
    </div>
  );
};
