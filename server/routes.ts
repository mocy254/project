import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { generateFlashcards, groupFlashcardsBySubtopic } from "./gemini";
import { extractContentFromFile, extractYouTubeTranscript } from "./contentExtractor";
import { extractImagesFromPDF, extractYouTubeThumbnail, extractYouTubeFrames } from "./imageExtractor";
import { insertDeckSchema, insertFlashcardSchema } from "@shared/schema";
import { z } from "zod";
import { progressManager } from "./progressManager";
import { SupabaseStorageService } from "./supabaseStorage";
import { readFile, unlink } from "fs";
import { promisify } from "util";
// @ts-ignore - No type definitions available
import AnkiExportModule from 'anki-apkg-export';
const AnkiExport = (AnkiExportModule as any).default || AnkiExportModule;
// Supabase Auth
import { setupAuth, isAuthenticated } from "./supabaseAuth";

const unlinkAsync = promisify(unlink);
const readFileAsync = promisify(readFile);

// Helper function to upload file to Supabase Storage
async function uploadFileToStorage(
  filePath: string,
  userId: string,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    const supabaseStorageService = new SupabaseStorageService();
    
    // Read file into buffer before uploading
    const fileBuffer = await readFileAsync(filePath);
    
    // Upload file buffer to Supabase Storage
    const storagePath = await supabaseStorageService.uploadFile(
      fileBuffer,
      userId,
      fileName,
      contentType
    );

    return storagePath;
  } finally {
    // Always clean up local file, even if upload fails
    try {
      await unlinkAsync(filePath);
    } catch (cleanupError) {
      console.error("Failed to clean up local file:", filePath, cleanupError);
    }
  }
}

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_config,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Supabase Auth
  setupAuth(app);
  
  app.post("/api/generate/text", isAuthenticated, async (req, res) => {
    try {
      const { content, cardTypes, granularity, customInstructions, title, includeSource, createSubdecks } = req.body;
      const userId = (req as any).user.id; // Get userId from authenticated session

      if (!content || !cardTypes || !Array.isArray(cardTypes) || cardTypes.length === 0 || granularity === undefined || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sessionId = randomUUID();
      
      // Return session ID immediately
      res.json({ sessionId });

      // Process asynchronously in background
      (async () => {
        try {
          progressManager.setProgress({
            sessionId,
            stage: "analyzing",
            message: "Analyzing text content...",
            progress: 10
          });

          const shouldCreateSubdecks = createSubdecks === 'true';
          const flashcards = await generateFlashcards({
            content,
            cardTypes,
            granularity,
            customInstructions: customInstructions || "",
            createSubdecks: shouldCreateSubdecks,
            onProgress: (update) => {
              progressManager.setProgress({
                sessionId,
                stage: update.stage as any,
                message: update.message,
                progress: update.progress,
                currentStep: update.currentStep,
                totalSteps: update.totalSteps,
                cardsGenerated: update.cardsGenerated
              });
            }
          });

          // Validate that flashcards were generated
          if (!flashcards || flashcards.length === 0) {
            throw new Error("No flashcards were generated. The content may be too short or the AI service is experiencing issues. Please try again.");
          }

          progressManager.setProgress({
            sessionId,
            stage: "saving",
            message: "Saving flashcards...",
            progress: 90
          });

          let resultDeckId: string;
          let totalCardCount: number;

          if (shouldCreateSubdecks && flashcards.some(c => c.subtopic)) {
            // Create parent deck
            const parentDeck = await storage.createDeck({
              userId,
              title,
              source: content.substring(0, 100) + "...",
              sourceType: "text",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'true'
            });

            // Group flashcards by subtopic
            const subdeckGroups = groupFlashcardsBySubtopic(flashcards);
            
            // Create subdeck for each subtopic
            let totalCards = 0;
            for (const group of subdeckGroups) {
              const subdeck = await storage.createDeck({
                userId,
                parentDeckId: parentDeck.id,
                title: group.subtopic,
                source: content.substring(0, 100) + "...",
                sourceType: "text",
                cardTypes,
                granularity,
                customInstructions: customInstructions || null,
                includeSource: includeSource || 'false',
                createSubdecks: 'false'
              });

              await Promise.all(
                group.flashcards.map((card, index) =>
                  storage.createFlashcard({
                    deckId: subdeck.id,
                    question: card.question,
                    answer: card.answer,
                    cardType: card.cardType,
                    position: index,
                    imageUrl: card.imageUrl || null
                  })
                )
              );

              totalCards += group.flashcards.length;
            }

            resultDeckId = parentDeck.id;
            totalCardCount = totalCards;
          } else {
            // Create single deck
            const deck = await storage.createDeck({
              userId,
              title,
              source: content.substring(0, 100) + "...",
              sourceType: "text",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'false'
            });

            const createdCards = await Promise.all(
              flashcards.map((card, index) =>
                storage.createFlashcard({
                  deckId: deck.id,
                  question: card.question,
                  answer: card.answer,
                  cardType: card.cardType,
                  position: index,
                  imageUrl: card.imageUrl || null
                })
              )
            );

            resultDeckId = deck.id;
            totalCardCount = createdCards.length;
          }

          progressManager.setProgress({
            sessionId,
            stage: "complete",
            message: "Generation complete!",
            progress: 100
          });

          progressManager.setResult(sessionId, {
            deckId: resultDeckId,
            flashcardCount: totalCardCount
          });
        } catch (error: any) {
          console.error("Text generation error:", error);
          progressManager.setProgress({
            sessionId,
            stage: "error",
            message: error.message || "Generation failed",
            progress: 0,
            error: error.message
          });
          progressManager.setResult(sessionId, null);
        }
      })();
    } catch (error: any) {
      console.error("Text generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.post("/api/generate/document", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { cardTypes, granularity, customInstructions, title, includeSource, createSubdecks, includeImages } = req.body;
      const userId = (req as any).user.id; // Get userId from authenticated session
      const sessionId = randomUUID();
      
      // Debug logging
      console.log('📄 Document upload received:');
      console.log('  File:', req.file.originalname, '(', req.file.mimetype, ')');
      console.log('  includeImages:', includeImages, '(type:', typeof includeImages, ')');
      console.log('  includeSource:', includeSource, '(type:', typeof includeSource, ')');
      console.log('  createSubdecks:', createSubdecks, '(type:', typeof createSubdecks, ')');
      
      // Return session ID immediately
      res.json({ sessionId });

      // Process asynchronously in background
      (async () => {
        try {
          progressManager.setProgress({
            sessionId,
            stage: "extracting",
            message: "Extracting content from document...",
            progress: 5
          });

          const content = await extractContentFromFile(req.file!.path, req.file!.mimetype);

          // Extract images if requested and file is PDF
          let extractedImages: Array<{imageUrl: string, pageNumber: number}> = [];
          console.log('🔍 Checking image extraction conditions:');
          console.log('  includeImages:', includeImages, '===', 'true', '?', includeImages === 'true');
          console.log('  mimetype:', req.file!.mimetype, '===', 'application/pdf', '?', req.file!.mimetype === 'application/pdf');
          
          if (includeImages === 'true' && req.file!.mimetype === 'application/pdf') {
            console.log('✅ Starting image extraction from PDF...');
            progressManager.setProgress({
              sessionId,
              stage: "extracting",
              message: "Extracting images from PDF...",
              progress: 10
            });
            extractedImages = await extractImagesFromPDF(req.file!.path, userId, 10);
            console.log(`📸 Extracted ${extractedImages.length} images from PDF`);
          } else {
            console.log('⏭️  Skipping image extraction (conditions not met)');
          }

          progressManager.setProgress({
            sessionId,
            stage: "analyzing",
            message: "Analyzing document content...",
            progress: 15
          });

          const parsedCardTypes = JSON.parse(cardTypes);
          const shouldCreateSubdecks = createSubdecks === 'true';
          const flashcards = await generateFlashcards({
            content,
            cardTypes: parsedCardTypes,
            granularity: parseInt(granularity),
            customInstructions: customInstructions || "",
            createSubdecks: shouldCreateSubdecks,
            images: extractedImages.length > 0 ? extractedImages : undefined,
            onProgress: (update) => {
              progressManager.setProgress({
                sessionId,
                stage: update.stage as any,
                message: update.message,
                progress: update.progress,
                currentStep: update.currentStep,
                totalSteps: update.totalSteps,
                cardsGenerated: update.cardsGenerated
              });
            }
          });

          // Validate that flashcards were generated
          if (!flashcards || flashcards.length === 0) {
            throw new Error("No flashcards were generated. The content may be too short or the AI service is experiencing issues. Please try again.");
          }

          progressManager.setProgress({
            sessionId,
            stage: "saving",
            message: "Saving flashcards...",
            progress: 90
          });

          let resultDeckId: string;
          let totalCardCount: number;

          // Upload file to Supabase Storage only if includeSource is true
          let fileUrl: string | null = null;
          if (includeSource === 'true') {
            try {
              console.log('⬆️  Uploading source file to Supabase Storage...');
              fileUrl = await uploadFileToStorage(
                req.file!.path,
                userId,
                req.file!.originalname,
                req.file!.mimetype
              );
              console.log('✅ Source file uploaded:', fileUrl);
            } catch (uploadError) {
              console.error("❌ Failed to upload file to storage:", uploadError);
              // Continue without fileUrl if upload fails
            }
          } else {
            console.log('⏭️  Skipping source file upload (includeSource is false)');
            // Clean up temporary file since we're not uploading it
            try {
              await unlinkAsync(req.file!.path);
              console.log('🗑️  Cleaned up temporary file');
            } catch (cleanupError) {
              console.error("Failed to clean up temporary file:", req.file!.path, cleanupError);
            }
          }

          if (shouldCreateSubdecks && flashcards.some(c => c.subtopic)) {
            // Create parent deck
            const parentDeck = await storage.createDeck({
              userId,
              title,
              source: req.file!.originalname,
              sourceType: "document",
              cardTypes: parsedCardTypes,
              granularity: parseInt(granularity),
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'true',
              fileUrl
            });

            // Group flashcards by subtopic
            const subdeckGroups = groupFlashcardsBySubtopic(flashcards);
            
            // Create subdeck for each subtopic
            let totalCards = 0;
            for (const group of subdeckGroups) {
              const subdeck = await storage.createDeck({
                userId,
                parentDeckId: parentDeck.id,
                title: group.subtopic,
                source: req.file!.originalname,
                sourceType: "document",
                cardTypes: parsedCardTypes,
                granularity: parseInt(granularity),
                customInstructions: customInstructions || null,
                includeSource: includeSource || 'false',
                createSubdecks: 'false'
              });

              await Promise.all(
                group.flashcards.map((card, index) =>
                  storage.createFlashcard({
                    deckId: subdeck.id,
                    question: card.question,
                    answer: card.answer,
                    cardType: card.cardType,
                    position: index,
                    imageUrl: card.imageUrl || null
                  })
                )
              );

              totalCards += group.flashcards.length;
            }

            resultDeckId = parentDeck.id;
            totalCardCount = totalCards;
          } else {
            // Create single deck
            const deck = await storage.createDeck({
              userId,
              title,
              source: req.file!.originalname,
              sourceType: "document",
              cardTypes: parsedCardTypes,
              granularity: parseInt(granularity),
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'false',
              fileUrl
            });

            const createdCards = await Promise.all(
              flashcards.map((card, index) =>
                storage.createFlashcard({
                  deckId: deck.id,
                  question: card.question,
                  answer: card.answer,
                  cardType: card.cardType,
                  position: index,
                  imageUrl: card.imageUrl || null
                })
              )
            );

            resultDeckId = deck.id;
            totalCardCount = createdCards.length;
          }

          progressManager.setProgress({
            sessionId,
            stage: "complete",
            message: "Generation complete!",
            progress: 100
          });

          progressManager.setResult(sessionId, {
            deckId: resultDeckId,
            flashcardCount: totalCardCount
          });
        } catch (error: any) {
          console.error("Document generation error:", error);
          progressManager.setProgress({
            sessionId,
            stage: "error",
            message: error.message || "Generation failed",
            progress: 0,
            error: error.message
          });
          progressManager.setResult(sessionId, null);
        }
      })();
    } catch (error: any) {
      console.error("Document generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.post("/api/generate/youtube", isAuthenticated, async (req, res) => {
    try {
      const { url, cardTypes, granularity, customInstructions, title, includeSource, createSubdecks, includeImages } = req.body;
      const userId = (req as any).user.id; // Get userId from authenticated session

      if (!url || !cardTypes || !Array.isArray(cardTypes) || cardTypes.length === 0 || granularity === undefined || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sessionId = randomUUID();
      
      // Return session ID immediately
      res.json({ sessionId });

      // Process asynchronously in background
      (async () => {
        try {
          progressManager.setProgress({
            sessionId,
            stage: "extracting",
            message: "Extracting transcript from YouTube video...",
            progress: 5
          });

          const shouldIncludeTimestamps = includeSource === 'true';
          const content = await extractYouTubeTranscript(url, shouldIncludeTimestamps, () => {
            // Callback when Whisper fallback is triggered
            progressManager.setProgress({
              sessionId,
              stage: "extracting",
              message: "No captions found - transcribing audio with AI (this may take a minute)...",
              progress: 10
            });
          });

          // Extract YouTube frames if requested
          let extractedImages: Array<{imageUrl: string}> = [];
          if (includeImages === 'true') {
            progressManager.setProgress({
              sessionId,
              stage: "extracting",
              message: "Extracting video frames...",
              progress: 10
            });
            const frameUrls = await extractYouTubeFrames(url, userId, 10, 30);
            extractedImages = frameUrls.map((imageUrl: string) => ({ imageUrl }));
          }

          progressManager.setProgress({
            sessionId,
            stage: "analyzing",
            message: "Analyzing video transcript...",
            progress: 15
          });

          const shouldCreateSubdecks = createSubdecks === 'true';
          const flashcards = await generateFlashcards({
            content,
            cardTypes,
            granularity,
            customInstructions: customInstructions || "",
            createSubdecks: shouldCreateSubdecks,
            images: extractedImages.length > 0 ? extractedImages : undefined,
            onProgress: (update) => {
              progressManager.setProgress({
                sessionId,
                stage: update.stage as any,
                message: update.message,
                progress: update.progress,
                currentStep: update.currentStep,
                totalSteps: update.totalSteps,
                cardsGenerated: update.cardsGenerated
              });
            }
          });

          // Validate that flashcards were generated
          if (!flashcards || flashcards.length === 0) {
            throw new Error("No flashcards were generated. The content may be too short or the AI service is experiencing issues. Please try again.");
          }

          progressManager.setProgress({
            sessionId,
            stage: "saving",
            message: "Saving flashcards...",
            progress: 90
          });

          let resultDeckId: string;
          let totalCardCount: number;

          if (shouldCreateSubdecks && flashcards.some(c => c.subtopic)) {
            // Create parent deck
            const parentDeck = await storage.createDeck({
              userId,
              title,
              source: url,
              sourceType: "youtube",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'true'
            });

            // Group flashcards by subtopic
            const subdeckGroups = groupFlashcardsBySubtopic(flashcards);
            
            // Create subdeck for each subtopic
            let totalCards = 0;
            for (const group of subdeckGroups) {
              const subdeck = await storage.createDeck({
                userId,
                parentDeckId: parentDeck.id,
                title: group.subtopic,
                source: url,
                sourceType: "youtube",
                cardTypes,
                granularity,
                customInstructions: customInstructions || null,
                includeSource: includeSource || 'false',
                createSubdecks: 'false'
              });

              await Promise.all(
                group.flashcards.map((card, index) =>
                  storage.createFlashcard({
                    deckId: subdeck.id,
                    question: card.question,
                    answer: card.answer,
                    cardType: card.cardType,
                    position: index,
                    imageUrl: card.imageUrl || null
                  })
                )
              );

              totalCards += group.flashcards.length;
            }

            resultDeckId = parentDeck.id;
            totalCardCount = totalCards;
          } else {
            // Create single deck
            const deck = await storage.createDeck({
              userId,
              title,
              source: url,
              sourceType: "youtube",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'false'
            });

            const createdCards = await Promise.all(
              flashcards.map((card, index) =>
                storage.createFlashcard({
                  deckId: deck.id,
                  question: card.question,
                  answer: card.answer,
                  cardType: card.cardType,
                  position: index,
                  imageUrl: card.imageUrl || null
                })
              )
            );

            resultDeckId = deck.id;
            totalCardCount = createdCards.length;
          }

          progressManager.setProgress({
            sessionId,
            stage: "complete",
            message: "Generation complete!",
            progress: 100
          });

          progressManager.setResult(sessionId, {
            deckId: resultDeckId,
            flashcardCount: totalCardCount
          });
        } catch (error: any) {
          console.error("YouTube generation error:", error);
          progressManager.setProgress({
            sessionId,
            stage: "error",
            message: error.message || "Generation failed",
            progress: 0,
            error: error.message
          });
          progressManager.setResult(sessionId, null);
        }
      })();
    } catch (error: any) {
      console.error("YouTube generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.get("/api/generation/progress/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const progress = progressManager.getProgress(sessionId);
      
      if (!progress) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/generation/result/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = progressManager.getResult(sessionId);
      
      if (result === undefined) {
        return res.status(404).json({ error: "Session not found or expired" });
      }
      
      if (result === null) {
        return res.status(500).json({ error: "Generation failed" });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const decks = await storage.getDecksByUserId(userId);
      res.json(decks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deck = await storage.getDeck(id);
      if (!deck) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.json(deck);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id/cards", async (req, res) => {
    try {
      const { id } = req.params;
      const cards = await storage.getFlashcardsByDeckId(id);
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id/cards/all", async (req, res) => {
    try {
      const { id } = req.params;
      const cards = await storage.getAllFlashcardsWithSubdecks(id);
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;

      const updated = await storage.updateFlashcard(id, {
        question,
        answer
      });

      if (!updated) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFlashcard(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/cards/:id/learned", async (req, res) => {
    try {
      const { id } = req.params;
      
      const learnedSchema = z.object({
        isLearned: z.boolean()
      });
      
      const validatedData = learnedSchema.parse(req.body);

      const updated = await storage.updateFlashcard(id, {
        isLearned: validatedData.isLearned,
        learnedAt: validatedData.isLearned ? new Date() : null
      });

      if (!updated) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/decks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, granularity, cardTypes, customInstructions } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (granularity !== undefined) updateData.granularity = granularity;
      if (cardTypes !== undefined) updateData.cardTypes = cardTypes;
      if (customInstructions !== undefined) updateData.customInstructions = customInstructions;

      const updated = await storage.updateDeck(id, updateData);

      if (!updated) {
        return res.status(404).json({ error: "Deck not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/decks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDeck(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id/export/:format", async (req, res) => {
    try {
      const { id, format } = req.params;
      const deck = await storage.getDeck(id);

      if (!deck) {
        return res.status(404).json({ error: "Deck not found" });
      }

      // Helper to build deck path for hierarchy
      const buildDeckPath = async (deckId: string): Promise<string> => {
        const currentDeck = await storage.getDeck(deckId);
        if (!currentDeck) return "";
        
        if (currentDeck.parentDeckId) {
          const parentPath = await buildDeckPath(currentDeck.parentDeckId);
          return parentPath ? `${parentPath}::${currentDeck.title}` : currentDeck.title;
        }
        
        return currentDeck.title;
      };

      // Get all cards including from subdecks with deck info
      const getCardsWithDeckInfo = async (deckId: string): Promise<Array<{ card: any; deckPath: string }>> => {
        const currentDeck = await storage.getDeck(deckId);
        if (!currentDeck) return [];
        
        const deckPath = await buildDeckPath(deckId);
        const directCards = await storage.getFlashcardsByDeckId(deckId);
        const cardsWithDeck = directCards.map(card => ({ card, deckPath }));
        
        // Get cards from all subdecks recursively
        const subdecks = await storage.getSubdecks(deckId);
        for (const subdeck of subdecks) {
          const subdeckCards = await getCardsWithDeckInfo(subdeck.id);
          cardsWithDeck.push(...subdeckCards);
        }
        
        return cardsWithDeck;
      };

      const allCardsWithDeck = await getCardsWithDeckInfo(id);
      const allCards = allCardsWithDeck.map(item => item.card);

      switch (format) {
        case "json":
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.json"`);
          res.json({ deck, flashcards: allCards });
          break;

        case "csv":
          const csvRows = ["Deck,Question,Answer,Type,ImageURL"];
          allCardsWithDeck.forEach(({ card, deckPath }) => {
            const row = [
              `"${deckPath.replace(/"/g, '""')}"`,
              `"${card.question.replace(/"/g, '""')}"`,
              `"${card.answer.replace(/"/g, '""')}"`,
              card.cardType,
              card.imageUrl ? `"${card.imageUrl.replace(/"/g, '""')}"` : '""'
            ];
            csvRows.push(row.join(","));
          });
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.csv"`);
          res.send(csvRows.join("\n"));
          break;

        case "anki":
          // Group cards by deck path to preserve hierarchy
          const deckGroups = new Map<string, any[]>();
          
          allCardsWithDeck.forEach(({ card, deckPath }) => {
            if (!deckGroups.has(deckPath)) {
              deckGroups.set(deckPath, []);
            }
            deckGroups.get(deckPath)!.push(card);
          });

          // If there's only one deck (no subdecks), use simple export
          if (deckGroups.size === 1 && deckGroups.has(deck.title)) {
            const apkg = new AnkiExport(deck.title);
            
            // Download and add images to package
            const imageMap = new Map<string, string>();
            for (const card of allCards) {
              if (card.imageUrl && !imageMap.has(card.imageUrl)) {
                try {
                  const response = await fetch(card.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const imageExtension = card.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                    const filename = `image_${imageMap.size + 1}.${imageExtension}`;
                    apkg.addMedia(filename, Buffer.from(buffer));
                    imageMap.set(card.imageUrl, filename);
                  }
                } catch (err) {
                  console.error(`Failed to fetch image ${card.imageUrl}:`, err);
                }
              }
            }
            
            allCards.forEach((card: any) => {
              let question = card.question;
              let answer = card.answer;
              
              // Add image to question if available and downloaded
              if (card.imageUrl && imageMap.has(card.imageUrl)) {
                const filename = imageMap.get(card.imageUrl);
                question = `<img src="${filename}" style="max-width: 100%; max-height: 300px; display: block; margin: 10px auto;" /><br/>${question}`;
              }
              
              if (card.cardType === "cloze") {
                const clozeParts = question.split("[blank]");
                if (clozeParts.length > 1) {
                  question = clozeParts[0] + `{{c1::${answer}}}` + clozeParts.slice(1).join("[blank]");
                  answer = "";
                }
              }
              
              apkg.addCard(question, answer);
            });
            
            const zipData = await apkg.save();
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.apkg"`);
            res.send(Buffer.from(zipData, 'binary'));
          } else {
            // Export with subdeck tags for organization
            // Note: anki-apkg-export creates one deck per .apkg file
            // We use tags to indicate subdeck membership so users can reorganize in Anki
            const apkg = new AnkiExport(deck.title);
            
            // Download and add images to package
            const imageMap = new Map<string, string>();
            for (const card of allCards) {
              if (card.imageUrl && !imageMap.has(card.imageUrl)) {
                try {
                  const response = await fetch(card.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const imageExtension = card.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                    const filename = `image_${imageMap.size + 1}.${imageExtension}`;
                    apkg.addMedia(filename, Buffer.from(buffer));
                    imageMap.set(card.imageUrl, filename);
                  }
                } catch (err) {
                  console.error(`Failed to fetch image ${card.imageUrl}:`, err);
                }
              }
            }
            
            for (const [deckPath, cards] of Array.from(deckGroups.entries())) {
              cards.forEach((card: any) => {
                let question = card.question;
                let answer = card.answer;
                
                // Add image to question if available and downloaded
                if (card.imageUrl && imageMap.has(card.imageUrl)) {
                  const filename = imageMap.get(card.imageUrl);
                  question = `<img src="${filename}" style="max-width: 100%; max-height: 300px; display: block; margin: 10px auto;" /><br/>${question}`;
                }
                
                if (card.cardType === "cloze") {
                  const clozeParts = question.split("[blank]");
                  if (clozeParts.length > 1) {
                    question = clozeParts[0] + `{{c1::${answer}}}` + clozeParts.slice(1).join("[blank]");
                    answer = "";
                  }
                }
                
                // Use full deck path as tag to preserve hierarchy
                // Replace :: with _ and normalize spaces for Anki tag format
                const hierarchyTag = deckPath.replace(/::/g, '_').replace(/\s+/g, '_');
                
                // Add card with full hierarchy path as tag
                apkg.addCard(question, answer, { 
                  tags: [hierarchyTag] 
                });
              });
            }
            
            const zipData = await apkg.save();
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.apkg"`);
            res.send(Buffer.from(zipData, 'binary'));
          }
          break;

        default:
          res.status(400).json({ error: "Invalid export format" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Replit Auth - Get current user (from blueprint:javascript_log_in_with_replit)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
