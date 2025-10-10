# FlashGenius - AI-Powered Flashcard Generator

## Overview

FlashGenius is an educational productivity application that transforms various content formats (text, documents, YouTube videos) into AI-generated flashcards for studying. The application leverages advanced AI technology to create trusted, hallucination-free flashcards with support for multiple card types (Q&A, cloze deletion, reverse cards) that can be combined in a single deck, adjustable content coverage granularity (1-7 scale), and custom instructions for precise control over flashcard generation.

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
- Medical student-focused aesthetic with calming, professional colors
- **Color Palette (Updated Oct 2025):**
  - Primary: Medical blue (200 95% 45%) - calming, trustworthy, healthcare-associated
  - Accent: Soft teal (175 45% 92%) - modern, clean complement
  - Backgrounds: Warm neutrals (210 20% 98%) - comfortable for long study sessions
  - Text: Professional grays with high contrast for readability
  - Error: Softer red (0 70% 55%) - less harsh than standard alerts
- Typography using Inter (body) and Poppins (headings) font families for professional medical aesthetic
- Support for light and dark modes with CSS custom properties
- Component variants using class-variance-authority (CVA)
- **Animations:** Smooth framer-motion transitions (fade-ins, slides, viewport triggers) without performance overhead

**State Management:**
- UserContext for authentication state (userId, userName) with localStorage persistence
- React Query for server-side data fetching, caching, and mutations
- Local component state for UI interactions

**Routing Structure:**
- Public routes: Landing (`/`), Login (`/login`), Signup (`/signup`)
- Protected routes: Dashboard (`/dashboard`), Generate (`/generate`), Editor (`/editor/:id`), Decks (`/decks`), Settings (`/settings`)
- ProtectedRoute wrapper component enforces authentication

**Landing Page (Updated Oct 2025):**
- **Navigation Header:** Sticky nav with smooth scroll to sections (Features, How It Works), backdrop blur on scroll
- **Hero Section:** "Stop Forgetting. Start Remembering." - focuses on active recall and spaced repetition (learning science), addresses medical student pain points (forgetting, exam stress)
- **How It Works Section:** 4-step user journey (Upload → AI Extract → Review → Export) with animated arrows, emphasizes "under 3 minutes" speed
- **Feature Section:** 8 medicine-specific features (Active Recall Engine, Spaced Repetition Ready, Zero Hallucinations, Med School Optimized) with conversational, relatable copy addressing real student struggles
- **CTA Section:** "Stop Re-Reading. Start Retaining." - emphasizes active recall advantage with trust signals (no credit card, free forever, works with Anki)
- **Color Scheme:** Calmer teal accent (175 60% 50%) replacing pink for professional, medical aesthetic
- **Performance:** Optimized animations (fewer gradient orbs, GPU-accelerated properties, viewport-triggered entrance)
- **Tone:** Friendly, funny, professional - connects with medical student wounds and suffering while maintaining credibility
- **Text Highlighting:** Strategic emphasis on "active recall", "spaced repetition", "instant flashcards" for key value props
- **Responsive Design:** Mobile-first with adaptive grids (1/2/4 columns) across breakpoints

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
- **HTTP Polling Progress Tracking:**
  - Generation endpoints return `sessionId` immediately for async processing
  - Progress tracked via GET `/api/generation/progress/:sessionId` (polled every 1 second)
  - Progress states stored in memory with 5-minute auto-cleanup
  - Stages: extracting → analyzing → chunking → generating → saving → complete/error
  - Final result retrieved from GET `/api/generation/result/:sessionId`

**Content Processing Pipeline:**
1. Text extraction from uploaded files (PDF, DOCX, TXT, PPT) using pdf-parse and mammoth libraries
   - File upload limit: 100MB to support large medical textbooks and comprehensive documents
2. YouTube transcript extraction using youtube-transcript library
3. **Accurate Token Counting (Oct 2025):**
   - Tiktoken library with cl100k_base encoding for precise token measurement
   - Replaces character-based estimation (char/4) with actual tokenization
   - Critical for accurate chunk sizing and AI context window management
4. **Intelligent topic-aware chunking** for large documents (>100k tokens):
   - **Phase 1: Topic Extraction** - AI analyzes full document in 80k token passes to identify ALL topics/subtopics
   - **Phase 2: Semantic Chunking** - Content split at topic boundaries (not arbitrary size limits)
   - **200-Token Overlap (Oct 2025):** Each chunk includes last ~200 tokens from previous chunk for context continuity
   - Overlap applied at both topic boundaries and size limits
   - Each chunk maintains topic context for accurate flashcard generation
   - Prevents information loss by ensuring related content stays together
   - Automatically merges results from all topic-based chunks
5. Content passed to AI for flashcard generation with importance-based filtering
6. Generated flashcards stored with associated deck metadata

