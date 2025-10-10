import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeckSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: {
    id: string;
    title: string;
    granularity: number;
    cardTypes: string[];
    customInstructions?: string | null;
    userId: string;
  };
}

export default function DeckSettingsDialog({ open, onOpenChange, deck }: DeckSettingsDialogProps) {
  const [title, setTitle] = useState(deck.title);
  const [cardTypes, setCardTypes] = useState({
    qa: deck.cardTypes.includes("qa"),
    cloze: deck.cardTypes.includes("cloze"),
    reverse: deck.cardTypes.includes("reverse"),
  });
  const [granularity, setGranularity] = useState([deck.granularity]);
  const [customInstructions, setCustomInstructions] = useState(deck.customInstructions || "");
  const { toast } = useToast();

  // Reset form state when dialog opens or deck changes
  useEffect(() => {
    if (open) {
      setTitle(deck.title);
      setCardTypes({
        qa: deck.cardTypes.includes("qa"),
        cloze: deck.cardTypes.includes("cloze"),
        reverse: deck.cardTypes.includes("reverse"),
      });
      setGranularity([deck.granularity]);
      setCustomInstructions(deck.customInstructions || "");
    }
  }, [open, deck]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/decks/${deck.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decks/user', deck.userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/decks', deck.id] });
      toast({
        title: "Settings updated",
        description: "Your deck settings have been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update deck settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedCardTypes = Object.entries(cardTypes)
      .filter(([_, selected]) => selected)
      .map(([type, _]) => type);

    if (selectedCardTypes.length === 0) {
      toast({
        title: "Invalid settings",
        description: "Please select at least one card type.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      title,
      granularity: granularity[0],
      cardTypes: selectedCardTypes,
      customInstructions: customInstructions || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-deck-settings">
        <DialogHeader>
          <DialogTitle>Deck Settings</DialogTitle>
          <DialogDescription>
            Update your deck's configuration and regeneration settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Deck Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter deck title"
              data-testid="input-deck-title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Card Types</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="qa"
                  checked={cardTypes.qa}
                  onCheckedChange={(checked) => setCardTypes({ ...cardTypes, qa: checked as boolean })}
                  data-testid="checkbox-qa"
                />
                <label htmlFor="qa" className="text-sm cursor-pointer">
                  Q&A (Question & Answer)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cloze"
                  checked={cardTypes.cloze}
                  onCheckedChange={(checked) => setCardTypes({ ...cardTypes, cloze: checked as boolean })}
                  data-testid="checkbox-cloze"
                />
                <label htmlFor="cloze" className="text-sm cursor-pointer">
                  Cloze Deletion (Fill in the blank)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reverse"
                  checked={cardTypes.reverse}
                  onCheckedChange={(checked) => setCardTypes({ ...cardTypes, reverse: checked as boolean })}
                  data-testid="checkbox-reverse"
                />
                <label htmlFor="reverse" className="text-sm cursor-pointer">
                  Reverse (Bidirectional)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content Coverage (Granularity)</Label>
              <span className="text-sm text-muted-foreground">{granularity[0]}/7</span>
            </div>
            <Slider
              value={granularity}
              onValueChange={setGranularity}
              min={1}
              max={7}
              step={1}
              className="w-full"
              data-testid="slider-granularity"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Core principles</span>
              <span>Every detail</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
            <Textarea
              id="customInstructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Focus on clinical applications, include mnemonics..."
              rows={3}
              data-testid="textarea-custom-instructions"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
