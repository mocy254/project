import { Button } from "@/components/ui/button";
import { GraduationCap, Brain, Clock, ArrowRight, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-card to-background pt-16">
      {/* Optimized animated gradient orbs - fewer, simpler animations */}
      <motion.div 
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent/20 to-primary/15 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 backdrop-blur-xl border border-primary/20 text-foreground px-5 py-2 rounded-full mb-8 shadow-lg shadow-primary/10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <Stethoscope className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              Built for Medical Students
            </span>
          </motion.div>

          <motion.h1 
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.span 
              className="block mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              Stop Forgetting.
            </motion.span>
            <motion.span 
              className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              style={{ backgroundSize: "200% 200%" }}
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                y: [0, -5, 0],
              }}
              transition={{
                backgroundPosition: {
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                },
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3
                }
              }}
            >
              Start Remembering.
            </motion.span>
          </motion.h1>

          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Transform your lectures and textbooks into{" "}
            <span className="text-primary font-semibold">active recall</span>{" "}
            flashcards that actually stick. Because reading isn't learning—
            <span className="text-accent font-semibold">testing yourself is</span>.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link href="/signup">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-14 px-10 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-xl shadow-primary/30"
                  data-testid="button-get-started"
                >
                  <GraduationCap className="mr-2 w-6 h-6" />
                  Start Learning Smarter
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/login">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto h-14 px-10 text-lg font-semibold border-2 border-primary/30 bg-card/50 backdrop-blur-xl hover:bg-card/80"
                  data-testid="button-sign-in"
                >
                  Sign In
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            {[
              { 
                icon: Brain, 
                label: "Active Recall Built-In", 
                description: "Every card forces retrieval—the proven method to lock in knowledge",
                gradient: "from-primary/20 to-accent/20"
              },
              { 
                icon: Clock, 
                label: "Spaced Repetition Ready", 
                description: "Export to Anki for scientifically-timed reviews",
                gradient: "from-accent/20 to-primary/20"
              },
              { 
                icon: Stethoscope, 
                label: "No Hallucinations", 
                description: "Only facts from YOUR textbooks and lectures",
                gradient: "from-primary/20 via-accent/20 to-primary/20"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                className={`relative group bg-gradient-to-br ${feature.gradient} backdrop-blur-xl border border-primary/20 rounded-2xl p-6 hover-elevate overflow-visible`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <feature.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="font-semibold text-base text-foreground mb-2">{feature.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
