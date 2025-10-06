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
  const granularityLabel = 
    granularity === 1 ? "only the most essential core principles and main ideas" :
    granularity === 2 ? "key concepts and major topics" :
    granularity === 3 ? "important concepts with some supporting details" :
    granularity === 4 ? "balanced coverage of main topics and subtopics" :
    granularity === 5 ? "comprehensive coverage including supporting details" :
    granularity === 6 ? "thorough coverage with specific details and examples" :
    "exhaustive coverage capturing every detail, example, and nuance";

  // Build card type instructions for all selected types
  const cardTypeInstructions: string[] = [];
  
  if (cardTypes.includes("qa")) {
    cardTypeInstructions.push(`- Q&A cards: Traditional question and answer format. Questions should be clear and specific, answers should be concise and accurate.`);
  }
  
  if (cardTypes.includes("cloze")) {
    cardTypeInstructions.push(`- Cloze deletion cards: Use {{c1::answer}} format. Replace key terms with cloze markers. The answer contains the complete sentence with cloze markers showing what to memorize.`);
  }
  
  if (cardTypes.includes("reverse")) {
    cardTypeInstructions.push(`- Reverse cards: Bidirectional format. Question is a term/concept, answer is its definition. Can be studied in both directions.`);
  }

  const cardTypeInstruction = cardTypes.length > 1 
    ? `Generate a mix of the following card types:\n${cardTypeInstructions.join('\n')}\n\nDistribute cards across all selected types.`
    : cardTypeInstructions[0];

  const customInstructionsText = customInstructions 
    ? `\nAdditional Instructions: ${customInstructions}`
    : '';

  const systemPrompt = `You are an expert educational flashcard creator. Your goal is to create high-quality, concise, and accurate flashcards that help students learn effectively.

CRITICAL RULES:
1. NEVER add extra context, explanations, or notes beyond what's in the source material
2. Keep all cards concise and to the point
3. Extract information ONLY from the provided content - do not add external knowledge
4. Answers must be factual and directly from the source material

Card Types to Generate:
${cardTypeInstruction}

Content Coverage Level: ${granularityLabel}
${customInstructionsText}

Generate 5-20 flashcards based on content length and the specified granularity level.
Focus on creating trusted, hallucination-free flashcards.

Return your response as a JSON array with this exact structure:
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string",
      "cardType": "qa" | "cloze" | "reverse"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
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
      contents: `Please create flashcards from the following content:\n\n${content}`,
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
