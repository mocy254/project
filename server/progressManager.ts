import type { WebSocket } from "ws";

export interface ProgressUpdate {
  sessionId: string;
  stage: "extracting" | "analyzing" | "chunking" | "generating" | "saving" | "complete" | "error";
  message: string;
  progress: number; // 0-100
  currentStep?: number;
  totalSteps?: number;
  cardsGenerated?: number;
  error?: string;
}

export interface GenerationResult {
  deckId: string;
  flashcardCount: number;
}

class ProgressManager {
  private connections = new Map<string, WebSocket>();
  private results = new Map<string, GenerationResult | null>();

  registerConnection(sessionId: string, ws: WebSocket) {
    this.connections.set(sessionId, ws);
    
    ws.on("close", () => {
      this.connections.delete(sessionId);
    });
  }

  sendProgress(update: ProgressUpdate) {
    const ws = this.connections.get(update.sessionId);
    if (ws && ws.readyState === 1) { // 1 = OPEN
      try {
        ws.send(JSON.stringify(update));
      } catch (error) {
        console.error(`Error sending progress for session ${update.sessionId}:`, error);
      }
    }
  }

  hasConnection(sessionId: string): boolean {
    const ws = this.connections.get(sessionId);
    return ws !== undefined && ws.readyState === 1;
  }

  closeConnection(sessionId: string) {
    const ws = this.connections.get(sessionId);
    if (ws) {
      ws.close();
      this.connections.delete(sessionId);
    }
  }

  setResult(sessionId: string, result: GenerationResult | null) {
    this.results.set(sessionId, result);
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      this.results.delete(sessionId);
    }, 5 * 60 * 1000);
  }

  getResult(sessionId: string): GenerationResult | null | undefined {
    return this.results.get(sessionId);
  }
}

export const progressManager = new ProgressManager();
