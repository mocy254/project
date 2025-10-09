import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 md:p-12 lg:p-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="text-center mb-10">
              <motion.h2 
                className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Ready to Transform Your Medical Studies?
              </motion.h2>
              <motion.p 
                className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Join medical students who are saving hours every week with AI-powered flashcards
              </motion.p>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 h-12 px-8 text-base font-semibold shadow-xl"
                  data-testid="button-start-free"
                >
                  Start For Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-6 text-primary-foreground/90"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Cancel anytime</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
