import { Card } from "@/components/ui/card";
import { Brain, Sliders, Edit3, Download, FileStack, Zap, ShieldCheck, Clock } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: ShieldCheck,
    title: "Hallucination-Free",
    description: "AI that only uses your source material - guaranteed accuracy for medical exams",
    gradient: "from-primary/20 to-accent/20"
  },
  {
    icon: Clock,
    title: "Save 10+ Hours Weekly",
    description: "Generate comprehensive decks from 100+ page textbooks in minutes, not days",
    gradient: "from-accent/20 to-primary/20"
  },
  {
    icon: Brain,
    title: "Smart Topic Analysis",
    description: "Automatically identifies key concepts, clinical facts, and exam-relevant details",
    gradient: "from-primary/20 via-accent/30 to-primary/20"
  },
  {
    icon: Sliders,
    title: "Precision Control",
    description: "Adjust detail level from core concepts to comprehensive coverage",
    gradient: "from-accent/30 to-primary/20"
  },
  {
    icon: FileStack,
    title: "Universal Input",
    description: "PDFs, DOCX, PPT, YouTube lectures - we handle every format seamlessly",
    gradient: "from-primary/20 to-accent/30"
  },
  {
    icon: Edit3,
    title: "Full Editing Power",
    description: "Review, refine, and customize every flashcard to match your study style",
    gradient: "from-accent/20 via-primary/30 to-accent/20"
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Seamless export to Anki .apkg, JSON, CSV - use in any study app",
    gradient: "from-primary/30 to-accent/20"
  },
  {
    icon: Zap,
    title: "Multi-Card Types",
    description: "Q&A, cloze deletion, reverse cards - all in one deck for varied practice",
    gradient: "from-accent/20 to-primary/30"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

export default function FeatureSection() {
  return (
    <div className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient effects */}
      <motion.div 
        className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-20"
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
              Everything You Need
            </span>
          </motion.h2>
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Powerful features designed for{" "}
            <span className="text-primary font-semibold">medical excellence</span>
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
              <Card className={`relative group p-6 h-full bg-gradient-to-br ${feature.gradient} backdrop-blur-xl border-primary/20 overflow-hidden`}>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
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
