import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface FlashcardPreviewProps {
  question: string;
  answer: string;
  cardType?: "qa" | "cloze" | "reverse";
  imageUrl?: string | null;
}

export default function FlashcardPreview({ 
  question, 
  answer, 
  cardType = "qa",
  imageUrl = null
}: FlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="perspective-1000 h-80">
        <div
          className={`relative w-full h-full transition-all duration-500 transform-style-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
          }}
        >
          <Card
            className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 cursor-pointer hover-elevate active-elevate-2 overflow-auto"
            onClick={() => setIsFlipped(!isFlipped)}
            data-testid="card-front"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-center space-y-4 w-full">
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4">
                {cardType === "qa" ? "Question" : cardType === "cloze" ? "Cloze" : "Term"}
              </div>
              {imageUrl && (
                <div className="mb-4">
                  <img 
                    src={imageUrl} 
                    alt="Flashcard visual" 
                    className="max-w-full max-h-48 mx-auto rounded-md object-contain"
                    data-testid="image-flashcard"
                  />
                </div>
              )}
              <p className="text-2xl font-display font-semibold leading-relaxed">
                {question}
              </p>
              <p className="text-sm text-muted-foreground mt-8">
                Click to reveal answer
              </p>
            </div>
          </Card>

          <Card
            className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 cursor-pointer hover-elevate active-elevate-2"
            onClick={() => setIsFlipped(!isFlipped)}
            data-testid="card-back"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            <div className="text-center space-y-4 w-full">
              <div className="inline-block px-3 py-1 bg-[hsl(158,64%,52%)]/10 text-[hsl(158,64%,52%)] text-xs font-semibold rounded-full mb-4">
                {cardType === "qa" ? "Answer" : cardType === "cloze" ? "Answer" : "Definition"}
              </div>
              <p className="text-2xl font-display font-semibold leading-relaxed">
                {answer}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={() => setIsFlipped(!isFlipped)}
          variant="outline"
          className="gap-2"
          data-testid="button-flip"
        >
          <RotateCcw className="w-4 h-4" />
          Flip Card
        </Button>
      </div>
    </div>
  );
}
