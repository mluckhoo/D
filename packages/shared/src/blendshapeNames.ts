/**
 * The 52 ARKit blendshape names used by MetaHuman avatars
 * and NVIDIA Audio2Face-3D output.
 *
 * Index order matches the Audio2Face-3D SkelAnimation output.
 * MetaHuman models may use FACS-based naming; the mobile client's
 * metahumanMap.ts handles the translation to these canonical names.
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

export type ARKitBlendshapeName = (typeof ARKIT_BLENDSHAPE_NAMES)[number];

/** Map from blendshape name to index */
export const BLENDSHAPE_INDEX: Record<ARKitBlendshapeName, number> =
  Object.fromEntries(
    ARKIT_BLENDSHAPE_NAMES.map((name, i) => [name, i])
  ) as Record<ARKitBlendshapeName, number>;

/** A single frame of 52 blendshape weights (0.0 – 1.0) */
export type BlendshapeFrame = Record<ARKitBlendshapeName, number>;
