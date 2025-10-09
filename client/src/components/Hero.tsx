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
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.15] pb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <span className="block bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent pb-1">
              Stop Drowning in
            </span>
            <motion.span 
              className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent pb-1"
              style={{ backgroundSize: "200% 200%" }}
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                backgroundPosition: {
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }
              }}
            >
              Medical Notes
            </motion.span>
          </motion.h1>

          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            You're studying every day, yet facts still slip away. You spend more time{" "}
            <span className="text-muted-foreground/80 italic">making</span> flashcards than{" "}
            <span className="text-primary font-semibold">mastering</span> them.{" "}
            <span className="block mt-4">Let AI turn your lectures, notes, and videos into Anki-ready decks—instantly.</span>
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
                  Turn Notes Into Flashcards Now
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
                icon: Clock, 
                label: "Get Your Time Back", 
                description: "Every hour you spend making flashcards is an hour you could've spent mastering them",
                gradient: "from-primary/20 to-accent/20"
              },
              { 
                icon: Brain, 
                label: "Study Smarter, Not Harder", 
                description: "From First Aid to lecture slides—instantly organized, perfectly formatted, Anki-ready",
                gradient: "from-accent/20 to-primary/20"
              },
              { 
                icon: Stethoscope, 
                label: "Built by Med Students", 
                description: "We know the struggle. We built the solution. Now we're helping thousands reclaim their focus",
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
