import LandingNav from "@/components/LandingNav";
import Hero from "@/components/Hero";
import FeatureSection from "@/components/FeatureSection";
import HowItWorks from "@/components/HowItWorks";
import CTASection from "@/components/CTASection";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <FeatureSection />
      <CTASection />
    </div>
  );
}
