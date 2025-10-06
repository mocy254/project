import { Card } from "@/components/ui/card";
import { Brain, Sliders, Edit3, Download, Layers, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Generation",
    description: "Gemini 2.5 Flash creates intelligent flashcards from your content automatically"
  },
  {
    icon: Sliders,
    title: "Advanced Customization",
    description: "Choose card types (Q&A, cloze deletion, reverse), granularity, and extra notes"
  },
  {
    icon: Edit3,
    title: "Interactive Editor",
    description: "Edit, delete, and manually create cards with our intuitive editing interface"
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Export to JSON, CSV, or Anki-compatible formats for use in any study app"
  },
  {
    icon: Layers,
    title: "Multi-Format Support",
    description: "Upload PDFs, Word docs, PowerPoint, or paste YouTube links and text"
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Generate comprehensive flashcard decks in seconds, not hours"
  }
];

export default function FeatureSection() {
  return (
    <div className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need to Study Smarter
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to transform your learning experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="p-6 hover-elevate transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-[hsl(258,90%,66%)] rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
