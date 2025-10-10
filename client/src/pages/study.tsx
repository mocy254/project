import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, RotateCw, X, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function Study() {
  const params = useParams();
  const deckId = params.id as string;
  const [, setLocation] = useLocation();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const { data: cards, isLoading } = useQuery({
    queryKey: ['/api/decks', deckId, 'cards', 'all'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/decks/${deckId}/cards/all`);
      return await res.json();
    },
    enabled: !!deckId,
  });

  const { data: deck } = useQuery({
    queryKey: ['/api/decks', deckId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/decks/${deckId}`);
      return await res.json();
    },
    enabled: !!deckId,
  });

  const toggleLearnedMutation = useMutation({
    mutationFn: async ({ cardId, isLearned }: { cardId: string; isLearned: boolean }) => {
      const res = await apiRequest("PUT", `/api/cards/${cardId}/learned`, { isLearned });
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['/api/decks', deckId, 'cards', 'all'] });
    },
  });

  const currentCard = cards?.[currentIndex];
  const learnedCount = cards?.filter((card: any) => card.isLearned).length || 0;
  const progress = cards ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (cards && currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  }, [cards, currentIndex]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const handleExit = useCallback(() => {
    setLocation(`/editor/${deckId}`);
  }, [deckId, setLocation]);

  const handleToggleLearned = useCallback((checked: boolean) => {
    if (currentCard) {
      toggleLearnedMutation.mutate({
        cardId: currentCard.id,
        isLearned: checked,
      });
    }
  }, [currentCard, toggleLearnedMutation]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleFlip, handleNext, handlePrevious, handleExit]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "qa": return "bg-primary/10 text-primary border-primary/20";
      case "cloze": return "bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%)]/20";
      case "reverse": return "bg-[hsl(158,64%,52%)]/10 text-[hsl(158,64%,52%)] border-[hsl(158,64%,52%)]/20";
      default: return "";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "qa": return "Q&A";
      case "cloze": return "Cloze";
      case "reverse": return "Reverse";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No cards found in this deck</p>
          <Button onClick={handleExit} variant="outline">
            Return to Editor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExit}
                data-testid="button-exit-study"
              >
                <X className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-display font-bold">{deck?.title || "Study Mode"}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    {learnedCount} learned
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          <div
            className="relative cursor-pointer perspective-1000"
            onClick={handleFlip}
            data-testid="flashcard"
          >
            <div
              className={`relative w-full transition-transform duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <Card
                className={`w-full min-h-[400px] flex items-center justify-center backface-hidden ${
                  isFlipped ? 'invisible' : 'visible'
                }`}
                style={{
                  backfaceVisibility: 'hidden',
                }}
              >
                <CardContent className="p-8 sm:p-12 text-center w-full overflow-auto">
                  <div className="mb-6">
                    <Badge variant="outline" className={`text-xs ${getTypeColor(currentCard?.cardType)}`}>
                      {getTypeLabel(currentCard?.cardType)}
                    </Badge>
                  </div>
                  {currentCard?.imageUrl && (
                    <div className="mb-6">
                      <img 
                        src={currentCard.imageUrl} 
                        alt="Flashcard visual" 
                        className="max-w-full max-h-64 mx-auto rounded-md object-contain"
                        data-testid="image-flashcard"
                      />
                    </div>
                  )}
                  <p className="text-2xl sm:text-3xl md:text-4xl font-medium leading-relaxed whitespace-pre-wrap">
                    {currentCard?.question}
                  </p>
                  <p className="text-sm text-muted-foreground mt-8">
                    Click or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> to flip
                  </p>
                </CardContent>
              </Card>

              {/* Back */}
              <Card
                className={`absolute top-0 left-0 w-full min-h-[400px] flex items-center justify-center backface-hidden ${
                  isFlipped ? 'visible' : 'invisible'
                }`}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <CardContent className="p-8 sm:p-12 text-center w-full">
                  <div className="mb-6">
                    <Badge variant="outline" className="text-xs bg-accent/50">
                      Answer
                    </Badge>
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl leading-relaxed whitespace-pre-wrap">
                    {currentCard?.answer}
                  </div>
                  <p className="text-sm text-muted-foreground mt-8">
                    Click or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> to flip back
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                data-testid="button-previous"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
                {" "}/{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={handleNext}
                disabled={currentIndex === cards.length - 1}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Mark as Learned */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="learned-checkbox"
                checked={currentCard?.isLearned || false}
                onCheckedChange={handleToggleLearned}
                disabled={toggleLearnedMutation.isPending}
                data-testid="checkbox-learned"
              />
              <Label
                htmlFor="learned-checkbox"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Mark as learned
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="border-t bg-card/30 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded">Space</kbd> Flip card
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded">←</kbd> Previous
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded">→</kbd> Next
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded">Esc</kbd> Exit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
