import { useState } from "react";
import CardEditor from "@/components/CardEditor";
import FlashcardPreview from "@/components/FlashcardPreview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit } from "lucide-react";

export default function Editor() {
  const [currentCard] = useState({
    question: "What is the powerhouse of the cell?",
    answer: "Mitochondria - organelles that generate most of the cell's supply of ATP",
    type: "qa" as const
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Flashcard Editor</h1>
        <p className="text-muted-foreground mt-1">Edit and preview your flashcards</p>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit" data-testid="tab-edit">
            <Edit className="w-4 h-4 mr-2" />
            Edit Cards
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-6">
          <CardEditor />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <FlashcardPreview
            question={currentCard.question}
            answer={currentCard.answer}
            cardType={currentCard.type}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
