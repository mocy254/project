import { useEffect, useState } from "react";
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
  const [, setLocation] = useLocation();

  useEffect(() => {
    setProgress(null);
    setIsComplete(false);
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let intervalId: NodeJS.Timeout;
    let isActive = true;

    const pollProgress = async () => {
      try {
        const res = await fetch(`/api/generation/progress/${sessionId}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            return;
          }
          throw new Error("Failed to fetch progress");
        }

        const update: ProgressUpdate = await res.json();
        
        if (!isActive) return;
        
        setProgress(update);

        if (update.stage === "complete") {
          clearInterval(intervalId);
          setIsComplete(true);
          
          const resultRes = await fetch(`/api/generation/result/${sessionId}`);
          if (!resultRes.ok) {
            const errorData = await resultRes.json().catch(() => ({ error: "Failed to retrieve result" }));
            throw new Error(errorData.error || "Failed to retrieve result");
          }
          
          const result = await resultRes.json();
          
          setTimeout(() => {
            onComplete?.();
            if (result.deckId) {
              setLocation(`/editor/${result.deckId}`);
            }
          }, 1500);
        } else if (update.stage === "error") {
          clearInterval(intervalId);
          setError(update.error || "Generation failed");
          onError?.(update.error || "Generation failed");
        }
      } catch (err: any) {
        console.error("Error polling progress:", err);
        if (isActive && err.message !== "Failed to fetch progress") {
          clearInterval(intervalId);
          setError(err.message || "Connection error");
          onError?.(err.message || "Connection error");
        }
      }
    };

    pollProgress();
    intervalId = setInterval(pollProgress, 1000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [sessionId, onComplete, onError, setLocation]);

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
        if (!open && error && onDismiss) {
          onDismiss();
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => {
          if (!error) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
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
