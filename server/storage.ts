import { type User, type InsertUser, type Deck, type InsertDeck, type Flashcard, type InsertFlashcard } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createDeck(deck: InsertDeck): Promise<Deck>;
  getDeck(id: string): Promise<Deck | undefined>;
  getDecksByUserId(userId: string): Promise<Deck[]>;
  updateDeck(id: string, deck: Partial<InsertDeck>): Promise<Deck | undefined>;
  deleteDeck(id: string): Promise<void>;
  
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  getFlashcardsByDeckId(deckId: string): Promise<Flashcard[]>;
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
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      name: insertUser.name ?? null,
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
      customInstructions: insertDeck.customInstructions ?? null,
      includeSource: insertDeck.includeSource ?? 'false',
      createSubdecks: insertDeck.createSubdecks ?? 'false',
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
    this.decks.delete(id);
    Array.from(this.flashcards.values())
      .filter(card => card.deckId === id)
      .forEach(card => this.flashcards.delete(card.id));
  }

  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const id = randomUUID();
    const flashcard: Flashcard = { 
      ...insertFlashcard,
      id,
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
}

export const storage = new MemStorage();