**Data Storage:**
- **PostgreSQL Database (Oct 2025):** Production-ready Neon serverless database with Drizzle ORM
  - All user data, decks, and flashcards persisted to PostgreSQL
  - Database migrations managed via `npm run db:push` (Drizzle Kit)
  - Connection pooling with `@neondatabase/serverless` and WebSocket support
- **Replit App Storage (Oct 2025):** Cloud-based file storage for uploaded documents
  - Files uploaded to Google Cloud Storage via Replit App Storage
  - Private object storage with ACL policies (owner-based access control)
  - Object paths stored in deck `fileUrl` field (format: `/objects/uploads/{uuid}`)
  - Automatic cleanup of local temp files after cloud upload

### Database Schema

**Tables:**
- `users`: User accounts with email authentication
  - Fields: id (UUID), email (unique), password, name (nullable), createdAt
  
- `decks`: Flashcard deck containers with hierarchical structure support
  - Fields: id (UUID), userId (foreign key), parentDeckId (nullable, self-referential for hierarchy), title, source, sourceType, cardTypes (array), granularity, customInstructions (nullable), includeSource (boolean as 'true'/'false'), createSubdecks (boolean as 'true'/'false'), fileUrl (nullable, cloud storage path), createdAt, updatedAt
  - Supports parent-child relationships for subdeck organization
  - Cascade delete on user removal and recursive deletion of child subdecks
  - **fileUrl:** Stores cloud storage path for uploaded documents (format: `/objects/uploads/{uuid}`)
  
- `flashcards`: Individual flashcards
  - Fields: id (UUID), deckId (foreign key), question, answer, cardType, position, imageUrl (nullable, cloud storage path), createdAt
  - **imageUrl:** Stores cloud storage path for extracted images (format: `/objects/uploads/{uuid}`)
  - Cascade delete on deck removal

**Relationships:**
- One user to many decks (1:N)
- One deck to many flashcards (1:N)

### External Dependencies

**AI Service:**
- Advanced AI API via `@google/genai` SDK
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
  - **Include Images Option (Oct 2025):**
    * **PDF Documents:** Full page rendering with pdf-to-img library for complete diagram context
    * **YouTube Videos:** High-quality thumbnail extraction with fallback to standard quality
    * **Storage:** Images uploaded to Replit Object Storage with private ACL policies
    * **AI Association:** AI automatically associates images with relevant flashcards during generation
    * **Display:** Images shown in Editor preview and Study mode with responsive styling (max 300px height)
    * **Export Handling:**
      - JSON: Includes imageUrl field with cloud storage path
      - CSV: ImageURL column with cloud storage URLs
      - Anki: Downloads images, bundles as media files in .apkg, references by local filename
  - **Include Source Option (Oct 2025):**
    * For YouTube videos: Embeds timestamps in transcript (e.g., `[2:45] The mitochondria...`) when enabled
    * Allows AI to reference specific timestamps in flashcard answers
    * Helps students locate exact moments in video for review
  - **Create Subdecks Option (Oct 2025):**
    * **Intelligent Subdeck Organization:** AI automatically detects subtopics in content and creates hierarchical deck structure
    * When enabled, creates parent deck + child subdecks (one per subtopic)
    * Each subdeck contains flashcards relevant to its specific subtopic
    * **Example:** Content about cardiac anatomy creates parent "Cardiac Anatomy" with subdecks for "Heart Chambers", "Valves", "Coronary Circulation", "Electrical Conduction"
    * **Storage:** Uses `parentDeckId` field for hierarchical relationships
    * **UI:** File-tree style display with expand/collapse, folder icons for parents, indentation for children
    * **Deletion:** Recursive cascade delete removes all child subdecks when parent is deleted
    * Supports unlimited nesting depth (parent → child → grandchild → etc.)
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

**Export Functionality (Updated Oct 2025):**
- **Subdeck Aggregation:** Editor and study modes now aggregate cards from all subdecks recursively
  - Uses `/api/decks/:id/cards/all` endpoint that traverses entire deck hierarchy
  - Parent decks display all cards from child subdecks for seamless editing/studying
- **Export Formats:**
  - **JSON:** Exports all cards from parent deck and subdecks with deck metadata
  - **CSV:** Includes "Deck" column with full path (e.g., "Parent::Subdeck") for hierarchy preservation
  - **Anki (.apkg):**
    * Single decks: Standard export with deck name
    * Parent decks with subdecks: Hierarchy information preserved via tags for manual reorganization
      - Each card tagged with full deck path (e.g., "Parent::Subdeck" → tag "Parent_Subdeck")
      - Tags prevent collisions and preserve complete hierarchy information
      - **User Action Required:** In Anki, users must manually create subdecks and move cards using the tag-based organization
      - **Library Limitation:** anki-apkg-export creates one deck per .apkg file, preventing automatic subdeck creation
      - **Alternative:** Use CSV export with "Deck" column for easier import into Anki with hierarchy preservation tools
    * Cloze deletion cards formatted with `{{c1::answer}}` notation for Anki compatibility

**Development Tools:**
- Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- TypeScript for full-stack type safety
- ESBuild for production server bundling