import { Card } from "@/components/ui/card";
import { Brain, Sliders, Edit3, Download, FileStack, Zap, ShieldCheck, Clock } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: ShieldCheck,
    title: "Hallucination-Free AI",
    description: "Our AI only uses information from your source material - no made-up facts, no errors. Study with confidence."
  },
  {
    icon: Clock,
    title: "Save 10+ Hours Weekly",
    description: "Stop manually creating flashcards. Generate comprehensive decks from 100+ page textbooks in minutes."
  },
  {
    icon: Brain,
    title: "Smart Topic Analysis",
    description: "Gemini 2.5 Flash intelligently identifies key concepts, definitions, and clinical facts from your content."
  },
  {
    icon: Sliders,
    title: "Granularity Control",
    description: "Choose coverage level (1-7) to focus on core concepts or get comprehensive detail - perfect for different study stages."
  },
  {
    icon: FileStack,
    title: "Multi-Format Support",
    description: "Upload PDFs, DOCX, PPT files, paste text, or use YouTube lecture links. We handle it all."
  },
  {
    icon: Edit3,
    title: "Full Editing Control",
    description: "Review and refine every flashcard. Add, delete, or modify cards to match your learning style."
  },
  {
    icon: Download,
    title: "Export to Anki",
    description: "Seamlessly export to Anki .apkg format or JSON/CSV for use in your preferred study app."
  },
  {
    icon: Zap,
    title: "Multiple Card Types",
    description: "Generate Q&A, cloze deletion, and reverse cards - all in the same deck for varied practice."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function FeatureSection() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Built for Medical Students
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Every feature designed to help you learn faster, retain more, and ace your exams with AI you can trust
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="p-6 h-full hover-elevate transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
