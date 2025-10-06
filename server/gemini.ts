import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FlashcardGenerationOptions {
  content: string;
  cardType: "qa" | "cloze" | "reverse";
  granularity: number;
  extraNotes: boolean;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
  cardType: "qa" | "cloze" | "reverse";
  extraNotes?: string;
}

export async function generateFlashcards(
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  const { content, cardType, granularity, extraNotes } = options;

  const granularityLabel = 
    granularity < 33 ? "brief and concise" :
    granularity < 66 ? "moderate detail" :
    "detailed and comprehensive";

  let cardTypeInstructions = "";
  switch (cardType) {
    case "qa":
      cardTypeInstructions = `Create traditional question and answer flashcards. 
The question should be clear and specific, and the answer should be direct and informative.`;
      break;
    case "cloze":
      cardTypeInstructions = `Create cloze deletion flashcards using the format {{c1::answer}}. 
The question should have one or more key terms replaced with the cloze deletion marker {{c1::term}}.
The answer should be the term that fills in the blank.`;
      break;
    case "reverse":
      cardTypeInstructions = `Create bidirectional (reverse) flashcards. 
The question is a term/concept and the answer is its definition/explanation. 
These can be studied in both directions.`;
      break;
  }

  const extraNotesInstruction = extraNotes
    ? `Also include additional context, mnemonics, or helpful explanations in the extraNotes field.`
    : `Do not include extra notes.`;

  const systemPrompt = `You are an expert educational content creator specializing in creating effective flashcards for learning.

Your task is to analyze the provided content and generate high-quality flashcards that help students learn and retain information.

Card Type Instructions:
${cardTypeInstructions}

Granularity: Create flashcards with ${granularityLabel} content.
${extraNotesInstruction}

Generate between 5-20 flashcards depending on the content length and complexity.
Focus on the most important concepts, facts, and relationships in the material.

Return your response as a JSON array of flashcard objects with this structure:
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string",
      "cardType": "${cardType}",
      "extraNotes": "string or null"
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
                  extraNotes: { type: "string", nullable: true },
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
