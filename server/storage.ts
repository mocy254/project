import { type User, type InsertUser, type Deck, type InsertDeck, type Flashcard, type InsertFlashcard, users, decks, flashcards } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, asc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createDeck(deck: InsertDeck): Promise<Deck>;
  getDeck(id: string): Promise<Deck | undefined>;
  getDecksByUserId(userId: string): Promise<Deck[]>;
  getSubdecks(parentDeckId: string): Promise<Deck[]>;
  getAllSubdecksRecursive(parentDeckId: string): Promise<Deck[]>;
  updateDeck(id: string, deck: Partial<InsertDeck>): Promise<Deck | undefined>;
  deleteDeck(id: string): Promise<void>;
  
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  getFlashcardsByDeckId(deckId: string): Promise<Flashcard[]>;
  getAllFlashcardsWithSubdecks(deckId: string): Promise<Flashcard[]>;
  updateFlashcard(id: string, flashcard: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  deleteFlashcard(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private decks: Map<string, Deck>;
  private flashcards: Map<string, Flashcard>;

  constructor() {
    this.users = new Map();
    this.decks = new Map();
    this.flashcards = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = insertUser.id || randomUUID();
    const user: User = { 
      ...insertUser,
      email: insertUser.email ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }


  async createDeck(insertDeck: InsertDeck): Promise<Deck> {
    const id = randomUUID();
    const now = new Date();
    const deck: Deck = { 
      ...insertDeck,
      parentDeckId: insertDeck.parentDeckId ?? null,
      customInstructions: insertDeck.customInstructions ?? null,
      includeSource: insertDeck.includeSource ?? 'false',
      createSubdecks: insertDeck.createSubdecks ?? 'false',
      fileUrl: insertDeck.fileUrl ?? null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.decks.set(id, deck);
    return deck;
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    return this.decks.get(id);
  }

  async getDecksByUserId(userId: string): Promise<Deck[]> {
    return Array.from(this.decks.values()).filter(deck => deck.userId === userId);
  }

  async getSubdecks(parentDeckId: string): Promise<Deck[]> {
    return Array.from(this.decks.values()).filter(deck => deck.parentDeckId === parentDeckId);
  }

  async updateDeck(id: string, updateData: Partial<InsertDeck>): Promise<Deck | undefined> {
    const deck = this.decks.get(id);
    if (!deck) return undefined;
    
    const updatedDeck = { 
      ...deck, 
      ...updateData,
      updatedAt: new Date()
    };
    this.decks.set(id, updatedDeck);
    return updatedDeck;
  }

  async deleteDeck(id: string): Promise<void> {
    // Delete all subdecks first
    const subdecks = await this.getSubdecks(id);
    for (const subdeck of subdecks) {
      await this.deleteDeck(subdeck.id);
    }
    
    // Delete all flashcards associated with this deck
    Array.from(this.flashcards.values())
      .filter(card => card.deckId === id)
      .forEach(card => this.flashcards.delete(card.id));
    
    // Delete the deck itself
    this.decks.delete(id);
  }

  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const id = randomUUID();
    const flashcard: Flashcard = { 
      ...insertFlashcard,
      id,
      imageUrl: insertFlashcard.imageUrl ?? null,
      sourceReference: insertFlashcard.sourceReference ?? null,
      verificationScore: insertFlashcard.verificationScore ?? null,
      needsReview: insertFlashcard.needsReview ?? false,
      isLearned: insertFlashcard.isLearned ?? false,
      learnedAt: insertFlashcard.learnedAt ?? null,
      createdAt: new Date()
    };
    this.flashcards.set(id, flashcard);
    return flashcard;
  }

  async getFlashcardsByDeckId(deckId: string): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values())
      .filter(card => card.deckId === deckId)
      .sort((a, b) => a.position - b.position);
  }

  async updateFlashcard(id: string, updateData: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const flashcard = this.flashcards.get(id);
    if (!flashcard) return undefined;
    
    const updatedFlashcard = { ...flashcard, ...updateData };
    this.flashcards.set(id, updatedFlashcard);
    return updatedFlashcard;
  }

  async deleteFlashcard(id: string): Promise<void> {
    this.flashcards.delete(id);
  }

  async getAllSubdecksRecursive(parentDeckId: string): Promise<Deck[]> {
    const directSubdecks = await this.getSubdecks(parentDeckId);
    const allSubdecks: Deck[] = [...directSubdecks];
    
    for (const subdeck of directSubdecks) {
      const childSubdecks = await this.getAllSubdecksRecursive(subdeck.id);
      allSubdecks.push(...childSubdecks);
    }
    
    return allSubdecks;
  }

  async getAllFlashcardsWithSubdecks(deckId: string): Promise<Flashcard[]> {
    const cards = await this.getFlashcardsByDeckId(deckId);
    const subdecks = await this.getAllSubdecksRecursive(deckId);
    
    for (const subdeck of subdecks) {
      const subdeckCards = await this.getFlashcardsByDeckId(subdeck.id);
      cards.push(...subdeckCards);
    }
    
    return cards.sort((a, b) => a.position - b.position);
  }
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createDeck(insertDeck: InsertDeck): Promise<Deck> {
    const id = randomUUID();
    const now = new Date();
    const deckWithId = { 
      ...insertDeck,
      id,
      createdAt: now,
      updatedAt: now
    };
    await db.insert(decks).values(deckWithId);
    return deckWithId as Deck;
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    const result = await db.select().from(decks).where(eq(decks.id, id)).limit(1);
    return result?.[0];
  }

  async getDecksByUserId(userId: string): Promise<Deck[]> {
    const result = await db.select().from(decks).where(eq(decks.userId, userId)).orderBy(asc(decks.createdAt));
    return result || [];
  }

  async getSubdecks(parentDeckId: string): Promise<Deck[]> {
    const result = await db.select().from(decks).where(eq(decks.parentDeckId, parentDeckId)).orderBy(asc(decks.createdAt));
    return result || [];
  }

  async updateDeck(id: string, updateData: Partial<InsertDeck>): Promise<Deck | undefined> {
    const result = await db
      .update(decks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(decks.id, id))
      .returning();
    return result[0];
  }

  async deleteDeck(id: string): Promise<void> {
    // Database cascade delete will handle subdecks and flashcards automatically
    // due to onDelete: "cascade" in schema
    await db.delete(decks).where(eq(decks.id, id));
  }

  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const id = randomUUID();
    const now = new Date();
    const flashcardWithId = { 
      ...insertFlashcard,
      id,
      createdAt: now
    };
    await db.insert(flashcards).values(flashcardWithId);
    return flashcardWithId as Flashcard;
  }

  async getFlashcardsByDeckId(deckId: string): Promise<Flashcard[]> {
    try {
      const result = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.deckId, deckId))
        .orderBy(asc(flashcards.position));
      return result || [];
    } catch (error) {
      console.error('[getFlashcardsByDeckId] Error:', error);
      return [];
    }
  }

  async updateFlashcard(id: string, updateData: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const result = await db
      .update(flashcards)
      .set(updateData)
      .where(eq(flashcards.id, id))
      .returning();
    return result[0];
  }

  async deleteFlashcard(id: string): Promise<void> {
    await db.delete(flashcards).where(eq(flashcards.id, id));
  }

  async getAllSubdecksRecursive(parentDeckId: string): Promise<Deck[]> {
    const directSubdecks = await this.getSubdecks(parentDeckId);
    const allSubdecks: Deck[] = [...directSubdecks];
    
    for (const subdeck of directSubdecks) {
      const childSubdecks = await this.getAllSubdecksRecursive(subdeck.id);
      allSubdecks.push(...childSubdecks);
    }
    
    return allSubdecks;
  }

  async getAllFlashcardsWithSubdecks(deckId: string): Promise<Flashcard[]> {
    console.log('[Storage] getAllFlashcardsWithSubdecks - deckId:', deckId);
    const cards = await this.getFlashcardsByDeckId(deckId);
    console.log('[Storage] Direct cards count:', cards?.length || 0);
    const subdecks = await this.getAllSubdecksRecursive(deckId);
    console.log('[Storage] Subdecks count:', subdecks?.length || 0);
    
    for (const subdeck of subdecks) {
      const subdeckCards = await this.getFlashcardsByDeckId(subdeck.id);
      console.log('[Storage] Subdeck cards count:', subdeckCards?.length || 0);
      cards.push(...subdeckCards);
    }
    
    console.log('[Storage] Total cards before sort:', cards?.length || 0);
    return cards.sort((a, b) => a.position - b.position);
  }
}

export const storage = new DbStorage();
