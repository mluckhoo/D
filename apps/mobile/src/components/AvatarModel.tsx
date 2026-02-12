import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '../utils/r3f';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARKIT_BLENDSHAPE_NAMES, BlendshapeName } from '../utils/blendshapeMap';
import { buildArkitIndexMap, detectNamingConvention } from '../utils/metahumanMap';

interface AvatarModelProps {
  /** URI to a GLB avatar model (MetaHuman export, Avaturn, or any ARKit-rigged head) */
  uri: string;
  /** Run a demo animation cycling through blendshapes */
  demoAnimation?: boolean;
  /** External blendshape values to apply each frame */
  blendshapeValues?: Record<BlendshapeName, number>;
}

/**
 * Loads a GLB avatar and drives its ARKit morph targets.
 *
 * Supports multiple avatar sources and blendshape naming conventions:
 *
 * - **Unreal MetaHuman** — exported via UE5.6+ DCC Export or Blender conversion.
 *   MetaHuman uses FACS-based names (e.g. CTRL_expressions_browDownL) which are
 *   auto-mapped to ARKit names at load time.
 *
 * - **Avaturn / other ARKit-rigged GLBs** — use standard ARKit names directly.
 *
 * The component:
 * 1. Loads the GLB using Three.js GLTFLoader
 * 2. Finds all SkinnedMesh nodes with morphTargetDictionary
 * 3. Auto-detects the blendshape naming convention (ARKit vs MetaHuman FACS)
 * 4. Builds an ARKit-name → morph-target-index lookup per mesh
 * 5. On each frame, applies blendshape weights via morphTargetInfluences
 */
export function AvatarModel({
  uri,
  demoAnimation = false,
  blendshapeValues,
}: AvatarModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<MeshWithMapping[]>([]);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  // Auto-computed Y offset to centre the head at camera level
  const [yOffset, setYOffset] = useState(-0.15);

  // Load the GLB model
  useEffect(() => {
    const loader = new GLTFLoader();

    loader.load(
      uri,
      (gltf) => {
        const loadedScene = gltf.scene;

        // Collect all skinned meshes with morph targets and build index maps
        const meshes: MeshWithMapping[] = [];
        loadedScene.traverse((child) => {
          if (
            child instanceof THREE.SkinnedMesh &&
            child.morphTargetDictionary &&
            child.morphTargetInfluences
          ) {
            child.updateMorphTargets();

            const indexMap = buildArkitIndexMap(child.morphTargetDictionary);
            const convention = detectNamingConvention(
              Object.keys(child.morphTargetDictionary)
            );

            meshes.push({ mesh: child, indexMap });

            const mapped = Object.values(indexMap).filter(
              (v) => v !== undefined
            ).length;
            console.log(
              `[Avatar] mesh "${child.name}": ${
                Object.keys(child.morphTargetDictionary).length
              } morph targets (convention: ${convention}, ${mapped}/52 ARKit mapped)`
            );
          }
        });

        // Auto-frame: compute bounding box and offset so head is at camera level.
        // Full-body avatars (e.g. Ready Player Me, ~1.8m tall) need the model
        // shifted down so the face is centred on camera. Head-only models stay
        // near origin.
        const box = new THREE.Box3().setFromObject(loadedScene);
        const height = box.max.y - box.min.y;
        const computedOffset = height > 0.5
          ? -(box.max.y - 0.12)   // Full-body: shift so face sits at camera y
          : -0.15;                 // Head-only: small offset to centre
        setYOffset(computedOffset);

        meshesRef.current = meshes;
        setScene(loadedScene);

        console.log(
          `[Avatar] GLB loaded: ${meshes.length} mesh(es), height=${height.toFixed(2)}m, yOffset=${computedOffset.toFixed(2)}`
        );
      },
      undefined,
      (error) => {
        console.error('[Avatar] Failed to load GLB:', error);
      }
    );
  }, [uri]);

  // Per-frame blendshape animation
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

      for (const { mesh, indexMap } of meshes) {
        const influences = mesh.morphTargetInfluences!;
        applyMapped(indexMap, influences, 'jawOpen', jawOpen);
        applyMapped(indexMap, influences, 'mouthSmileLeft', smile);
        applyMapped(indexMap, influences, 'mouthSmileRight', smile);
        applyMapped(indexMap, influences, 'eyeBlinkLeft', blink);
        applyMapped(indexMap, influences, 'eyeBlinkRight', blink);
        applyMapped(indexMap, influences, 'browInnerUp', browUp);
      }
    } else if (blendshapeValues) {
      // Apply external blendshape values (from Audio2Face-3D via server)
      for (const { mesh, indexMap } of meshes) {
        const influences = mesh.morphTargetInfluences!;

        for (const name of ARKIT_BLENDSHAPE_NAMES) {
          const value = blendshapeValues[name] ?? 0;
          const idx = indexMap[name];
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
    <group ref={groupRef} position={[0, yOffset, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  );
}

/** A mesh paired with its ARKit-name → morph-index lookup */
interface MeshWithMapping {
  mesh: THREE.SkinnedMesh;
  indexMap: Record<BlendshapeName, number | undefined>;
}

/** Apply a blendshape value using the pre-built ARKit index map */
function applyMapped(
  indexMap: Record<BlendshapeName, number | undefined>,
  influences: number[],
  name: BlendshapeName,
  value: number
) {
  const idx = indexMap[name];
  if (idx !== undefined) {
    influences[idx] = value;
  }
}
