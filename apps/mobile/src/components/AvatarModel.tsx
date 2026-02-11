import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARKIT_BLENDSHAPE_NAMES, BlendshapeName } from '../utils/blendshapeMap';

interface AvatarModelProps {
  /** URI to the GLB avatar model (Ready Player Me export) */
  uri: string;
  /** Run a demo animation cycling through blendshapes */
  demoAnimation?: boolean;
  /** External blendshape values to apply each frame */
  blendshapeValues?: Record<BlendshapeName, number>;
}

/**
 * Loads a Ready Player Me GLB avatar and drives its morph targets.
 *
 * The model must be exported with ?morphTargets=ARKit to include
 * all 52 ARKit blendshapes. This component:
 *
 * 1. Loads the GLB using Three.js GLTFLoader
 * 2. Finds all SkinnedMesh nodes with morphTargetDictionary
 * 3. On each frame, applies blendshape weights to morphTargetInfluences
 *
 * Supports both external blendshape control (from useBlendshapes hook)
 * and a built-in demo animation for testing.
 */
export function AvatarModel({
  uri,
  demoAnimation = false,
  blendshapeValues,
}: AvatarModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<THREE.SkinnedMesh[]>([]);
  const [scene, setScene] = useState<THREE.Group | null>(null);

  // Load the GLB model
  useEffect(() => {
    const loader = new GLTFLoader();

    loader.load(
      uri,
      (gltf) => {
        const loadedScene = gltf.scene;

        // Collect all skinned meshes with morph targets
        const meshes: THREE.SkinnedMesh[] = [];
        loadedScene.traverse((child) => {
          if (
            child instanceof THREE.SkinnedMesh &&
            child.morphTargetDictionary &&
            child.morphTargetInfluences
          ) {
            // Ensure morph targets are initialized
            child.updateMorphTargets();
            meshes.push(child);
          }
        });

        meshesRef.current = meshes;
        setScene(loadedScene);

        console.log(
          `Avatar loaded: ${meshes.length} mesh(es) with morph targets`,
          meshes.map((m) => ({
            name: m.name,
            targets: Object.keys(m.morphTargetDictionary ?? {}).length,
          }))
        );
      },
      undefined,
      (error) => {
        console.error('Failed to load avatar GLB:', error);
      }
    );
  }, [uri]);

  // Demo animation: cycle through jawOpen and smile
  useFrame(({ clock }) => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;

    if (demoAnimation) {
      const t = clock.getElapsedTime();

      // Jaw open — sinusoidal for a breathing/talking effect
      const jawOpen = Math.max(0, Math.sin(t * 3) * 0.4);
      // Smile — slower cycle
      const smile = Math.max(0, Math.sin(t * 0.8) * 0.5 + 0.2);
      // Eye blink — periodic
      const blink = t % 4 < 0.15 ? 1 : 0;
      // Brow raise — gentle
      const browUp = Math.max(0, Math.sin(t * 0.5) * 0.3);

      for (const mesh of meshes) {
        const dict = mesh.morphTargetDictionary!;
        const influences = mesh.morphTargetInfluences!;

        applyBlendshape(dict, influences, 'jawOpen', jawOpen);
        applyBlendshape(dict, influences, 'mouthSmileLeft', smile);
        applyBlendshape(dict, influences, 'mouthSmileRight', smile);
        applyBlendshape(dict, influences, 'eyeBlinkLeft', blink);
        applyBlendshape(dict, influences, 'eyeBlinkRight', blink);
        applyBlendshape(dict, influences, 'browInnerUp', browUp);
      }
    } else if (blendshapeValues) {
      // Apply external blendshape values (from Audio2Face-3D via server)
      for (const mesh of meshes) {
        const dict = mesh.morphTargetDictionary!;
        const influences = mesh.morphTargetInfluences!;

        for (const name of ARKIT_BLENDSHAPE_NAMES) {
          const value = blendshapeValues[name] ?? 0;
          const idx = dict[name];
          if (idx !== undefined) {
            // Smooth interpolation (exponential moving average)
            influences[idx] += (value - influences[idx]) * 0.5;
          }
        }
      }
    }
  });

  if (!scene) return null;

  return (
    <group ref={groupRef} position={[0, -0.15, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  );
}

/** Apply a single blendshape value to a mesh */
function applyBlendshape(
  dict: Record<string, number>,
  influences: number[],
  name: string,
  value: number
) {
  const idx = dict[name];
  if (idx !== undefined) {
    influences[idx] = value;
  }
}
