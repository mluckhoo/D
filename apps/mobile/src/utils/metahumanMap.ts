/**
 * MetaHuman → ARKit blendshape name mapping.
 *
 * Unreal Engine MetaHuman exports use FACS-based morph target names
 * (e.g. "CTRL_expressions_browDownL") which differ from the 52 ARKit
 * blendshape names used by Audio2Face-3D and Apple's ARKit.
 *
 * This module provides:
 * 1. A mapping table from common MetaHuman export naming conventions
 *    to the canonical ARKit names.
 * 2. An auto-detect function that inspects a mesh's morphTargetDictionary
 *    and returns the appropriate name resolver.
 *
 * Supported MetaHuman export formats:
 * - UE5.6+ "DCC Export" with CTRL_expressions_ prefix
 * - Blender-converted FBX with shortened FACS names (brow_down_L)
 * - ARKit-native naming (already compatible — no mapping needed)
 */

import { BlendshapeName, ARKIT_BLENDSHAPE_NAMES } from './blendshapeMap';

/**
 * Mapping from MetaHuman CTRL_expressions_ names to ARKit names.
 * Covers the UE5 standard MetaHuman FBX export naming convention.
 */
const METAHUMAN_CTRL_TO_ARKIT: Record<string, BlendshapeName> = {
  // Brow
  CTRL_expressions_browDownL: 'browDownLeft',
  CTRL_expressions_browDownR: 'browDownRight',
  CTRL_expressions_browInnerUp: 'browInnerUp',
  CTRL_expressions_browOuterUpL: 'browOuterUpLeft',
  CTRL_expressions_browOuterUpR: 'browOuterUpRight',
  // Cheek
  CTRL_expressions_cheekPuff: 'cheekPuff',
  CTRL_expressions_cheekSquintL: 'cheekSquintLeft',
  CTRL_expressions_cheekSquintR: 'cheekSquintRight',
  // Eye
  CTRL_expressions_eyeBlinkL: 'eyeBlinkLeft',
  CTRL_expressions_eyeBlinkR: 'eyeBlinkRight',
  CTRL_expressions_eyeLookDownL: 'eyeLookDownLeft',
  CTRL_expressions_eyeLookDownR: 'eyeLookDownRight',
  CTRL_expressions_eyeLookInL: 'eyeLookInLeft',
  CTRL_expressions_eyeLookInR: 'eyeLookInRight',
  CTRL_expressions_eyeLookOutL: 'eyeLookOutLeft',
  CTRL_expressions_eyeLookOutR: 'eyeLookOutRight',
  CTRL_expressions_eyeLookUpL: 'eyeLookUpLeft',
  CTRL_expressions_eyeLookUpR: 'eyeLookUpRight',
  CTRL_expressions_eyeSquintL: 'eyeSquintLeft',
  CTRL_expressions_eyeSquintR: 'eyeSquintRight',
  CTRL_expressions_eyeWideL: 'eyeWideLeft',
  CTRL_expressions_eyeWideR: 'eyeWideRight',
  // Jaw
  CTRL_expressions_jawForward: 'jawForward',
  CTRL_expressions_jawLeft: 'jawLeft',
  CTRL_expressions_jawOpen: 'jawOpen',
  CTRL_expressions_jawRight: 'jawRight',
  // Mouth
  CTRL_expressions_mouthClose: 'mouthClose',
  CTRL_expressions_mouthDimpleL: 'mouthDimpleLeft',
  CTRL_expressions_mouthDimpleR: 'mouthDimpleRight',
  CTRL_expressions_mouthFrownL: 'mouthFrownLeft',
  CTRL_expressions_mouthFrownR: 'mouthFrownRight',
  CTRL_expressions_mouthFunnel: 'mouthFunnel',
  CTRL_expressions_mouthLeft: 'mouthLeft',
  CTRL_expressions_mouthLowerDownL: 'mouthLowerDownLeft',
  CTRL_expressions_mouthLowerDownR: 'mouthLowerDownRight',
  CTRL_expressions_mouthPressL: 'mouthPressLeft',
  CTRL_expressions_mouthPressR: 'mouthPressRight',
  CTRL_expressions_mouthPucker: 'mouthPucker',
  CTRL_expressions_mouthRight: 'mouthRight',
  CTRL_expressions_mouthRollLower: 'mouthRollLower',
  CTRL_expressions_mouthRollUpper: 'mouthRollUpper',
  CTRL_expressions_mouthShrugLower: 'mouthShrugLower',
  CTRL_expressions_mouthShrugUpper: 'mouthShrugUpper',
  CTRL_expressions_mouthSmileL: 'mouthSmileLeft',
  CTRL_expressions_mouthSmileR: 'mouthSmileRight',
  CTRL_expressions_mouthStretchL: 'mouthStretchLeft',
  CTRL_expressions_mouthStretchR: 'mouthStretchRight',
  CTRL_expressions_mouthUpperUpL: 'mouthUpperUpLeft',
  CTRL_expressions_mouthUpperUpR: 'mouthUpperUpRight',
  // Nose
  CTRL_expressions_noseSneerL: 'noseSneerLeft',
  CTRL_expressions_noseSneerR: 'noseSneerRight',
  // Tongue
  CTRL_expressions_tongueOut: 'tongueOut',
};

/**
 * Mapping from Blender-converted MetaHuman FACS short names to ARKit names.
 * Some Blender FBX importers strip the CTRL_expressions_ prefix and use
 * underscored names like "brow_down_L".
 */
