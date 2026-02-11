import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { config } from '../config';

/**
 * Audio2Face-3D NIM gRPC client.
 *
 * Connects to NVIDIA's Audio2Face-3D microservice (either cloud NIM
 * at grpc.nvcf.nvidia.com or self-hosted) and streams audio to receive
 * 52 ARKit blendshape animations at 30fps.
 *
 * Protocol: Bidirectional streaming RPC (ProcessAudioStream)
 * - Client sends: AudioStreamHeader (once), then AudioBufferWithId (streaming)
 * - Server sends: AnimationData with SkelAnimation (blendshape weights)
 *
 * Reference: https://github.com/NVIDIA/Audio2Face-3D-Samples
 */

const BLENDSHAPE_COUNT = 52;

export interface BlendshapeFrame {
  /** Seconds since audio start */
  timestamp: number;
  /** 52 ARKit blendshape weights */
  weights: Float32Array;
  /** Emotion probabilities (optional) */
  emotion?: Record<string, number>;
}

export class Audio2FaceClient {
  private client: any;
  private metadata: grpc.Metadata;

  constructor() {
    this.metadata = new grpc.Metadata();

    if (config.nvidia.apiKey) {
      this.metadata.set('authorization', `Bearer ${config.nvidia.apiKey}`);
    }
    if (config.nvidia.a2f.functionId) {
      this.metadata.set('function-id', config.nvidia.a2f.functionId);
    }
  }

  /**
   * Initialize the gRPC client by loading proto definitions.
   * Call this once at startup.
   */
  async initialize(): Promise<void> {
    // Proto files should be cloned from NVIDIA/Audio2Face-3D-Samples
    const protoDir = path.join(__dirname, '../../proto');
    const protoFile = path.join(protoDir, 'nvidia_ace.a2f.v1.proto');

    try {
      const packageDefinition = await protoLoader.load(protoFile, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [protoDir],
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const a2fService = (protoDescriptor as any).nvidia?.ace?.a2f?.v1
        ?.A2FService;

      if (!a2fService) {
        console.warn(
          'Audio2Face-3D proto not found. Place proto files in apps/server/proto/. ' +
            'Clone from: https://github.com/NVIDIA/Audio2Face-3D-Samples'
        );
        return;
      }

      const credentials = grpc.credentials.createSsl();
      this.client = new a2fService(config.nvidia.a2f.endpoint, credentials);

      console.log(`Audio2Face-3D client initialized: ${config.nvidia.a2f.endpoint}`);
    } catch (err) {
      console.warn('Audio2Face-3D initialization skipped (proto files not found):', err);
    }
  }

  /**
   * Process an audio buffer and return blendshape frames.
   *
   * For the MVP, this accepts a complete audio buffer.
   * For production, use processAudioStream() for real-time streaming.
   */
  async processAudio(
    audioBuffer: Buffer,
    sampleRate: number = 16000
  ): Promise<BlendshapeFrame[]> {
    if (!this.client) {
      // Fallback: generate simple amplitude-based blendshapes
      return this.generateFallbackBlendshapes(audioBuffer, sampleRate);
    }

    return new Promise((resolve, reject) => {
      const frames: BlendshapeFrame[] = [];
      const stream = this.client.ProcessAudioStream(this.metadata);

      // Send header
      stream.write({
        audioStreamHeader: {
          audioHeader: {
            samplesPerSecond: sampleRate,
            bitsPerSample: 16,
            channelCount: 1,
          },
          faceParams: {
            floatParams: {
              // Default face parameters
              skinStrength: 1.0,
              upperFaceStrength: 1.0,
              lowerFaceStrength: 1.0,
              upperFaceSmoothing: 0.001,
              lowerFaceSmoothing: 0.001,
            },
          },
          emotionParams: {
            enableAutoEmotion: true,
          },
          blendshapeParams: {
            bsWeightSmoothing: 0.001,
          },
        },
      });

      // Send audio data
      const chunkSize = sampleRate * 2; // 1 second chunks (16-bit = 2 bytes/sample)
      for (let offset = 0; offset < audioBuffer.length; offset += chunkSize) {
        const chunk = audioBuffer.subarray(
          offset,
          Math.min(offset + chunkSize, audioBuffer.length)
        );
        stream.write({
          audioBufferWithId: {
            audioBuffer: chunk,
          },
        });
      }
      stream.end();

      // Receive blendshape frames
      stream.on('data', (response: any) => {
        if (response.animationData?.skelAnimation) {
          const skelAnim = response.animationData.skelAnimation;
          const weights = new Float32Array(BLENDSHAPE_COUNT);

          if (skelAnim.blendShapeWeights) {
            for (let i = 0; i < BLENDSHAPE_COUNT && i < skelAnim.blendShapeWeights.length; i++) {
              weights[i] = skelAnim.blendShapeWeights[i];
            }
          }

          frames.push({
            timestamp: skelAnim.timeCode ?? frames.length / 30,
            weights,
            emotion: response.animationData.emotion ?? undefined,
          });
        }
      });

      stream.on('end', () => resolve(frames));
      stream.on('error', (err: Error) => {
        console.error('Audio2Face-3D stream error:', err);
        // Fall back to amplitude-based blendshapes
        resolve(this.generateFallbackBlendshapes(audioBuffer, sampleRate));
      });
    });
  }

  /**
   * Fallback blendshape generation when Audio2Face-3D is unavailable.
   * Maps audio amplitude to jawOpen for basic lip movement.
   */
  private generateFallbackBlendshapes(
    audioBuffer: Buffer,
    sampleRate: number
  ): BlendshapeFrame[] {
    const frames: BlendshapeFrame[] = [];
    const samplesPerFrame = Math.floor(sampleRate / 30); // 30fps
    const bytesPerFrame = samplesPerFrame * 2; // 16-bit audio

    for (let offset = 0; offset < audioBuffer.length; offset += bytesPerFrame) {
      const weights = new Float32Array(BLENDSHAPE_COUNT);

      // Calculate RMS amplitude for this frame
      let sumSquares = 0;
      const endOffset = Math.min(offset + bytesPerFrame, audioBuffer.length);
      let sampleCount = 0;
      for (let i = offset; i < endOffset - 1; i += 2) {
        const sample = audioBuffer.readInt16LE(i) / 32768;
        sumSquares += sample * sample;
        sampleCount++;
      }
      const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;

      // Map amplitude to blendshapes
      const jawOpenIdx = 24; // jawOpen in ARKit ordering
      const mouthSmileLeftIdx = 43; // mouthSmileLeft
      const mouthSmileRightIdx = 44; // mouthSmileRight

      weights[jawOpenIdx] = Math.min(1, rms * 4); // Amplify for visibility
      weights[mouthSmileLeftIdx] = Math.min(0.3, rms * 0.8);
      weights[mouthSmileRightIdx] = Math.min(0.3, rms * 0.8);

      frames.push({
        timestamp: frames.length / 30,
        weights,
      });
    }

    return frames;
  }
}
