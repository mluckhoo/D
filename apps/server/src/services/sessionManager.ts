import { WebSocket } from 'ws';

interface Session {
  id: string;
  ws: WebSocket;
  createdAt: number;
  /** Sequence number for AVATAR_FRAME packets */
  frameSequence: number;
  /** Conversation history for the LLM */
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Manages active conversation sessions.
 * Each WebSocket connection gets one session.
 */
export class SessionManager {
  private sessions = new Map<string, Session>();

  create(ws: WebSocket): Session {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session: Session = {
      id,
      ws,
      createdAt: Date.now(),
      frameSequence: 0,
      conversationHistory: [
        {
          role: 'assistant',
          content:
            'Hello! I\'m Drea. How can I help you today?',
        },
      ],
    };
    this.sessions.set(id, session);
    console.log(`Session created: ${id}`);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  destroy(id: string): void {
    this.sessions.delete(id);
    console.log(`Session destroyed: ${id}`);
  }

  getNextSequence(session: Session): number {
    return session.frameSequence++;
  }

  addMessage(
    session: Session,
    role: 'user' | 'assistant',
    content: string
  ): void {
    session.conversationHistory.push({ role, content });
    // Keep last 20 messages to manage context window
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }
  }
}
