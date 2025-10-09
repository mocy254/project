import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Upload, Youtube, Type, Sparkles, Loader2, Settings2, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import GenerationProgressDialog from "./GenerationProgressDialog";
import { motion } from "framer-motion";

export default function GenerationForm() {
  const [textContent, setTextContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [cardTypes, setCardTypes] = useState({
    qa: true,
    cloze: false,
    reverse: false,
  });
  const [granularity, setGranularity] = useState([5]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { userId} = useUser();
  const { toast } = useToast();

  const textMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/generate/text", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
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
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
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
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
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
    <>
      <GenerationProgressDialog
        sessionId={sessionId}
        onComplete={() => {
          setSessionId(null);
          toast({
            title: "Success!",
            description: "Your flashcards are ready",
          });
        }}
        onError={(error) => {
          setSessionId(null);
          toast({
            title: "Generation failed",
            description: error,
            variant: "destructive",
          });
        }}
        onDismiss={() => setSessionId(null)}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-5xl mx-auto bg-gradient-to-br from-card to-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Generate Flashcards
            </CardTitle>
            <CardDescription>
              Choose your content source and customize how AI generates your flashcards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Deck Title */}
            <div className="space-y-2">
              <Label htmlFor="deck-title" className="text-base font-semibold">Deck Title</Label>
              <Input
                id="deck-title"
                placeholder="e.g., Biology Chapter 5, JavaScript Basics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-title"
                className="h-11"
              />
            </div>

            {/* Content Source */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Content Source
              </Label>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-11">
                  <TabsTrigger value="text" data-testid="tab-text" className="gap-2">
                    <Type className="w-4 h-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="document" data-testid="tab-document" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Document
                  </TabsTrigger>
                  <TabsTrigger value="youtube" data-testid="tab-youtube" className="gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4 mt-6">
                  <Textarea
                    placeholder="Paste the text you want to create flashcards from..."
                    className="min-h-48 resize-y"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    data-testid="textarea-content"
                  />
                </TabsContent>

                <TabsContent value="document" className="mt-6">
                  <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 transition-colors bg-gradient-to-br from-muted/20 to-transparent">
                    <Upload className="w-14 h-14 text-primary mx-auto mb-4" />
                    <p className="text-sm font-medium mb-2">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      PDF, DOCX, TXT, PPT, PPTX (max 100MB)
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,.ppt,.pptx,.doc"
                      className="hidden"
                      id="file-upload"
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
                      <p className="text-sm mt-4 text-foreground font-medium">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="youtube" className="space-y-4 mt-6">
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    data-testid="input-youtube"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Make sure the video has subtitles/captions enabled
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Card Configuration */}
            <Card className="bg-gradient-to-br from-muted/30 to-transparent border-primary/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Card Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Card Types */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Card Types (select one or more)</Label>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="card-type-qa" className="font-medium cursor-pointer">Q&A (Question & Answer)</Label>
                        <p className="text-xs text-muted-foreground">Traditional question and answer format</p>
                      </div>
                      <Switch
                        id="card-type-qa"
                        checked={cardTypes.qa}
                        onCheckedChange={(checked) => setCardTypes({ ...cardTypes, qa: checked })}
                        data-testid="switch-card-type-qa"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="card-type-cloze" className="font-medium cursor-pointer">Cloze Deletion</Label>
                        <p className="text-xs text-muted-foreground">Fill-in-the-blank style cards</p>
                      </div>
                      <Switch
                        id="card-type-cloze"
                        checked={cardTypes.cloze}
                        onCheckedChange={(checked) => setCardTypes({ ...cardTypes, cloze: checked })}
                        data-testid="switch-card-type-cloze"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="card-type-reverse" className="font-medium cursor-pointer">Reverse (Bidirectional)</Label>
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

                {/* Granularity */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Content Coverage</Label>
                    <span className="text-xs text-primary font-medium">
                      {granularityLabels[granularity[0] - 1]}
                    </span>
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
              </CardContent>
            </Card>

            {/* Custom Instructions */}
            <div className="space-y-3">
              <Label htmlFor="custom-instructions" className="text-base font-semibold">
                Custom Instructions <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="custom-instructions"
                placeholder="Example: Focus on mechanisms; shorten clinical correlations; use abbreviations like Na⁺, K⁺; skip historical context; emphasize numerical values"
                className="min-h-24 resize-y"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                data-testid="textarea-custom-instructions"
              />
              <p className="text-xs text-muted-foreground">
                Provide specific guidance to fine-tune flashcard generation
              </p>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30"
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
      </motion.div>
    </>
  );
}
