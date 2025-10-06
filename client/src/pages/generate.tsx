import GenerationForm from "@/components/GenerationForm";

export default function Generate() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Generate Flashcards</h1>
        <p className="text-muted-foreground mt-1">Transform your content into study materials</p>
      </div>
      <GenerationForm />
    </div>
  );
}
