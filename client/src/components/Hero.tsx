import { Button } from "@/components/ui/button";
import { GraduationCap, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Powered by Google Gemini 2.5 Flash</span>
          </motion.div>

          <motion.h1 
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Study Smarter,{" "}
            <span className="text-primary">Not Harder</span>
          </motion.h1>

          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Transform your medical textbooks, lecture notes, and videos into AI-powered flashcards in minutes. 
            Get accurate, hallucination-free study materials you can actually trust.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link href="/signup">
              <Button 
                size="lg" 
                className="w-full sm:w-auto h-12 px-8 text-base font-semibold"
                data-testid="button-get-started"
              >
                <GraduationCap className="mr-2 w-5 h-5" />
                Start Learning Free
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto h-12 px-8 text-base font-semibold"
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {[
              { 
                icon: Clock, 
                label: "Save Hours of Study Time", 
                description: "Auto-generate comprehensive flashcards from any source"
              },
              { 
                icon: ShieldCheck, 
                label: "No Hallucinations", 
                description: "Only uses information from your actual content"
              },
              { 
                icon: Sparkles, 
                label: "Customizable Cards", 
                description: "Choose card types, granularity, and custom instructions"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                className="bg-card border border-card-border rounded-xl p-6 hover-elevate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
              >
                <feature.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-2">{feature.label}</p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
