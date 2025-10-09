import { Card } from "@/components/ui/card";
import { Brain, Sliders, Edit3, Download, ShieldCheck, Clock, FileStack, Microscope } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Brain,
    title: "Active Recall Engine",
    description: "Every flashcard forces retrieval practice—the #1 scientifically-proven method to move info from short-term cramming to long-term memory",
    gradient: "from-primary/20 to-accent/20"
  },
  {
    icon: Clock,
    title: "Built for Spaced Repetition",
    description: "Seamless Anki export means you'll review cards exactly when your brain is about to forget them. Science-backed, retention-maximized.",
    gradient: "from-accent/20 to-primary/20"
  },
  {
    icon: ShieldCheck,
    title: "Zero Hallucinations",
    description: "We only pull from YOUR source material. No made-up facts, no fictional drugs, no mystery mechanisms. Your textbook = your flashcards.",
    gradient: "from-primary/20 via-accent/20 to-primary/20"
  },
  {
    icon: Microscope,
    title: "Med School Optimized",
    description: "Designed for anatomy atlases, pharmacology tables, pathology slides, and those brutal biochem pathways. We get it—because we built it for us.",
    gradient: "from-accent/20 to-primary/20"
  },
  {
    icon: FileStack,
    title: "Any Format, Any Source",
    description: "PDFs from faculty, DOCX notes, YouTube lectures, PowerPoints. 200-page textbook chapters? Bring it. We handle the heavy lifting.",
    gradient: "from-primary/20 to-accent/20"
  },
  {
    icon: Sliders,
    title: "Granularity Control",
    description: "Need just high-yield facts? Or every single detail? Slide the dial. From \"Step 1 core concepts\" to \"shelf exam minutiae\"—you decide.",
    gradient: "from-accent/20 via-primary/20 to-accent/20"
  },
  {
    icon: Edit3,
    title: "Full Editing Freedom",
    description: "Hate a phrasing? Change it. Want to add a mnemonic? Do it. Organize by systems, diseases, or drugs. These are YOUR cards.",
    gradient: "from-primary/20 to-accent/20"
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "One-click .apkg for Anki. CSV for spreadsheets. JSON for nerds. Study on your phone, tablet, laptop—wherever muscle memory kicks in.",
    gradient: "from-accent/20 to-primary/20"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function FeatureSection() {
  return (
    <div id="features" className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Simplified background effects */}
      <motion.div 
        className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2 
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Built Different,
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Because Med School Is
            </span>
          </motion.h2>
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Features designed by med students who were{" "}
            <span className="text-primary font-semibold">tired of forgetting everything</span>{" "}
            they just studied
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`relative group p-6 h-full bg-gradient-to-br ${feature.gradient} backdrop-blur-xl border-primary/20 overflow-visible`}>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                </motion.div>
                <h3 className="font-display text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
