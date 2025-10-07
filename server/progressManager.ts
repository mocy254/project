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
  private progressStates = new Map<string, ProgressUpdate>();
  private results = new Map<string, GenerationResult | null>();

  setProgress(update: ProgressUpdate) {
    this.progressStates.set(update.sessionId, update);
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      this.progressStates.delete(update.sessionId);
    }, 5 * 60 * 1000);
  }

  getProgress(sessionId: string): ProgressUpdate | null {
    return this.progressStates.get(sessionId) || null;
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

  clearSession(sessionId: string) {
    this.progressStates.delete(sessionId);
    this.results.delete(sessionId);
  }
}

export const progressManager = new ProgressManager();
