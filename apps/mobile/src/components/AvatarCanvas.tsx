import React from 'react';
import { Canvas } from '../utils/r3f';
import { AvatarModel } from './AvatarModel';

interface AvatarCanvasProps {
  /** URI or require() asset for the GLB avatar model (MetaHuman, Avaturn, etc.) */
  modelUri?: string;
  /** Whether blendshape demo animation is running */
  demoAnimation?: boolean;
}

/**
 * R3F Canvas wrapper for the 3D avatar.
 *
 * Sets up camera at bust level with soft studio lighting
 * for a hyper-realistic portrait look. Works with any GLB head model
 * that has ARKit-compatible morph targets (MetaHuman, Avaturn, etc.).
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

/**
 * Stylised placeholder shown when no GLB avatar is loaded.
 *
 * Renders a head-shaped silhouette so the demo still looks intentional
 * while the user sets up their avatar model.
 */
function AvatarPlaceholder() {
  return (
    <group position={[0, -0.02, 0]}>
      {/* Head */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.13, 48, 48]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Neck hint */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.06, 24]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}
