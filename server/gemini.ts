import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FlashcardGenerationOptions {
  content: string;
  cardTypes: string[];
  granularity: number;
  customInstructions: string;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
  cardType: "qa" | "cloze" | "reverse";
}

export async function generateFlashcards(
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  const { content, cardTypes, granularity, customInstructions } = options;

  // Granularity: 1-7 scale representing content coverage
  const coverageGuidance = 
    granularity === 1 ? "Include only the most essential core principles and main ideas. Skip minor details and examples." :
    granularity === 2 ? "Cover key concepts and major topics. Include important facts but omit fine details." :
    granularity === 3 ? "Include important concepts with some supporting details. Cover main points thoroughly." :
    granularity === 4 ? "Provide balanced coverage of main topics and subtopics. Include most relevant facts." :
    granularity === 5 ? "Provide comprehensive coverage. Include every clinically or conceptually relevant fact. Skip only truly minor details." :
    granularity === 6 ? "Thorough coverage with specific details and examples. Include mechanisms, numbers, and exceptions." :
    "Exhaustive coverage capturing every detail, example, and nuance. Do not skip any information.";

  // Build card type descriptions
  const cardTypeDescriptions: string[] = [];
  const reverseEnabled = cardTypes.includes("reverse");
  
  if (cardTypes.includes("qa")) {
    cardTypeDescriptions.push(`- Q&A: One clear question + concise, factual answer`);
  }
  
  if (cardTypes.includes("cloze")) {
    cardTypeDescriptions.push(`- Cloze: Hide key terms, values, or phrases using {{c1::term}} format (no large blanks)`);
  }
  
  if (reverseEnabled) {
    cardTypeDescriptions.push(`- Reverse: Also generate the inverse card (answer → question) for bidirectional study`);
  }

  const cardTypeList = cardTypeDescriptions.join('\n');
  const customInstructionsText = customInstructions 
    ? `\n\n**Custom Instructions:** ${customInstructions}`
    : '';

  const systemPrompt = `You are an expert educational AI that converts study material into high-yield, exam-ready flashcards.

---
**User Settings:**
Card Types: ${cardTypes.join(", ")}
${reverseEnabled ? 'Reverse Mode: ENABLED — Generate bidirectional cards where appropriate' : ''}
Content Coverage: ${coverageGuidance}${customInstructionsText}
---

**Rules for Flashcard Generation:**

1. **Coverage:** ${coverageGuidance}

2. **Card Structure:**
${cardTypeList}

3. **Conciseness:** Use ≤30 words per answer. Bullet points allowed. Avoid redundant or overlapping cards.

4. **Clarity:** Each card must stand alone without requiring outside context. Include essential context in the question if needed.

5. **No Hallucination:** Extract information ONLY from the provided content. Never add external knowledge, elaboration, or examples not present in the source.

6. **Consistency:** If the same topic appears multiple times, merge or reword to avoid duplication. Do not create near-identical cards.

7. **Precision:** Include specific numbers, mechanisms, terms, or exceptions when present in the source material (especially at higher coverage levels).

8. **Style:** Be precise and fact-dense. Questions should be clear and unambiguous. Answers should be direct and concise.

**Output Format:** Return a JSON array of flashcard objects with question, answer, and cardType fields.

Generate 5-25 flashcards based on content length and coverage level.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.25,
        responseSchema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                  cardType: { type: "string" },
                },
                required: ["question", "answer", "cardType"],
              },
            },
          },
          required: ["flashcards"],
        },
      },
      contents: `Create flashcards from the following content:\n\n${content}`,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(rawJson);
    return data.flashcards || [];
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error(`Failed to generate flashcards: ${error}`);
  }
}
