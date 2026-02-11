import 'dotenv/config';

export const config = {
  server: {
    port: parseInt(process.env.PORT ?? '8080', 10),
    host: process.env.HOST ?? '0.0.0.0',
  },

  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY ?? '',
    a2f: {
      endpoint: process.env.A2F_ENDPOINT ?? 'grpc.nvcf.nvidia.com:443',
      functionId: process.env.A2F_FUNCTION_ID ?? '',
    },
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? '',
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL', // default: Bella
  },

  personaplex: {
    url: process.env.PERSONAPLEX_URL ?? '',
    voice: process.env.PERSONAPLEX_VOICE ?? 'NATF2',
  },
} as const;
