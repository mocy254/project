import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Trophy } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <div className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Simplified animated background */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20"
        animate={{
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/30 to-transparent rounded-full blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div 
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-2xl p-10 md:p-16 lg:p-20 border border-primary/30 shadow-2xl shadow-primary/20"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative z-10">
            <div className="text-center mb-12">
              <motion.div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/20 text-foreground px-5 py-2 rounded-full mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Made by Med Students, For Med Students</span>
              </motion.div>

              <motion.h2 
                className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-[1.15] pb-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text text-transparent pb-1">
                  Reclaim Your Time.
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent pb-1">
                  Master the Material.
                </span>
              </motion.h2>

              <motion.p 
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                We built this because we were{" "}
                <span className="text-foreground font-semibold">exhausted</span>—tired of wasting half our study sessions{" "}
                <span className="italic">building</span> flashcards instead of{" "}
                <span className="text-primary font-semibold">using</span> them.{" "}
                <span className="block mt-4">Now thousands of med students walk into exams confident. Join them.</span>
              </motion.p>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Link href="/signup">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 h-14 px-10 text-lg font-semibold shadow-2xl shadow-primary/40"
                    data-testid="button-start-free"
                  >
                    Stop Wasting Time—Start Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-8 text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {[
                "No credit card required",
                "Free forever",
                "Works with Anki"
              ].map((text, i) => (
                <motion.div 
                  key={i}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
