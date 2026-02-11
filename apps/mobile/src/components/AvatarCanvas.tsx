import React from 'react';
import { Canvas } from '@react-three/fiber/native';
import { AvatarModel } from './AvatarModel';

interface AvatarCanvasProps {
  /** URI to the GLB avatar model */
  modelUri?: string;
  /** Whether blendshape demo animation is running */
  demoAnimation?: boolean;
}

/**
 * R3F Canvas wrapper for the 3D avatar.
 *
 * Sets up camera at bust level with soft studio lighting
 * for a realistic portrait look matching the "Drea" aesthetic.
 */
export function AvatarCanvas({
  modelUri,
  demoAnimation = false,
}: AvatarCanvasProps) {
  return (
    <Canvas
      camera={{
        position: [0, 0.05, 0.5],
        fov: 35,
        near: 0.01,
        far: 10,
      }}
      gl={{ antialias: true }}
      style={{ flex: 1 }}
    >
      {/* Ambient fill light */}
      <ambientLight intensity={0.6} />

      {/* Key light — soft directional from upper right */}
      <directionalLight
        position={[2, 3, 4]}
        intensity={0.8}
        color="#ffffff"
      />

      {/* Fill light — softer from left to reduce shadows */}
      <directionalLight
        position={[-2, 1, 2]}
        intensity={0.3}
        color="#e8e0ff"
      />

      {/* Rim light — subtle back light for depth */}
      <directionalLight
        position={[0, 2, -3]}
        intensity={0.2}
        color="#ffe8d0"
      />

      {modelUri ? (
        <AvatarModel uri={modelUri} demoAnimation={demoAnimation} />
      ) : (
        <AvatarPlaceholder />
      )}
    </Canvas>
  );
}

/** Simple placeholder sphere when no model is loaded */
function AvatarPlaceholder() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial color="#4a4a5a" />
    </mesh>
  );
}
