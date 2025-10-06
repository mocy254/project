import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Youtube, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-[hsl(258,90%,66%)] to-primary opacity-95" />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border-2 border-white/30 text-white px-4 py-2 rounded-full mb-8">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Powered by Gemini 2.5 Flash</span>
        </div>

        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Transform Content into
          <br />
          <span className="bg-gradient-to-r from-[hsl(38,92%,50%)] to-[hsl(158,64%,52%)] bg-clip-text text-transparent">
            Smart Flashcards
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
          Turn text, documents, and YouTube videos into customizable study flashcards 
          with AI-powered generation. Learn smarter, not harder.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link href="/signup">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base font-semibold shadow-xl"
              data-testid="button-get-started"
            >
              Get Started Free
              <Zap className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button 
              size="lg" 
              variant="outline" 
              className="backdrop-blur-md bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 h-12 px-8 text-base font-semibold"
              data-testid="button-sign-in"
            >
              Sign In
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: FileText, label: "PDF, DOCX, PPT" },
            { icon: Youtube, label: "YouTube Videos" },
            { icon: Sparkles, label: "AI Generation" }
          ].map((feature, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <feature.icon className="w-8 h-8 text-white mx-auto mb-3" />
              <p className="text-white font-medium">{feature.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
