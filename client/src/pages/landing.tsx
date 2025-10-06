import Hero from "@/components/Hero";
import FeatureSection from "@/components/FeatureSection";
import CTASection from "@/components/CTASection";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Hero />
      <FeatureSection />
      <CTASection />
    </div>
  );
}