const METAHUMAN_SHORT_TO_ARKIT: Record<string, BlendshapeName> = {
  brow_down_L: 'browDownLeft',
  brow_down_R: 'browDownRight',
  brow_inner_up: 'browInnerUp',
  brow_outer_up_L: 'browOuterUpLeft',
  brow_outer_up_R: 'browOuterUpRight',
  cheek_puff: 'cheekPuff',
  cheek_squint_L: 'cheekSquintLeft',
  cheek_squint_R: 'cheekSquintRight',
  eye_blink_L: 'eyeBlinkLeft',
  eye_blink_R: 'eyeBlinkRight',
  eye_look_down_L: 'eyeLookDownLeft',
  eye_look_down_R: 'eyeLookDownRight',
  eye_look_in_L: 'eyeLookInLeft',
  eye_look_in_R: 'eyeLookInRight',
  eye_look_out_L: 'eyeLookOutLeft',
  eye_look_out_R: 'eyeLookOutRight',
  eye_look_up_L: 'eyeLookUpLeft',
  eye_look_up_R: 'eyeLookUpRight',
  eye_squint_L: 'eyeSquintLeft',
  eye_squint_R: 'eyeSquintRight',
  eye_wide_L: 'eyeWideLeft',
  eye_wide_R: 'eyeWideRight',
  jaw_forward: 'jawForward',
  jaw_left: 'jawLeft',
  jaw_open: 'jawOpen',
  jaw_right: 'jawRight',
  mouth_close: 'mouthClose',
  mouth_dimple_L: 'mouthDimpleLeft',
  mouth_dimple_R: 'mouthDimpleRight',
  mouth_frown_L: 'mouthFrownLeft',
  mouth_frown_R: 'mouthFrownRight',
  mouth_funnel: 'mouthFunnel',
  mouth_left: 'mouthLeft',
  mouth_lower_down_L: 'mouthLowerDownLeft',
  mouth_lower_down_R: 'mouthLowerDownRight',
  mouth_press_L: 'mouthPressLeft',
  mouth_press_R: 'mouthPressRight',
  mouth_pucker: 'mouthPucker',
  mouth_right: 'mouthRight',
  mouth_roll_lower: 'mouthRollLower',
  mouth_roll_upper: 'mouthRollUpper',
  mouth_shrug_lower: 'mouthShrugLower',
  mouth_shrug_upper: 'mouthShrugUpper',
  mouth_smile_L: 'mouthSmileLeft',
  mouth_smile_R: 'mouthSmileRight',
  mouth_stretch_L: 'mouthStretchLeft',
  mouth_stretch_R: 'mouthStretchRight',
  mouth_upper_up_L: 'mouthUpperUpLeft',
  mouth_upper_up_R: 'mouthUpperUpRight',
  nose_sneer_L: 'noseSneerLeft',
  nose_sneer_R: 'noseSneerRight',
  tongue_out: 'tongueOut',
};

type NamingConvention = 'arkit' | 'metahuman_ctrl' | 'metahuman_short';

/**
 * Detect which blendshape naming convention a mesh uses by inspecting
 * its morphTargetDictionary keys.
 */
export function detectNamingConvention(
  morphTargetNames: string[]
): NamingConvention {
  // Check for CTRL_expressions_ prefix (UE5 MetaHuman export)
  if (morphTargetNames.some((n) => n.startsWith('CTRL_expressions_'))) {
    return 'metahuman_ctrl';
  }
  // Check for underscore-separated FACS names (Blender-converted)
  if (morphTargetNames.some((n) => n.startsWith('brow_down_') || n.startsWith('jaw_open'))) {
    return 'metahuman_short';
  }
  // Default: assume ARKit naming (Ready Player Me, Avaturn, or properly
  // exported MetaHuman with ARKit-compatible names)
  return 'arkit';
}

/**
 * Build a lookup from ARKit blendshape name → morph target index,
 * handling whichever naming convention the mesh uses.
 *
 * Returns a map like { browDownLeft: 3, browDownRight: 4, ... }
 * where the values are indices into mesh.morphTargetInfluences.
 */
export function buildArkitIndexMap(
  morphTargetDictionary: Record<string, number>
): Record<BlendshapeName, number | undefined> {
  const names = Object.keys(morphTargetDictionary);
  const convention = detectNamingConvention(names);

  const result: Record<string, number | undefined> = {};

  for (const arkitName of ARKIT_BLENDSHAPE_NAMES) {
    switch (convention) {
      case 'arkit': {
        // Direct lookup — names match
        result[arkitName] = morphTargetDictionary[arkitName];
        break;
      }
      case 'metahuman_ctrl': {
        // Reverse lookup: find the CTRL key that maps to this ARKit name
        const ctrlKey = Object.entries(METAHUMAN_CTRL_TO_ARKIT).find(
          ([, v]) => v === arkitName
        )?.[0];
        result[arkitName] = ctrlKey
          ? morphTargetDictionary[ctrlKey]
          : undefined;
        break;
      }
      case 'metahuman_short': {
        const shortKey = Object.entries(METAHUMAN_SHORT_TO_ARKIT).find(
          ([, v]) => v === arkitName
        )?.[0];
        result[arkitName] = shortKey
          ? morphTargetDictionary[shortKey]
          : undefined;
        break;
      }
    }
  }

  return result as Record<BlendshapeName, number | undefined>;
}
