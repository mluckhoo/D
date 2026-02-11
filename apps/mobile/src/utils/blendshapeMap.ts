/**
 * ARKit blendshape name ↔ index mapping for Ready Player Me avatars.
 *
 * Ready Player Me GLB models expose morph targets via mesh.morphTargetDictionary,
 * which maps names to indices. This module provides the canonical 52 ARKit names
 * for use when driving animation from Audio2Face-3D blendshape output.
 */

export const ARKIT_BLENDSHAPE_NAMES = [
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
  'tongueOut',
] as const;

export type BlendshapeName = (typeof ARKIT_BLENDSHAPE_NAMES)[number];

/** Create a zeroed blendshape frame */
export function createEmptyFrame(): Record<BlendshapeName, number> {
  const frame: Record<string, number> = {};
  for (const name of ARKIT_BLENDSHAPE_NAMES) {
    frame[name] = 0;
  }
  return frame as Record<BlendshapeName, number>;
}
