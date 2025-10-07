import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useLocation } from "wouter";

interface ProgressUpdate {
  stage: string;
  message: string;
  progress: number;
  currentStep?: number;
  totalSteps?: number;
  cardsGenerated?: number;
  error?: string;
}

interface Props {
  sessionId: string | null;
  onComplete?: (deckId?: string) => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
}

export default function GenerationProgressDialog({ sessionId, onComplete, onError, onDismiss }: Props) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [, setLocation] = useLocation();

  // Reset state when sessionId changes
  useEffect(() => {
    setProgress(null);
    setIsComplete(false);
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/progress?sessionId=${sessionId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const update: ProgressUpdate = JSON.parse(event.data);
        setProgress(update);

        if (update.stage === "complete") {
          setIsComplete(true);
          // Fetch the generation result
          fetch(`/api/generation/result/${sessionId}`)
            .then(async res => {
              if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Failed to retrieve result" }));
                throw new Error(errorData.error || "Failed to retrieve result");
              }
              return res.json();
            })
            .then(result => {
              setTimeout(() => {
                onComplete?.(); // Call onComplete to show toast and clear sessionId
                if (result.deckId) {
                  setLocation(`/editor/${result.deckId}`);
                }
                ws.close();
              }, 1500);
            })
            .catch(error => {
              console.error("Error fetching result:", error);
              setError(error.message || "Failed to retrieve generation result");
              onError?.(error.message || "Failed to retrieve generation result");
              setTimeout(() => ws.close(), 2000);
            });
        } else if (update.stage === "error") {
          setError(update.error || "Generation failed");
          onError?.(update.error || "Generation failed");
          setTimeout(() => ws.close(), 2000);
        }
      } catch (error) {
        console.error("Error parsing progress update:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection error");
      onError?.("Connection error");
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, onComplete, onError]);

  const getStageIcon = () => {
    if (error) return <XCircle className="w-6 h-6 text-destructive" />;
    if (isComplete) return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    return <Loader2 className="w-6 h-6 animate-spin text-primary" />;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      extracting: "Extracting Content",
      analyzing: "Analyzing Structure",
      chunking: "Organizing Content",
      generating: "Generating Flashcards",
      saving: "Saving",
      complete: "Complete",
      error: "Error"
    };
    return labels[stage] || stage;
  };

  return (
    <Dialog 
      open={!!sessionId} 
      onOpenChange={(open) => {
        // Only allow closing when there's an error
        if (!open && error && onDismiss) {
          onDismiss();
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => {
          // Only allow closing when there's an error
          if (!error) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Only allow closing when there's an error
          if (!error) e.preventDefault();
        }}
        data-testid="dialog-generation-progress"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStageIcon()}
            {error ? "Generation Failed" : isComplete ? "Success!" : "Generating Flashcards"}
          </DialogTitle>
          <DialogDescription>
            {error 
              ? error 
              : isComplete 
              ? "Your flashcards are ready!" 
              : "Please wait while we process your content..."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {progress && !error && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {getStageLabel(progress.stage)}
                  </span>
                  <span className="font-medium">{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} className="h-2" data-testid="progress-bar" />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-foreground" data-testid="text-progress-message">
                  {progress.message}
                </p>
                {progress.totalSteps && progress.currentStep && (
                  <p className="text-xs text-muted-foreground">
                    Processing section {progress.currentStep} of {progress.totalSteps}
                  </p>
                )}
                {progress.cardsGenerated !== undefined && progress.cardsGenerated > 0 && (
                  <p className="text-xs text-muted-foreground" data-testid="text-cards-generated">
                    {progress.cardsGenerated} flashcards generated so far
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
