import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Upload, Youtube, Type, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function GenerationForm() {
  const [textContent, setTextContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [cardTypes, setCardTypes] = useState({
    qa: true,
    cloze: false,
    reverse: false,
  });
  const [granularity, setGranularity] = useState([4]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const { userId } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const textMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/generate/text", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Flashcards generated!",
        description: `Successfully created ${data.flashcards.length} flashcards`,
      });
      setLocation(`/editor/${data.deck.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate flashcards",
        variant: "destructive",
      });
    },
  });

  const documentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/generate/document", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to generate flashcards";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Flashcards generated!",
        description: `Successfully created ${data.flashcards.length} flashcards`,
      });
      setLocation(`/editor/${data.deck.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate flashcards",
        variant: "destructive",
      });
    },
  });

  const youtubeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/generate/youtube", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Flashcards generated!",
        description: `Successfully created ${data.flashcards.length} flashcards`,
      });
      setLocation(`/editor/${data.deck.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate flashcards",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to generate flashcards",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your deck",
        variant: "destructive",
      });
      return;
    }

    const selectedCardTypes = Object.entries(cardTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type, _]) => type);

    if (selectedCardTypes.length === 0) {
      toast({
        title: "Card type required",
        description: "Please select at least one card type",
        variant: "destructive",
      });
      return;
    }

    const baseData = {
      userId,
      title,
      cardTypes: selectedCardTypes,
      granularity: granularity[0],
      customInstructions: customInstructions.trim(),
    };

    if (activeTab === "text") {
      if (!textContent.trim()) {
        toast({
          title: "Content required",
          description: "Please enter some content to generate flashcards from",
          variant: "destructive",
        });
        return;
      }
      textMutation.mutate({ ...baseData, content: textContent });
    } else if (activeTab === "document") {
      if (!file) {
        toast({
          title: "File required",
          description: "Please upload a file",
          variant: "destructive",
        });
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("title", title);
      formData.append("cardTypes", JSON.stringify(selectedCardTypes));
      formData.append("granularity", granularity[0].toString());
      formData.append("customInstructions", customInstructions.trim());
      documentMutation.mutate(formData);
    } else if (activeTab === "youtube") {
      if (!youtubeUrl.trim()) {
        toast({
          title: "URL required",
          description: "Please enter a YouTube URL",
          variant: "destructive",
        });
        return;
      }
      youtubeMutation.mutate({ ...baseData, url: youtubeUrl });
    }
  };

  const isLoading = textMutation.isPending || documentMutation.isPending || youtubeMutation.isPending;

  const granularityLabels = [
    "Essential core principles only",
    "Key concepts and main topics",
    "Important concepts with details",
    "Balanced coverage",
    "Comprehensive with details",
    "Thorough with examples",
    "Every detail and nuance",
  ];

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-display flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Generate Flashcards
        </CardTitle>
        <CardDescription>
          Choose your content source and customize how AI generates your flashcards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deck-title">Deck Title</Label>
          <Input
            id="deck-title"
            placeholder="e.g., Biology Chapter 5, JavaScript Basics"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="input-title"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" data-testid="tab-text">
              <Type className="w-4 h-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="document" data-testid="tab-document">
              <Upload className="w-4 h-4 mr-2" />
              Document
            </TabsTrigger>
            <TabsTrigger value="youtube" data-testid="tab-youtube">
              <Youtube className="w-4 h-4 mr-2" />
              YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-input">Paste your content</Label>
              <Textarea
                id="text-input"
                placeholder="Paste the text you want to create flashcards from..."
                className="min-h-48 resize-y"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                data-testid="textarea-content"
              />
            </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload document</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop or click to upload
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports PDF, DOCX, TXT, PPT, PPTX
                </p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.docx,.txt,.ppt,.pptx,.doc"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  data-testid="input-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  data-testid="button-browse"
                >
                  Browse Files
                </Button>
                {file && (
                  <p className="text-sm mt-4 text-foreground">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                data-testid="input-youtube"
              />
              <p className="text-xs text-muted-foreground">
                Make sure the video has subtitles/captions enabled
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-6 space-y-6">
          <h3 className="font-semibold text-lg">Customization Options</h3>
          
          <div className="space-y-3">
            <Label>Card Types (select one or more)</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="card-type-qa" className="font-normal">Q&A (Question & Answer)</Label>
                  <p className="text-xs text-muted-foreground">Traditional question and answer format</p>
                </div>
                <Switch
                  id="card-type-qa"
                  checked={cardTypes.qa}
                  onCheckedChange={(checked) => setCardTypes({ ...cardTypes, qa: checked })}
                  data-testid="switch-card-type-qa"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="card-type-cloze" className="font-normal">Deletion Cloze</Label>
                  <p className="text-xs text-muted-foreground">Fill-in-the-blank style cards</p>
                </div>
                <Switch
                  id="card-type-cloze"
                  checked={cardTypes.cloze}
                  onCheckedChange={(checked) => setCardTypes({ ...cardTypes, cloze: checked })}
                  data-testid="switch-card-type-cloze"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="card-type-reverse" className="font-normal">Reverse (Bidirectional)</Label>
                  <p className="text-xs text-muted-foreground">Study term → definition or definition → term</p>
                </div>
                <Switch
                  id="card-type-reverse"
                  checked={cardTypes.reverse}
                  onCheckedChange={(checked) => setCardTypes({ ...cardTypes, reverse: checked })}
                  data-testid="switch-card-type-reverse"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="granularity">Content Coverage</Label>
              <span className="text-sm text-muted-foreground">
                {granularityLabels[granularity[0] - 1]}
              </span>
            </div>
            <Slider
              id="granularity"
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
            <p className="text-xs text-muted-foreground">
              How much of the content should be included in flashcards
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-instructions">Custom Instructions (optional)</Label>
            <Textarea
              id="custom-instructions"
              placeholder="e.g., Focus on definitions, skip dates and numbers, emphasize key concepts..."
              className="min-h-20 resize-y"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              data-testid="textarea-custom-instructions"
            />
            <p className="text-xs text-muted-foreground">
              Provide specific guidance for flashcard generation
            </p>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(258,90%,66%)]"
          data-testid="button-generate"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Flashcards
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
