import { Card } from "@/components/ui/card";
import { Upload, Sparkles, Edit, Download, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Dump Your Content",
    description: "Upload that 200-page PDF you've been dreading. Or paste YouTube lecture links. Or copy-paste your notes. We handle it all.",
    color: "from-primary/30 to-accent/20",
    iconColor: "text-primary"
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Extracts the Gold",
    description: "Our system identifies every testable fact, mechanism, and clinical pearl. No fluff, no hallucinations—just what you actually need to know.",
    color: "from-accent/30 to-primary/20",
    iconColor: "text-accent"
  },
  {
    number: "03",
    icon: Edit,
    title: "Review & Perfect",
    description: "Every card is editable. Adjust phrasing, add mnemonics, organize by topic. Make it yours.",
    color: "from-primary/20 to-accent/30",
    iconColor: "text-primary"
  },
  {
    number: "04",
    icon: Download,
    title: "Export & Conquer",
    description: "One-click export to Anki for spaced repetition. Watch your retention skyrocket while your classmates are still highlighting textbooks.",
    color: "from-accent/20 to-primary/30",
    iconColor: "text-accent"
  }
];

export default function HowItWorks() {
  return (
    <div id="how-it-works" className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-background to-card/30">
      {/* Background effects */}
      <motion.div 
        className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
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
              Your Journey to
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Long-Term Retention
            </span>
          </motion.h2>
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            From information overload to{" "}
            <span className="text-primary font-semibold">confident recall</span> in 4 simple steps
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <Card className={`relative h-full p-6 bg-gradient-to-br ${step.color} backdrop-blur-xl border-primary/20 overflow-visible hover-elevate group`}>
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-xl shadow-primary/30">
                    <span className="font-display text-lg font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>
                </motion.div>

                <div className="mt-6 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br from-card to-background/50 rounded-xl flex items-center justify-center border border-primary/20`}>
                      <step.icon className={`w-7 h-7 ${step.iconColor}`} />
                    </div>
                  </motion.div>
                </div>

                <h3 className="font-display text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {i < steps.length - 1 && (
                  <motion.div 
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-primary/40"
                    animate={{
                      x: [0, 5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <p className="text-sm text-muted-foreground italic">
            Average time from upload to Anki-ready deck:{" "}
            <span className="text-primary font-semibold not-italic">under 3 minutes</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
