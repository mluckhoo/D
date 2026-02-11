import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config';
import { SessionManager } from './services/sessionManager';
import { Audio2FaceClient } from './services/audio2face';
import { ConversationPipeline } from './pipeline/conversationPipeline';
import { createWebSocketHandler } from './websocket/handler';

async function main() {
  const app = Fastify({ logger: true });

  // Register WebSocket plugin
  await app.register(websocket);

  // Initialize services
  const sessionManager = new SessionManager();
  const audio2face = new Audio2FaceClient();
  await audio2face.initialize();

  const pipeline = new ConversationPipeline(audio2face, sessionManager);
  const wsHandler = createWebSocketHandler(sessionManager, pipeline);

  // WebSocket endpoint for voice chat
  app.get('/ws/chat', { websocket: true }, (socket) => {
    wsHandler(socket);
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // API info endpoint
  app.get('/', async () => {
    return {
      name: 'Drea Avatar Backend',
      version: '1.0.0',
      endpoints: {
        websocket: '/ws/chat',
        health: '/health',
      },
      services: {
        audio2face: config.nvidia.apiKey ? 'configured' : 'not configured (using fallback)',
        openai: config.openai.apiKey ? 'configured' : 'not configured',
        elevenlabs: config.elevenlabs.apiKey ? 'configured' : 'not configured',
        personaplex: config.personaplex.url ? 'configured' : 'not configured (Phase 4)',
      },
    };
  });

  // Start server
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(`\nDrea Avatar Backend running on http://${config.server.host}:${config.server.port}`);
    console.log(`WebSocket endpoint: ws://${config.server.host}:${config.server.port}/ws/chat`);
    console.log('\nService status:');
    console.log(`  Audio2Face-3D: ${config.nvidia.apiKey ? 'Connected' : 'Fallback mode (amplitude-based)'}`);
    console.log(`  OpenAI (STT+LLM): ${config.openai.apiKey ? 'Connected' : 'Not configured'}`);
    console.log(`  ElevenLabs (TTS): ${config.elevenlabs.apiKey ? 'Connected' : 'Not configured'}`);
    console.log(`  PersonaPlex: ${config.personaplex.url ? 'Connected' : 'Phase 4 (not configured)'}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
