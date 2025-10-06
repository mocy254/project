import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Plus, Save, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  type: "qa" | "cloze" | "reverse";
}

const initialCards: FlashCard[] = [
  { id: "1", question: "What is photosynthesis?", answer: "The process by which plants convert light energy into chemical energy", type: "qa" },
  { id: "2", question: "The capital of France is {{c1::Paris}}", answer: "Paris", type: "cloze" },
  { id: "3", question: "Mitochondria", answer: "Powerhouse of the cell", type: "reverse" },
];

export default function CardEditor() {
  const [cards, setCards] = useState<FlashCard[]>(initialCards);
  const [selectedCard, setSelectedCard] = useState<FlashCard | null>(cards[0]);
  const [editedQuestion, setEditedQuestion] = useState(cards[0].question);
  const [editedAnswer, setEditedAnswer] = useState(cards[0].answer);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const handleSelectCard = (card: FlashCard) => {
    setSelectedCard(card);
    setEditedQuestion(card.question);
    setEditedAnswer(card.answer);
  };

  const handleSave = () => {
    if (selectedCard) {
      setCards(cards.map(c => 
        c.id === selectedCard.id 
          ? { ...c, question: editedQuestion, answer: editedAnswer }
          : c
      ));
      console.log("Card saved:", { question: editedQuestion, answer: editedAnswer });
    }
  };

  const handleDelete = (id: string) => {
    setCardToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (cardToDelete) {
      const newCards = cards.filter(c => c.id !== cardToDelete);
      setCards(newCards);
      if (selectedCard?.id === cardToDelete && newCards.length > 0) {
        handleSelectCard(newCards[0]);
      }
      console.log("Card deleted:", cardToDelete);
    }
    setDeleteDialogOpen(false);
    setCardToDelete(null);
  };

  const handleExport = () => {
    console.log("Export flashcards");
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="text-lg font-display">Cards ({cards.length})</CardTitle>
          <Button size="sm" variant="outline" data-testid="button-add-card">
            <Plus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-18rem)]">
            <div className="space-y-2 px-6 pb-6">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 border-l-4 rounded-md cursor-pointer hover-elevate transition-all ${
                    selectedCard?.id === card.id
                      ? "bg-accent border-l-primary"
                      : "border-l-transparent hover:bg-muted"
                  }`}
                  onClick={() => handleSelectCard(card)}
                  data-testid={`card-item-${card.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium line-clamp-2 flex-1">{card.question}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(card.id);
                      }}
                      data-testid={`button-delete-${card.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Badge variant="outline" className={`text-xs ${getTypeColor(card.type)}`}>
                    {getTypeLabel(card.type)}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Card
          </CardTitle>
          <Button onClick={handleExport} variant="outline" size="sm" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCard ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Question / Front</label>
                <Textarea
                  value={editedQuestion}
                  onChange={(e) => setEditedQuestion(e.target.value)}
                  className="min-h-32 resize-y"
                  placeholder="Enter question..."
                  data-testid="textarea-question"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Answer / Back</label>
                <Textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  className="min-h-32 resize-y"
                  placeholder="Enter answer..."
                  data-testid="textarea-answer"
                />
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getTypeColor(selectedCard.type)}>
                  {getTypeLabel(selectedCard.type)}
                </Badge>
              </div>

              <Button onClick={handleSave} className="w-full" data-testid="button-save">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a card to edit
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the flashcard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
