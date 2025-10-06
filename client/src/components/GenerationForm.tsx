import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Upload, Youtube, Type, Sparkles } from "lucide-react";

export default function GenerationForm() {
  const [textContent, setTextContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [cardType, setCardType] = useState("qa");
  const [granularity, setGranularity] = useState([50]);
  const [extraNotes, setExtraNotes] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleGenerate = () => {
    console.log("Generate flashcards", { cardType, granularity, extraNotes });
  };

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
        <Tabs defaultValue="text" className="w-full">
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
                  accept=".pdf,.docx,.txt,.ppt,.pptx"
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
                Paste the URL of the YouTube video you want to learn from
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-6 space-y-6">
          <h3 className="font-semibold text-lg">Customization Options</h3>
          
          <div className="space-y-2">
            <Label htmlFor="card-type">Card Type</Label>
            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger id="card-type" data-testid="select-card-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qa">Q&A (Question & Answer)</SelectItem>
                <SelectItem value="cloze">Deletion Cloze</SelectItem>
                <SelectItem value="reverse">Reverse (Bidirectional)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="granularity">Granularity</Label>
              <span className="text-sm text-muted-foreground">
                {granularity[0] < 33 ? "Brief" : granularity[0] < 66 ? "Moderate" : "Detailed"}
              </span>
            </div>
            <Slider
              id="granularity"
              value={granularity}
              onValueChange={setGranularity}
              max={100}
              step={1}
              className="w-full"
              data-testid="slider-granularity"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Brief</span>
              <span>Detailed</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="extra-notes">Include Extra Notes</Label>
              <p className="text-sm text-muted-foreground">
                Add additional context and explanations to cards
              </p>
            </div>
            <Switch
              id="extra-notes"
              checked={extraNotes}
              onCheckedChange={setExtraNotes}
              data-testid="switch-extra-notes"
            />
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(258,90%,66%)]"
          data-testid="button-generate"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Flashcards
        </Button>
      </CardContent>
    </Card>
  );
}
