import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Plus, Save, Download, Loader2, Eye, BookOpen } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlashcardPreview from "@/components/FlashcardPreview";

export default function Editor() {
  const params = useParams();
  const deckId = params.id as string;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState("");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

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

  const selectedCard = cards?.find((c: any) => c.id === selectedCardId);

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; question: string; answer: string }) => {
      await apiRequest("PUT", `/api/cards/${data.id}`, {
        question: data.question,
        answer: data.answer,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decks', deckId, 'cards', 'all'] });
      toast({
        title: "Card updated",
        description: "Your changes have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update card",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decks', deckId, 'cards', 'all'] });
      toast({
        title: "Card deleted",
        description: "The flashcard has been removed",
      });
      setSelectedCardId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete card",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectCard = (card: any) => {
    setSelectedCardId(card.id);
    setEditedQuestion(card.question);
    setEditedAnswer(card.answer);
  };

  const handleSave = () => {
    if (selectedCardId) {
      updateMutation.mutate({
        id: selectedCardId,
        question: editedQuestion,
        answer: editedAnswer,
      });
    }
  };

  const handleDelete = (id: string) => {
    setCardToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (cardToDelete) {
      deleteMutation.mutate(cardToDelete);
    }
    setDeleteDialogOpen(false);
    setCardToDelete(null);
  };

  const handleExport = (format: string) => {
    window.open(`/api/decks/${deckId}/export/${format}`, '_blank');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">No cards found in this deck</p>
      </div>
    );
  }

  if (!selectedCard && cards.length > 0) {
    handleSelectCard(cards[0]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{deck?.title || "Flashcard Editor"}</h1>
          <p className="text-muted-foreground mt-1">Edit and preview your flashcards</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setLocation(`/study/${deckId}`)} 
            variant="default" 
            size="sm"
            data-testid="button-study"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Study
          </Button>
          <Button onClick={() => handleExport("json")} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button onClick={() => handleExport("csv")} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button onClick={() => handleExport("anki")} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Anki
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit" data-testid="tab-edit">
            <Edit className="w-4 h-4 mr-2" />
            Edit Cards
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-18rem)]">
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                <CardTitle className="text-lg font-display">Cards ({cards.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <div className="space-y-2 px-6 pb-6">
                    {cards.map((card: any) => (
                      <div
                        key={card.id}
                        className={`p-4 border-l-4 rounded-md cursor-pointer hover-elevate transition-all ${
                          selectedCardId === card.id
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
                        <Badge variant="outline" className={`text-xs ${getTypeColor(card.cardType)}`}>
                          {getTypeLabel(card.cardType)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Card
                </CardTitle>
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
                      <Badge variant="outline" className={getTypeColor(selectedCard.cardType)}>
                        {getTypeLabel(selectedCard.cardType)}
                      </Badge>
                    </div>

                    <Button 
                      onClick={handleSave} 
                      className="w-full" 
                      data-testid="button-save"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a card to edit
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          {selectedCard && (
            <FlashcardPreview
              question={selectedCard.question}
              answer={selectedCard.answer}
              cardType={selectedCard.cardType}
            />
          )}
        </TabsContent>
      </Tabs>

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
