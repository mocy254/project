import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

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
    if (isComplete) {
      return (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </motion.div>
      );
    }
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

  // Sparkle confetti animation positions
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 400 - 200,
    y: Math.random() * 300 - 150,
    delay: Math.random() * 0.3,
  }));

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
        className="sm:max-w-md bg-gradient-to-br from-card to-card/80 border-primary/20 overflow-hidden" 
        onPointerDownOutside={(e) => {
          if (!error) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!error) e.preventDefault();
        }}
        data-testid="dialog-generation-progress"
      >
        {/* Success Sparkles Animation */}
        <AnimatePresence>
          {isComplete && (
            <>
              {sparkles.map((sparkle) => (
                <motion.div
                  key={sparkle.id}
                  className="absolute"
                  initial={{ 
                    opacity: 0,
                    scale: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1, 1.2, 0],
                    x: sparkle.x,
                    y: sparkle.y,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: sparkle.delay,
                    ease: "easeOut"
                  }}
                  style={{
                    left: '50%',
                    top: '30%',
                  }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
              ))}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 1.5 }}
              />
            </>
          )}
        </AnimatePresence>

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-2">
            {getStageIcon()}
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              key={error ? "error" : isComplete ? "complete" : "generating"}
            >
              {error ? "Generation Failed" : isComplete ? "Success!" : "Generating Flashcards"}
            </motion.span>
          </DialogTitle>
          <DialogDescription>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {error 
                ? error 
                : isComplete 
                ? "Your flashcards are ready!" 
                : "Please wait while we process your content..."}
            </motion.span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 relative z-10">
          {progress && !error && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {getStageLabel(progress.stage)}
                  </span>
                  <motion.span 
                    className="font-medium"
                    key={progress.progress}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {progress.progress}%
                  </motion.span>
                </div>
                <Progress value={progress.progress} className="h-2" data-testid="progress-bar" />
              </div>
              
              <div className="space-y-1">
                <motion.p 
                  className="text-sm text-foreground" 
                  data-testid="text-progress-message"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={progress.message}
                >
                  {progress.message}
                </motion.p>
                {progress.totalSteps && progress.currentStep && (
                  <p className="text-xs text-muted-foreground">
                    Processing section {progress.currentStep} of {progress.totalSteps}
                  </p>
                )}
                {progress.cardsGenerated !== undefined && progress.cardsGenerated > 0 && (
                  <motion.p 
                    className="text-xs text-primary font-medium" 
                    data-testid="text-cards-generated"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    key={progress.cardsGenerated}
                  >
                    🎉 {progress.cardsGenerated} flashcards generated!
                  </motion.p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
