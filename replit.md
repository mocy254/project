# FlashGenius - AI-Powered Flashcard Generator

## Overview

FlashGenius is an educational productivity application that transforms various content formats (text, documents, YouTube videos) into AI-generated flashcards for studying. The application leverages Google's Gemini 2.5 Flash AI model to create trusted, hallucination-free flashcards with support for multiple card types (Q&A, cloze deletion, reverse cards) that can be combined in a single deck, adjustable content coverage granularity (1-7 scale), and custom instructions for precise control over flashcard generation.

## User Preferences

Preferred communication style: Simple, everyday language.

Flashcard answer format: Ultra-concise (bullet points or few words, NOT complete sentences or paragraphs)

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn UI component library built on Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design system

**Design System:**
- Inspired by Notion's clean card-based layouts and Linear's refined typography
- Custom color palette with HSL values for easy theme switching
- Typography using Inter (body) and Poppins (headings) font families
- Support for light and dark modes with CSS custom properties
- Component variants using class-variance-authority (CVA)

**State Management:**
- UserContext for authentication state (userId, userName) with localStorage persistence
- React Query for server-side data fetching, caching, and mutations
- Local component state for UI interactions

**Routing Structure:**
- Public routes: Landing (`/`), Login (`/login`), Signup (`/signup`)
- Protected routes: Dashboard (`/dashboard`), Generate (`/generate`), Editor (`/editor/:id`), Decks (`/decks`), Settings (`/settings`)
- ProtectedRoute wrapper component enforces authentication

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Node.js runtime with ESM module system
- Development mode uses Vite middleware for HMR and asset serving
- Production mode serves pre-built static assets

**API Design:**
- RESTful endpoints with `/api` prefix
- Multipart form data handling with Multer for file uploads (100MB limit)
- Content type validation for document uploads (PDF, DOCX, DOC, TXT, PPT, PPTX)
- Request/response logging middleware for API debugging

**Content Processing Pipeline:**
1. Text extraction from uploaded files (PDF, DOCX, TXT, PPT) using pdf-parse and mammoth libraries
   - File upload limit: 100MB to support large medical textbooks and comprehensive documents
2. YouTube transcript extraction using youtube-transcript library
3. Intelligent chunking for very large documents:
   - Automatically splits documents >800k tokens into manageable chunks
   - Processes each chunk separately and merges results
   - Maintains context boundaries (splits at line breaks)
4. Content passed to Gemini AI for flashcard generation
5. Generated flashcards stored with associated deck metadata

**Data Storage:**
- Currently using in-memory storage (MemStorage class) with Map-based data structures
- Designed for eventual PostgreSQL integration via Drizzle ORM
- Schema defined with proper relationships and constraints ready for database migration

### Database Schema

**Tables:**
- `users`: User accounts with email authentication
  - Fields: id (UUID), email (unique), password, name (nullable), createdAt
  
- `decks`: Flashcard deck containers
  - Fields: id (UUID), userId (foreign key), title, source, sourceType, cardTypes (array), granularity, customInstructions (nullable), createdAt, updatedAt
  - Cascade delete on user removal
  
- `flashcards`: Individual flashcards
  - Fields: id (UUID), deckId (foreign key), question, answer, cardType, position, createdAt
  - Cascade delete on deck removal

**Relationships:**
- One user to many decks (1:N)
- One deck to many flashcards (1:N)

### External Dependencies

**AI Service:**
- Google Gemini 2.5 Flash API via `@google/genai` SDK
- API key required via `GEMINI_API_KEY` environment variable
- Customizable generation parameters:
  - Multiple card types (Q&A, cloze deletion, reverse cards) can be selected simultaneously
  - Granularity level (1-7 scale) uses importance-based filtering:
    * **Two-stage process:** First analyzes content and assigns importance scores (1-10) to facts, then filters based on level
    * **Importance hierarchy:** Definitions/classifications (9-10) → Main mechanisms (8) → Clinical features (7) → Supporting details (6) → Secondary info (5) → Additional details (4) → Rare cases (1-3)
    * Level 1 (9-10): Only core definitions and classifications
    * Level 2 (8-10): Core + primary mechanisms/causes
    * Level 3 (7-10): Key concepts + main clinical features
    * Level 4 (6-10): Balanced coverage with supporting details
    * Level 5 (5-10): Detailed with secondary mechanisms/exceptions
    * Level 6 (4-10): Near-comprehensive (most details)
    * Level 7 (1-10): Every detail including rare cases and examples
  - Custom instructions allow users to specify generation preferences (e.g., "focus on definitions, skip dates")
- Structured prompt engineering for hallucination-free, ultra-concise flashcards
- Answer format: bullet points or 2-5 word phrases (no complete sentences or paragraphs)
- No additional context or explanations added - only information from source material

**Database (Configured but Not Active):**
- Neon PostgreSQL serverless database via `@neondatabase/serverless`
- Drizzle ORM for type-safe database queries and migrations
- Connection string required via `DATABASE_URL` environment variable
- Migration system configured with `drizzle-kit`

**File Processing:**
- `pdf-parse`: PDF text extraction
- `mammoth`: DOCX/DOC text extraction
- `youtube-transcript`: YouTube video transcript fetching
- `multer`: Multipart file upload handling

**Development Tools:**
- Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- TypeScript for full-stack type safety
- ESBuild for production server bundling